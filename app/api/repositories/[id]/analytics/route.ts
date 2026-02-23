import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildDependencyGraph, analyzeGraph } from "@/lib/graph";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repo = await prisma.repository.findUnique({
    where: { id: params.id },
  });

  if (!repo || repo.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const skills = await prisma.skillNode.findMany({
    where: { repositoryId: params.id },
    include: { dependenciesFrom: true },
  });

  const graph = buildDependencyGraph(skills, params.id);
  const analysis = analyzeGraph(graph);

  const domains = new Map<string, number>();
  for (const skill of skills) {
    domains.set(skill.domain, (domains.get(skill.domain) ?? 0) + 1);
  }

  return NextResponse.json({
    analysis: {
      ...analysis,
      orphanNodes: analysis.orphanNodes.map((id) => {
        const skill = skills.find((s) => s.id === id);
        return { id, title: skill?.title ?? "Unknown" };
      }),
      cycles: analysis.cycles.map((c) => ({
        ...c,
        nodeNames: c.cycle.map((id) => {
          const skill = skills.find((s) => s.id === id);
          return skill?.title ?? id;
        }),
      })),
    },
    domains: Object.fromEntries(domains),
  });
}
