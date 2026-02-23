import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exportToClaudeCode } from "@/lib/export";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { repositoryId, selectedNodeIds } = body;

    if (!repositoryId) {
      return NextResponse.json(
        { error: "repositoryId is required" },
        { status: 400 }
      );
    }

    const repo = await prisma.repository.findUnique({
      where: { id: repositoryId },
    });

    if (!repo) {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }

    if (repo.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const skills = await prisma.skillNode.findMany({
      where: { repositoryId },
      include: {
        dependenciesFrom: true,
        dependenciesTo: true,
      },
    });

    if (skills.length === 0) {
      return NextResponse.json(
        { error: "No skills to export" },
        { status: 400 }
      );
    }

    const result = await exportToClaudeCode({
      repositoryId,
      repoFullName: repo.fullName,
      selectedNodeIds: selectedNodeIds?.length > 0 ? selectedNodeIds : undefined,
      skills,
    });

    // Log the export
    await prisma.exportLog.create({
      data: {
        repositoryId,
        exportedNodes: result.exportedNodeIds,
        format: "claude-code",
        versionHash: result.versionHash,
      },
    });

    // Return zip as download
    return new NextResponse(new Uint8Array(result.zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="claude-code-skills-${result.versionHash}.zip"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    const status = message.includes("validation failed") ? 422 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
