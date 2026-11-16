import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn(), getGitHubToken: vi.fn() }));
vi.mock("@/lib/audit-store", () => ({ saveAudit: vi.fn() }));
vi.mock("@/lib/anthropic", () => ({ createAnthropicCounter: vi.fn(() => async (texts: string[]) => texts.map(() => 7)) }));

import { POST } from "@/app/api/audits/route";
import { createAnthropicCounter } from "@/lib/anthropic";
import { getCurrentUser, getGitHubToken } from "@/lib/auth";
import { saveAudit } from "@/lib/audit-store";
import { resetRateLimits } from "@/lib/rate-limit";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const validBody = { repository: "octo/app", prompt: "Fix src/a.ts so that tests pass", tokenBudget: 20000 };

function post(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new Request("http://localhost/api/audits", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

function mockGitHub() {
  fetchMock.mockImplementation(async (url: string) => {
    if (url.endsWith("/repos/octo/app")) return json({ id: 42, full_name: "octo/app", private: false, default_branch: "main" });
    if (url.includes("/repos/octo/app/git/trees/main")) {
      return json({ truncated: false, tree: [{ path: "src/a.ts", type: "blob", sha: "s1", size: 20 }, { path: ".env", type: "blob", sha: "s2", size: 20 }] });
    }
    if (url.includes("/git/blobs/s1")) return json({ encoding: "base64", content: Buffer.from("export const a = 1;").toString("base64") });
    return json({ message: "Not Found" }, 404);
  });
}

describe("POST /api/audits", () => {
  beforeEach(() => {
    resetRateLimits();
    fetchMock.mockReset();
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user_1", name: "Octo" });
    vi.mocked(getGitHubToken).mockResolvedValue("gho_token");
    vi.mocked(saveAudit).mockImplementation(async (_userId, _input, result) => ({
      id: "audit_1",
      repository: result.repo.fullName,
      task: result.task,
      createdAt: new Date(0).toISOString(),
      tokenBudget: 20000,
      estimatedTokens: result.estimatedTokens,
      recommendedTokens: result.recommendedTokens,
      findings: result.findings,
      pack: result.pack,
    }));
  });

  it("rejects unauthenticated requests before doing any work", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await post(validBody);
    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(saveAudit).not.toHaveBeenCalled();
  });

  it("rejects users whose GitHub token is missing", async () => {
    vi.mocked(getGitHubToken).mockResolvedValue(null);
    expect((await post(validBody)).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["malformed JSON", "{not json"],
    ["empty prompt", { ...validBody, prompt: "  " }],
    ["bad repository name", { ...validBody, repository: "../../etc" }],
    ["budget out of range", { ...validBody, tokenBudget: 5 }],
    ["unknown field", { ...validBody, userId: "someone-else" }],
  ])("returns 400 for %s without calling GitHub", async (_label, body) => {
    const response = await post(body);
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 413 for oversized bodies", async () => {
    expect((await post({ ...validBody, pad: "x".repeat(300_000) })).status).toBe(413);
  });

  it("returns 404 when the user has no access to the repository", async () => {
    fetchMock.mockResolvedValue(json({ message: "Not Found" }, 404));
    const response = await post(validBody);
    expect(response.status).toBe(404);
    expect(saveAudit).not.toHaveBeenCalled();
  });

  it("uses the signed-in user's token and saves the audit under their id", async () => {
    mockGitHub();
    const response = await post(validBody);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.estimator).toBe("local");
    expect(body.audit.pack.selectedFiles).toEqual([expect.objectContaining({ path: "src/a.ts" })]);
    expect(vi.mocked(saveAudit).mock.calls[0][0]).toBe("user_1");
    for (const [url, init] of fetchMock.mock.calls) {
      expect(init.headers.Authorization).toBe("Bearer gho_token");
      expect(url).not.toContain("s2"); // the .env blob is never requested
    }
    expect(createAnthropicCounter).not.toHaveBeenCalled();
  });

  it("requires a valid key for accurate counting and only then calls Anthropic", async () => {
    mockGitHub();
    expect((await post({ ...validBody, accurate: true })).status).toBe(400);
    expect((await post({ ...validBody, accurate: true }, { "x-anthropic-api-key": "nope" })).status).toBe(400);
    expect(createAnthropicCounter).not.toHaveBeenCalled();

    const response = await post({ ...validBody, accurate: true }, { "x-anthropic-api-key": "sk-ant-api03-abcdefghijklmnop" });
    expect(response.status).toBe(200);
    expect((await response.json()).estimator).toBe("anthropic");
    expect(createAnthropicCounter).toHaveBeenCalledWith("sk-ant-api03-abcdefghijklmnop");
  });

  it("ignores an API key header when accurate counting is off", async () => {
    mockGitHub();
    await post(validBody, { "x-anthropic-api-key": "sk-ant-api03-abcdefghijklmnop" });
    expect(createAnthropicCounter).not.toHaveBeenCalled();
  });

  it("is rate limited per user", async () => {
    mockGitHub();
    let last = 200;
    for (let i = 0; i < 11; i++) last = (await post(validBody)).status;
    expect(last).toBe(429);
  });
});
