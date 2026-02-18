import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildDependencyGraph, analyzeGraph } from "@/lib/graph";
import { scoreSkills, selectRootSkills, expandDependencies } from "@/lib/activation";
import { buildExecutionPlan, validateInputOutputChain } from "@/lib/planner";
import { rateLimit } from "@/lib/rate-limit";
import type { ActivationScore, CompositionResult } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed, remaining } = rateLimit(session.user.id);
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: { "X-RateLimit-Remaining": String(remaining) },
      }
    );
  }

  try {
    const body = await request.json();
    const { repositoryId, query, contextState, contextBudget } = body;

    if (!repositoryId || !query) {
      return NextResponse.json(
        { error: "repositoryId and query are required" },
        { status: 400 }
      );
    }

    const repo = await prisma.repository.findUnique({
      where: { id: repositoryId },
    });

    if (!repo || repo.userId !== session.user.id) {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }

    const skills = await prisma.skillNode.findMany({
      where: { repositoryId },
      include: { dependenciesFrom: true },
    });

    if (skills.length === 0) {
      return NextResponse.json(
        { error: "No skills found in repository. Run sync first." },
        { status: 404 }
      );
    }

    // 1. Score all skills
    const activationRanking = scoreSkills(
      skills,
      query,
      contextState ?? []
    );

    // 2. Select root skills
    const rootSkills = selectRootSkills(activationRanking, 0.05);

    // 3. Build dependency graph
    const graph = buildDependencyGraph(skills, repositoryId);
    const graphAnalysis = analyzeGraph(graph);

    // 4. Expand dependencies from top root skill
    const selectedRoot = rootSkills[0] ?? null;
    const reasoning: string[] = [];

    if (!selectedRoot) {
      reasoning.push("No skills matched the query with sufficient confidence");

      const result: CompositionResult = {
        activationRanking,
        selectedRootSkill: null,
        executionPlan: {
          orderedSkills: [],
          reasoning,
          contextUsage: 0,
          contextBudget: contextBudget ?? 10,
          unresolvedDependencies: [],
        },
        graphAnalysis,
        reasoning,
      };

      return NextResponse.json(result);
    }

    reasoning.push(
      `Selected root skill: "${selectedRoot.title}" (score: ${selectedRoot.score})`
    );

    // 5. Build skill score map
    const scoreMap = new Map<string, ActivationScore>();
    for (const score of activationRanking) {
      scoreMap.set(score.skillId, score);
    }

    // 6. Expand required dependencies
    const expandedSkills = expandDependencies(
      selectedRoot.skillId,
      graph,
      scoreMap
    );

    reasoning.push(
      `Expanded to ${expandedSkills.length} skills including dependencies`
    );

    // 7. Build skill map
    const skillMap = new Map(skills.map((s) => [s.id, s]));

    // 8. Build execution plan
    const activatedIds = expandedSkills.map((s) => s.skillId);
    const executionPlan = buildExecutionPlan(
      activatedIds,
      graph,
      skillMap,
      contextBudget ?? 10
    );

    // 9. Validate I/O chain
    const ioValidation = validateInputOutputChain(executionPlan);
    if (!ioValidation.valid) {
      reasoning.push(
        `Input/output chain issues: ${ioValidation.issues.join("; ")}`
      );
    }

    // 10. Log execution
    await prisma.executionLog.create({
      data: {
        repositoryId,
        query,
        selectedSkills: activatedIds,
        executionPlan: JSON.parse(JSON.stringify(executionPlan)),
        contextUsage: executionPlan.contextUsage,
      },
    });

    const result: CompositionResult = {
      activationRanking,
      selectedRootSkill: selectedRoot,
      executionPlan,
      graphAnalysis,
      reasoning: [...reasoning, ...executionPlan.reasoning],
    };

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Composition failed" },
      { status: 500 }
    );
  }
}
