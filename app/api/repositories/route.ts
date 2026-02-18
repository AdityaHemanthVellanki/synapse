import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncRepository } from "@/lib/sync";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repos = await prisma.repository.findMany({
    where: { userId: session.user.id },
    include: {
      _count: {
        select: {
          skillNodes: true,
          executionLogs: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ repositories: repos });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { githubId, fullName, defaultBranch, selectedBranch, rootPath } = body;

    if (!githubId || !fullName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const existing = await prisma.repository.findUnique({
      where: { githubId },
    });

    if (existing) {
      if (existing.userId !== session.user.id) {
        return NextResponse.json(
          { error: "Repository owned by another user" },
          { status: 403 }
        );
      }

      const updated = await prisma.repository.update({
        where: { id: existing.id },
        data: {
          selectedBranch: selectedBranch ?? defaultBranch,
          rootPath: rootPath ?? "/",
        },
      });

      const syncResult = await syncRepository(updated.id, session.user.id);
      return NextResponse.json({ repository: updated, sync: syncResult });
    }

    const repo = await prisma.repository.create({
      data: {
        userId: session.user.id,
        githubId,
        fullName,
        defaultBranch: defaultBranch ?? "main",
        selectedBranch: selectedBranch ?? defaultBranch ?? "main",
        rootPath: rootPath ?? "/",
      },
    });

    const syncResult = await syncRepository(repo.id, session.user.id);
    return NextResponse.json({ repository: repo, sync: syncResult });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create repository" },
      { status: 500 }
    );
  }
}
