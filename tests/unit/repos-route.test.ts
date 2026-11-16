import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
  getGitHubToken: vi.fn(),
}));

import { GET } from "@/app/api/repos/route";
import { getCurrentUser, getGitHubToken } from "@/lib/auth";
import { resetRateLimits } from "@/lib/rate-limit";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });

const repo = { id: 1, full_name: "octo/app", private: false, default_branch: "main" };

describe("GET /api/repos", () => {
  beforeEach(() => {
    resetRateLimits();
    fetchMock.mockReset();
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user_1", name: "Octo" });
    vi.mocked(getGitHubToken).mockResolvedValue("gho_token");
  });

  it("rejects unauthenticated requests without calling GitHub", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects users without a stored GitHub token", async () => {
    vi.mocked(getGitHubToken).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lists repositories granted through a GitHub App installation", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/user/installations?")) return json({ installations: [{ id: 7 }] });
      if (url.includes("/user/installations/7/repositories")) return json({ repositories: [repo] });
      throw new Error(`unexpected ${url}`);
    });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      repos: [{ id: "1", fullName: "octo/app", private: false, defaultBranch: "main" }],
    });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer gho_token");
  });

  it("falls back to /user/repos for classic OAuth tokens", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/user/installations")) return json({ message: "no" }, 403);
      if (url.includes("/user/repos")) return json([repo, repo]);
      throw new Error(`unexpected ${url}`);
    });
    const body = await (await GET()).json();
    expect(body.repos).toHaveLength(1); // de-duplicated
  });

  it("asks the user to sign in again when GitHub rejects the token", async () => {
    fetchMock.mockResolvedValue(json({ message: "Bad credentials" }, 401));
    const response = await GET();
    expect(response.status).toBe(401);
    expect(JSON.stringify(await response.json())).not.toContain("Bad credentials");
  });

  it("is rate limited per user", async () => {
    fetchMock.mockImplementation(async () => json({ installations: [] }));
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("installations") ? json({ installations: [] }) : json([]),
    );
    let last = 200;
    for (let i = 0; i < 31; i++) last = (await GET()).status;
    expect(last).toBe(429);
  });
});
