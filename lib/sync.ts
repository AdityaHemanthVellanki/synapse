import { prisma } from "@/lib/prisma";
import {
  getAccessToken,
  getRepoTree,
  getFileContent,
  type TreeFile,
} from "@/lib/github";
import { parseSkillMarkdown, computeContentHash } from "@/lib/parser";
import { invalidateGraphCache } from "@/lib/graph";

interface SyncResult {
  totalFiles: number;
  validSkills: number;
  invalidFiles: number;
  unchanged: number;
  errors: Array<{ path: string; error: string }>;
}

export async function syncRepository(
  repositoryId: string,
  userId: string
): Promise<SyncResult> {
  const accessToken = await getAccessToken(userId);
  if (!accessToken) {
    throw new Error("GitHub access token not found");
  }

  const repo = await prisma.repository.findUnique({
    where: { id: repositoryId },
    include: { fileIndices: true },
  });

  if (!repo) {
    throw new Error("Repository not found");
  }

  const [owner, repoName] = repo.fullName.split("/");
  const branch = repo.selectedBranch ?? repo.defaultBranch;

  const files = await getRepoTree(
    accessToken,
    owner,
    repoName,
    branch,
    repo.rootPath
  );

  const result: SyncResult = {
    totalFiles: files.length,
    validSkills: 0,
    invalidFiles: 0,
    unchanged: 0,
    errors: [],
  };

  const existingIndices = new Map(
    repo.fileIndices.map((fi) => [fi.filePath, fi])
  );

  const processedPaths = new Set<string>();

  for (const file of files) {
    processedPaths.add(file.path);

    const existingIndex = existingIndices.get(file.path);
    if (existingIndex && existingIndex.contentHash === file.sha) {
      result.unchanged++;
      continue;
    }

    try {
      const content = await getFileContent(
        accessToken,
        owner,
        repoName,
        file.path,
        branch
      );

      const contentHash = computeContentHash(content);
      const parseResult = parseSkillMarkdown(content);

      await prisma.fileIndex.upsert({
        where: {
          repositoryId_filePath: {
            repositoryId,
            filePath: file.path,
          },
        },
        update: {
          contentHash: file.sha,
          isValid: parseResult.success,
          errorMessage: parseResult.error ?? null,
          lastIndexed: new Date(),
        },
        create: {
          repositoryId,
          filePath: file.path,
          contentHash: file.sha,
          isValid: parseResult.success,
          errorMessage: parseResult.error ?? null,
        },
      });

      if (parseResult.success && parseResult.skill) {
        const fm = parseResult.skill.frontmatter;

        const skillNode = await prisma.skillNode.upsert({
          where: {
            repositoryId_filePath: {
              repositoryId,
              filePath: file.path,
            },
          },
          update: {
            title: fm.title,
            description: fm.description,
            version: fm.version,
            domain: fm.domain,
            priority: fm.priority,
            activationTriggers: fm.activation.triggers,
            activationRequiredContext: fm.activation.required_context,
            inputSchema: JSON.parse(JSON.stringify(fm.inputs)),
            outputSchema: JSON.parse(JSON.stringify(fm.outputs)),
            contextBudgetCost: fm.context_budget_cost,
            procedureContent: parseResult.skill.procedure,
            reasoningContent: parseResult.skill.reasoning || null,
            evaluationSuccess: fm.evaluation.success_criteria,
            evaluationFailure: fm.evaluation.failure_modes,
            contentHash,
            updatedAt: new Date(),
          },
          create: {
            repositoryId,
            filePath: file.path,
            title: fm.title,
            description: fm.description,
            version: fm.version,
            domain: fm.domain,
            priority: fm.priority,
            activationTriggers: fm.activation.triggers,
            activationRequiredContext: fm.activation.required_context,
            inputSchema: JSON.parse(JSON.stringify(fm.inputs)),
            outputSchema: JSON.parse(JSON.stringify(fm.outputs)),
            contextBudgetCost: fm.context_budget_cost,
            procedureContent: parseResult.skill.procedure,
            reasoningContent: parseResult.skill.reasoning || null,
            evaluationSuccess: fm.evaluation.success_criteria,
            evaluationFailure: fm.evaluation.failure_modes,
            contentHash,
          },
        });

        await prisma.skillDependency.deleteMany({
          where: { fromSkillId: skillNode.id },
        });

        const allSkills = await prisma.skillNode.findMany({
          where: { repositoryId },
          select: { id: true, title: true },
        });

        const titleToId = new Map(allSkills.map((s) => [s.title, s.id]));

        for (const depTitle of fm.dependencies.required) {
          const depId = titleToId.get(depTitle);
          if (depId && depId !== skillNode.id) {
            await prisma.skillDependency.upsert({
              where: {
                fromSkillId_toSkillId: {
                  fromSkillId: skillNode.id,
                  toSkillId: depId,
                },
              },
              update: { type: "REQUIRED" },
              create: {
                repositoryId,
                fromSkillId: skillNode.id,
                toSkillId: depId,
                type: "REQUIRED",
              },
            });
          }
        }

        for (const depTitle of fm.dependencies.optional) {
          const depId = titleToId.get(depTitle);
          if (depId && depId !== skillNode.id) {
            await prisma.skillDependency.upsert({
              where: {
                fromSkillId_toSkillId: {
                  fromSkillId: skillNode.id,
                  toSkillId: depId,
                },
              },
              update: { type: "OPTIONAL" },
              create: {
                repositoryId,
                fromSkillId: skillNode.id,
                toSkillId: depId,
                type: "OPTIONAL",
              },
            });
          }
        }

        result.validSkills++;
      } else {
        result.invalidFiles++;
        if (parseResult.error) {
          result.errors.push({ path: file.path, error: parseResult.error });
        }
      }
    } catch (err) {
      result.invalidFiles++;
      result.errors.push({
        path: file.path,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Remove skills for deleted files
  const deletedPaths = Array.from(existingIndices.keys()).filter(
    (p) => !processedPaths.has(p)
  );

  if (deletedPaths.length > 0) {
    await prisma.skillNode.deleteMany({
      where: {
        repositoryId,
        filePath: { in: deletedPaths },
      },
    });

    await prisma.fileIndex.deleteMany({
      where: {
        repositoryId,
        filePath: { in: deletedPaths },
      },
    });
  }

  // Re-resolve all dependencies after full sync
  await resolveDependencyLinks(repositoryId);

  invalidateGraphCache(repositoryId);

  await prisma.repository.update({
    where: { id: repositoryId },
    data: { lastSyncedAt: new Date() },
  });

  return result;
}

async function resolveDependencyLinks(repositoryId: string): Promise<void> {
  const skills = await prisma.skillNode.findMany({
    where: { repositoryId },
    select: {
      id: true,
      title: true,
      inputSchema: true,
    },
  });

  const titleToId = new Map(skills.map((s) => [s.title, s.id]));

  const allDeps = await prisma.skillDependency.findMany({
    where: { repositoryId },
    include: { fromSkill: true },
  });

  for (const dep of allDeps) {
    if (!titleToId.has(dep.toSkillId) && !skills.some((s) => s.id === dep.toSkillId)) {
      // dependency target may have been removed
    }
  }
}
