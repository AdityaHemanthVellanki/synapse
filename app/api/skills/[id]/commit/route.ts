import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessToken, commitFileToGitHub, getFileContent } from "@/lib/github";
import { parseSkillMarkdown } from "@/lib/parser";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const skill = await prisma.skillNode.findUnique({
    where: { id: params.id },
    include: {
      repository: true,
    },
  });

  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  if (skill.repository.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { content, message } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    // Validate the new content
    const parseResult = parseSkillMarkdown(content);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error,
          validation: parseResult.validation,
        },
        { status: 422 }
      );
    }

    const accessToken = await getAccessToken(session.user.id);
    if (!accessToken) {
      return NextResponse.json(
        { error: "GitHub token not found" },
        { status: 401 }
      );
    }

    const [owner, repo] = skill.repository.fullName.split("/");
    const branch = skill.repository.selectedBranch ?? skill.repository.defaultBranch;

    // Get current file SHA for update
    let existingSha: string | undefined;
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${skill.filePath}?ref=${branch}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );
      if (response.ok) {
        const data: { sha: string } = await response.json();
        existingSha = data.sha;
      }
    } catch {
      // File might not exist yet
    }

    const commitResult = await commitFileToGitHub(
      accessToken,
      owner,
      repo,
      skill.filePath,
      content,
      message ?? `Update skill: ${skill.title}`,
      branch,
      existingSha
    );

    return NextResponse.json({
      success: true,
      commit: commitResult,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Commit failed" },
      { status: 500 }
    );
  }
}
