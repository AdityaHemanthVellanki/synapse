import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
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
      dependenciesFrom: {
        include: {
          toSkill: {
            select: { id: true, title: true, domain: true },
          },
        },
      },
      dependenciesTo: {
        include: {
          fromSkill: {
            select: { id: true, title: true, domain: true },
          },
        },
      },
      repository: {
        select: { userId: true, fullName: true },
      },
    },
  });

  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  if (skill.repository.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ skill });
}
