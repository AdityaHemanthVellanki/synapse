import { prisma } from "@/lib/prisma";

const GITHUB_API = "https://api.github.com";

function getHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github.v3+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export async function getAccessToken(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "github" },
    select: { access_token: true },
  });
  return account?.access_token ?? null;
}

export interface GitHubRepo {
  id: number;
  full_name: string;
  name: string;
  default_branch: string;
  private: boolean;
  description: string | null;
  html_url: string;
}

export async function listRepos(accessToken: string): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const response = await fetch(
      `${GITHUB_API}/user/repos?per_page=${perPage}&page=${page}&sort=updated`,
      { headers: getHeaders(accessToken) }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const data: GitHubRepo[] = await response.json();
    repos.push(...data);

    if (data.length < perPage) break;
    page++;
  }

  return repos;
}

export async function getBranches(
  accessToken: string,
  owner: string,
  repo: string
): Promise<string[]> {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/branches?per_page=100`,
    { headers: getHeaders(accessToken) }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data: Array<{ name: string }> = await response.json();
  return data.map((b) => b.name);
}

export interface TreeFile {
  path: string;
  sha: string;
  type: string;
  size?: number;
}

export async function getRepoTree(
  accessToken: string,
  owner: string,
  repo: string,
  branch: string,
  rootPath: string
): Promise<TreeFile[]> {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers: getHeaders(accessToken) }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data: { tree: TreeFile[]; truncated: boolean } = await response.json();

  const normalizedRoot = rootPath === "/" ? "" : rootPath.replace(/^\//, "");

  return data.tree.filter((file) => {
    if (file.type !== "blob") return false;
    if (!file.path.endsWith(".md")) return false;
    if (normalizedRoot && !file.path.startsWith(normalizedRoot)) return false;
    return true;
  });
}

export async function getFileContent(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  branch: string
): Promise<string> {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    { headers: getHeaders(accessToken) }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data: { content: string; encoding: string } = await response.json();

  if (data.encoding === "base64") {
    return Buffer.from(data.content, "base64").toString("utf-8");
  }

  return data.content;
}

export async function commitFileToGitHub(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string,
  existingSha?: string
): Promise<{ sha: string; path: string }> {
  const body: Record<string, unknown> = {
    message,
    content: Buffer.from(content).toString("base64"),
    branch,
  };

  if (existingSha) {
    body.sha = existingSha;
  }

  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        ...getHeaders(accessToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub commit failed: ${response.status} ${error}`);
  }

  const data: { content: { sha: string; path: string } } = await response.json();
  return { sha: data.content.sha, path: data.content.path };
}

export async function createWebhook(
  accessToken: string,
  owner: string,
  repo: string,
  webhookUrl: string,
  secret: string
): Promise<number> {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/hooks`,
    {
      method: "POST",
      headers: {
        ...getHeaders(accessToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "web",
        active: true,
        events: ["push"],
        config: {
          url: webhookUrl,
          content_type: "json",
          secret,
          insecure_ssl: "0",
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Webhook creation failed: ${response.status} ${error}`);
  }

  const data: { id: number } = await response.json();
  return data.id;
}

export async function deleteWebhook(
  accessToken: string,
  owner: string,
  repo: string,
  hookId: number
): Promise<void> {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/hooks/${hookId}`,
    {
      method: "DELETE",
      headers: getHeaders(accessToken),
    }
  );

  if (!response.ok && response.status !== 404) {
    throw new Error(`Webhook deletion failed: ${response.status}`);
  }
}
