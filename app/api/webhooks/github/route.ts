import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { syncRepository } from "@/lib/sync";
import { invalidateGraphCache } from "@/lib/graph";

export const runtime = "nodejs";

function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = `sha256=${createHmac("sha256", secret)
    .update(payload)
    .digest("hex")}`;

  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const event = request.headers.get("x-github-event");
  const signature = request.headers.get("x-hub-signature-256");
  const delivery = request.headers.get("x-github-delivery");

  if (!event || !signature) {
    return NextResponse.json(
      { error: "Missing GitHub webhook headers" },
      { status: 400 }
    );
  }

  const rawBody = await request.text();

  // For ping events, just acknowledge
  if (event === "ping") {
    return NextResponse.json({ message: "pong" });
  }

  if (event !== "push") {
    return NextResponse.json({ message: "Event ignored" });
  }

  let body: {
    repository?: { id: number; full_name: string };
    ref?: string;
  };

  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const githubRepoId = body.repository?.id;
  if (!githubRepoId) {
    return NextResponse.json({ error: "Missing repository info" }, { status: 400 });
  }

  const repo = await prisma.repository.findUnique({
    where: { githubId: githubRepoId },
  });

  if (!repo) {
    return NextResponse.json(
      { error: "Repository not registered" },
      { status: 404 }
    );
  }

  // Verify webhook signature
  const secret = repo.webhookSecret ?? process.env.GITHUB_WEBHOOK_SECRET;
  if (secret) {
    if (!verifySignature(rawBody, signature, secret)) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }
  }

  // Check if the push is to the tracked branch
  const pushedBranch = body.ref?.replace("refs/heads/", "");
  const trackedBranch = repo.selectedBranch ?? repo.defaultBranch;

  if (pushedBranch !== trackedBranch) {
    return NextResponse.json({
      message: `Push to ${pushedBranch} ignored, tracking ${trackedBranch}`,
    });
  }

  try {
    invalidateGraphCache(repo.id);
    const result = await syncRepository(repo.id, repo.userId);

    return NextResponse.json({
      message: "Sync completed",
      delivery,
      sync: result,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
