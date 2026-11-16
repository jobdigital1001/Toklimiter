/**
 * Minimal read-only GitHub REST client. Only metadata, trees and blobs are
 * requested; repository code is never executed.
 */
export class GitHubError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

export interface GitHubRepo {
  id: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
}

export interface TreeEntry {
  path: string;
  sha: string;
  size: number;
}

export interface RepoTree {
  entries: TreeEntry[];
  truncated: boolean;
}

export interface GitHubClient {
  listRepos(): Promise<GitHubRepo[]>;
  getRepo(fullName: string): Promise<GitHubRepo>;
  getTree(fullName: string, ref: string): Promise<RepoTree>;
  /** Returns file bytes for a blob SHA. */
  getBlob(fullName: string, sha: string): Promise<Uint8Array>;
}

interface RawRepo {
  id: number;
  full_name: string;
  private: boolean;
  default_branch: string;
}

const toRepo = (raw: RawRepo): GitHubRepo => ({
  id: String(raw.id),
  fullName: raw.full_name,
  private: raw.private,
  defaultBranch: raw.default_branch,
});

const MAX_PAGES = 5;

export function createGitHubClient(
  token: string,
  baseUrl: string = process.env.GITHUB_API_URL ?? "https://api.github.com",
): GitHubClient {
  async function request<T>(path: string): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "contextbudget-web",
      },
      cache: "no-store",
    });
    if (!response.ok) {
      const rateLimited =
        response.status === 429 ||
        (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0");
      throw new GitHubError(
        rateLimited ? 429 : response.status,
        rateLimited ? "GitHub API rate limit reached" : `GitHub API responded ${response.status}`,
      );
    }
    return (await response.json()) as T;
  }

  async function paginate<T>(path: string, pick: (body: unknown) => T[]): Promise<T[]> {
    const all: T[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const sep = path.includes("?") ? "&" : "?";
      const items = pick(await request<unknown>(`${path}${sep}per_page=100&page=${page}`));
      all.push(...items);
      if (items.length < 100) break;
    }
    return all;
  }

  /** Repositories granted to a GitHub App installation (fine-grained access). */
  async function listInstallationRepos(): Promise<GitHubRepo[] | null> {
    try {
      const installations = await paginate<{ id: number }>(
        "/user/installations",
        (body) => (body as { installations?: { id: number }[] }).installations ?? [],
      );
      if (installations.length === 0) return null;
      const lists = await Promise.all(
        installations.map((installation) =>
          paginate<RawRepo>(
            `/user/installations/${installation.id}/repositories`,
            (body) => (body as { repositories?: RawRepo[] }).repositories ?? [],
          ),
        ),
      );
      return lists.flat().map(toRepo);
    } catch (error) {
      // Classic OAuth App tokens cannot call the installations API.
      if (error instanceof GitHubError && [403, 404].includes(error.status)) return null;
      throw error;
    }
  }

  return {
    async listRepos() {
      const repos =
        (await listInstallationRepos()) ??
        (await paginate<RawRepo>("/user/repos?sort=pushed", (body) => body as RawRepo[])).map(
          toRepo,
        );
      const seen = new Set<string>();
      return repos.filter((repo) => !seen.has(repo.id) && seen.add(repo.id));
    },

    async getRepo(fullName) {
      return toRepo(await request<RawRepo>(`/repos/${fullName}`));
    },

    async getTree(fullName, ref) {
      const body = await request<{
        truncated?: boolean;
        tree: { path: string; type: string; sha: string; size?: number }[];
      }>(`/repos/${fullName}/git/trees/${encodeURIComponent(ref)}?recursive=1`);
      return {
        truncated: Boolean(body.truncated),
        entries: body.tree
          .filter((entry) => entry.type === "blob")
          .map((entry) => ({ path: entry.path, sha: entry.sha, size: entry.size ?? 0 })),
      };
    },

    async getBlob(fullName, sha) {
      const body = await request<{ content: string; encoding: string }>(
        `/repos/${fullName}/git/blobs/${sha}`,
      );
      return body.encoding === "base64"
        ? new Uint8Array(Buffer.from(body.content, "base64"))
        : new TextEncoder().encode(body.content);
    },
  };
}
