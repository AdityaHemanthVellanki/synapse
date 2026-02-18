import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAccessToken, getBranches } from "@/lib/github";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fullName = searchParams.get("repo");

  if (!fullName) {
    return NextResponse.json(
      { error: "Missing repo parameter" },
      { status: 400 }
    );
  }

  try {
    const accessToken = await getAccessToken(session.user.id);
    if (!accessToken) {
      return NextResponse.json(
        { error: "GitHub token not found" },
        { status: 401 }
      );
    }

    const [owner, repo] = fullName.split("/");
    const branches = await getBranches(accessToken, owner, repo);
    return NextResponse.json({ branches });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch branches" },
      { status: 500 }
    );
  }
}
