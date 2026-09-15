import "server-only";

/**
 * Server-side GitHub Contents API client.
 * Never import this file from client components — it reads GITHUB_TOKEN from env.
 */

const GITHUB_API_BASE = "https://api.github.com";

export class GitHubConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubConfigError";
  }
}

export class GitHubApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
  }
}

export class GitHubConflictError extends GitHubApiError {
  constructor(message: string) {
    super(message, 409);
    this.name = "GitHubConflictError";
  }
}

export class GitHubNotFoundError extends GitHubApiError {
  constructor(message: string) {
    super(message, 404);
    this.name = "GitHubNotFoundError";
  }
}

export interface GitHubConfig {
  owner: string;
  repo: string;
  branch: string;
  token: string;
}

export function getGitHubConfig(): GitHubConfig {
  const owner = process.env.GITHUB_DATA_OWNER;
  const repo = process.env.GITHUB_DATA_REPO;
  const branch = process.env.GITHUB_DATA_BRANCH || "main";
  const token = process.env.GITHUB_TOKEN;

  if (!owner || !repo || !token) {
    throw new GitHubConfigError(
      "GitHub data store is not configured. Set GITHUB_DATA_OWNER, GITHUB_DATA_REPO and GITHUB_TOKEN."
    );
  }

  return { owner, repo, branch, token };
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export interface GetFileResult {
  content: string;
  sha: string;
}

/** Reads a file's raw text content and SHA. Returns null if the file does not exist. */
export async function getFile(
  config: GitHubConfig,
  path: string
): Promise<GetFileResult | null> {
  const url = `${GITHUB_API_BASE}/repos/${config.owner}/${config.repo}/contents/${encodeURIPath(
    path
  )}?ref=${encodeURIComponent(config.branch)}`;

  const res = await fetch(url, {
    headers: authHeaders(config.token),
    cache: "no-store",
  });

  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new GitHubApiError(
      `GitHub read failed for ${path}: ${res.status} ${await safeText(res)}`,
      res.status
    );
  }

  const json = (await res.json()) as { content?: string; sha: string; encoding?: string };
  if (!json.content) {
    throw new GitHubApiError(`GitHub returned no content for ${path}`, 500);
  }
  const content = Buffer.from(json.content, "base64").toString("utf-8");
  return { content, sha: json.sha };
}

export interface PutFileOptions {
  path: string;
  content: string;
  message: string;
  sha?: string | null;
}

export interface PutFileResult {
  sha: string;
  commitSha: string;
}

/**
 * Creates or updates a file. If `sha` is provided, GitHub enforces it matches the
 * current file — this is our optimistic-concurrency check. A 409/422 "sha mismatch"
 * from GitHub is normalized into GitHubConflictError so callers can re-read and retry.
 */
export async function putFile(
  config: GitHubConfig,
  options: PutFileOptions
): Promise<PutFileResult> {
  const url = `${GITHUB_API_BASE}/repos/${config.owner}/${config.repo}/contents/${encodeURIPath(
    options.path
  )}`;

  const body: Record<string, unknown> = {
    message: options.message,
    content: Buffer.from(options.content, "utf-8").toString("base64"),
    branch: config.branch,
  };
  if (options.sha) {
    body.sha = options.sha;
  }

  const res = await fetch(url, {
    method: "PUT",
    headers: { ...authHeaders(config.token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.status === 409) {
    throw new GitHubConflictError(`Conflict writing ${options.path}: file changed remotely.`);
  }
  if (res.status === 422) {
    const text = await safeText(res);
    if (/sha/i.test(text)) {
      throw new GitHubConflictError(`Conflict writing ${options.path}: ${text}`);
    }
    throw new GitHubApiError(`GitHub write rejected for ${options.path}: ${text}`, 422);
  }
  if (!res.ok) {
    throw new GitHubApiError(
      `GitHub write failed for ${options.path}: ${res.status} ${await safeText(res)}`,
      res.status
    );
  }

  const json = (await res.json()) as { content: { sha: string }; commit: { sha: string } };
  return { sha: json.content.sha, commitSha: json.commit.sha };
}

export interface RepoInfo {
  fullName: string;
  defaultBranch: string;
  private: boolean;
}

export async function getRepoInfo(config: GitHubConfig): Promise<RepoInfo> {
  const url = `${GITHUB_API_BASE}/repos/${config.owner}/${config.repo}`;
  const res = await fetch(url, { headers: authHeaders(config.token), cache: "no-store" });
  if (!res.ok) {
    throw new GitHubApiError(
      `GitHub repository check failed: ${res.status} ${await safeText(res)}`,
      res.status
    );
  }
  const json = (await res.json()) as {
    full_name: string;
    default_branch: string;
    private: boolean;
  };
  return { fullName: json.full_name, defaultBranch: json.default_branch, private: json.private };
}

export interface DirEntry {
  name: string;
  path: string;
  type: "file" | "dir";
}

export async function listDir(config: GitHubConfig, path: string): Promise<DirEntry[]> {
  const url = `${GITHUB_API_BASE}/repos/${config.owner}/${config.repo}/contents/${encodeURIPath(
    path
  )}?ref=${encodeURIComponent(config.branch)}`;
  const res = await fetch(url, { headers: authHeaders(config.token), cache: "no-store" });
  if (res.status === 404) return [];
  if (!res.ok) {
    throw new GitHubApiError(
      `GitHub list failed for ${path}: ${res.status} ${await safeText(res)}`,
      res.status
    );
  }
  const json = (await res.json()) as Array<{ name: string; path: string; type: string }>;
  return json
    .filter((entry) => entry.type === "file" || entry.type === "dir")
    .map((entry) => ({ name: entry.name, path: entry.path, type: entry.type as "file" | "dir" }));
}

function encodeURIPath(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
