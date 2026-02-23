import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateGraph } from "@/lib/validation";

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
    include: {
      dependenciesFrom: true,
      dependenciesTo: true,
    },
  });

  const report = validateGraph(skills, params.id);

  return NextResponse.json({ validation: report });
}
