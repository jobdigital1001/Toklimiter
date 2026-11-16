import { describe, expect, it, vi } from "vitest";
import { computeAudit } from "@/lib/audit";
import { GitHubError, type GitHubClient } from "@/lib/github";
import type { AuditRequest } from "@/lib/validation";

const SECRET = "AKIAIOSFODNN7EXAMPLE";

const REPO_FILES: Record<string, string> = {
  ".gitignore": "ignored-dir/\n",
  ".contextbudgetignore": "legacy/\n",
  ".env": "API_KEY=super-secret-value",
  "config/credentials.json": '{"password":"hunter2hunter2"}',
  "CLAUDE.md": "# Rules\n- Always run the linter before committing changes.\n",
  "src/auth/session.ts": "export function refreshSession() {\n  return timeout;\n}\n",
  "src/auth/login.ts": "export function login() {}\n",
  "src/billing/invoice.ts": "export function invoice() {}\n",
  "src/aws.ts": `export const id = "${SECRET}";\n`,
  "dist/bundle.js": "x".repeat(8000),
  "docs/guide.md": "# Guide\n" + "word ".repeat(400),
  "assets/logo.png": "\u0089PNG",
  "ignored-dir/file.ts": "export {}",
  "legacy/old.ts": "export {}",
  "package-lock.json": "{}".repeat(3000),
};

function fakeGitHub(files = REPO_FILES) {
  const paths = Object.keys(files);
  const getBlob = vi.fn(async (_repo: string, sha: string) => new TextEncoder().encode(files[sha]));
  const client: GitHubClient = {
    listRepos: async () => [],
    getRepo: async (fullName) => {
      if (fullName !== "octo/app") throw new GitHubError(404, "GitHub API responded 404");
      return { id: "42", fullName, private: true, defaultBranch: "main" };
    },
    getTree: async () => ({
      truncated: false,
      // The blob "sha" is the path, so tests can assert which files were downloaded.
      entries: paths.map((path) => ({ path, sha: path, size: files[path].length })),
    }),
    getBlob,
  };
  return { client, getBlob, fetched: () => getBlob.mock.calls.map((call) => call[1]) };
}

const request = (overrides: Partial<AuditRequest> = {}): AuditRequest => ({
  repository: "octo/app",
  prompt: "Fix the session timeout in src/auth/session.ts. The session should survive a reload.",
  includePatterns: [],
  excludePatterns: [],
  tokenBudget: 20_000,
  accurate: false,
  ...overrides,
});

describe("computeAudit", () => {
  it("never downloads secret, binary, generated or ignored files", async () => {
    const github = fakeGitHub();
    await computeAudit(request(), { github: github.client });
    const fetched = github.fetched();
    for (const path of [".env", "config/credentials.json", "assets/logo.png", "dist/bundle.js", "package-lock.json", "ignored-dir/file.ts", "legacy/old.ts"]) {
      expect(fetched).not.toContain(path);
    }
    expect(fetched).toContain("src/auth/session.ts");
  });

  it("respects .gitignore and .contextbudgetignore", async () => {
    const result = await computeAudit(request(), { github: fakeGitHub().client });
    const all = [...result.pack.selectedFiles, ...result.pack.excludedFiles].map((file) => file.path);
    expect(all).not.toContain("ignored-dir/file.ts");
    expect(all).not.toContain("legacy/old.ts");
    expect(result.warnings.join(" ")).toContain("2 files were skipped by .gitignore or .contextbudgetignore");
  });

  it("selects the relevant file and reports savings", async () => {
    const result = await computeAudit(request(), { github: fakeGitHub().client });
    expect(result.pack.selectedFiles[0].path).toBe("src/auth/session.ts");
    expect(result.recommendedTokens).toBeLessThan(result.estimatedTokens);
    expect(result.recommendedTokens).toBeLessThanOrEqual(20_000);
    expect(result.pack.estimatedTokens).toBe(result.recommendedTokens);
    expect(result.estimator).toBe("local");
    expect(result.task).toBe("Fix the session timeout in src/auth/session.ts.");
  });

  it("produces findings for flagged files and never leaks secret values", async () => {
    const result = await computeAudit(request(), { github: fakeGitHub().client });
    const byRule = (ruleId: string) => result.findings.filter((finding) => finding.ruleId === ruleId).map((finding) => finding.filePath);
    expect(byRule("secret-risk").sort()).toEqual([".env", "config/credentials.json", "src/aws.ts"]);
    expect(byRule("generated-output").sort()).toEqual(["dist/", "package-lock.json"]);
    expect(byRule("binary-file")).toEqual(["assets/logo.png"]);
    expect(byRule("irrelevant-directory")).toEqual(["docs/"]);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(SECRET);
    expect(serialized).not.toContain("super-secret-value");
    expect(serialized).not.toContain("hunter2hunter2");
    expect(result.pack.selectedFiles.map((file) => file.path)).not.toContain("src/aws.ts");
  });

  it("redacts secrets pasted into the prompt before anything is stored", async () => {
    const token = `ghp_${"q".repeat(36)}`;
    const result = await computeAudit(request({ prompt: `Use ${token} to fix src/auth/session.ts so that login works` }), {
      github: fakeGitHub().client,
    });
    expect(JSON.stringify(result)).not.toContain(token);
    expect(result.prompt).toContain("[REDACTED]");
    expect(result.findings.some((finding) => finding.ruleId === "secret-risk" && finding.filePath === null)).toBe(true);
  });

  it("applies include and exclude patterns", async () => {
    const result = await computeAudit(request({ includePatterns: ["src/**"], excludePatterns: ["src/billing/"] }), {
      github: fakeGitHub().client,
    });
    const all = [...result.pack.selectedFiles, ...result.pack.excludedFiles].map((file) => file.path);
    expect(all.every((path) => path.startsWith("src/"))).toBe(true);
    expect(all).not.toContain("src/billing/invoice.ts");
    expect(result.pack.markdown).toContain("`src/billing/` — Excluded by your pattern");
  });

  it("detects prompt instructions that restate CLAUDE.md", async () => {
    const result = await computeAudit(
      request({ prompt: "Fix src/auth/session.ts so that reload works.\nAlways run the linter before committing changes." }),
      { github: fakeGitHub().client },
    );
    expect(result.findings.some((finding) => finding.ruleId === "duplicate-instruction" && finding.filePath === "CLAUDE.md")).toBe(true);
  });

  it("does not call a token counter unless one is provided", async () => {
    const result = await computeAudit(request(), { github: fakeGitHub().client });
    expect(result.estimator).toBe("local");
    expect(result.pack.markdown).toContain("local approximation");
  });

  it("uses accurate counts when enabled, and never sends secret files", async () => {
    const countTokens = vi.fn(async (texts: string[]) => texts.map(() => 1000));
    const result = await computeAudit(request(), { github: fakeGitHub().client, countTokens });
    expect(result.estimator).toBe("anthropic");
    expect(result.pack.selectedFiles[0].tokens).toBe(1000);
    expect(result.pack.markdown).toContain("Anthropic Token Count API");
    const sent = countTokens.mock.calls.flat(2).join("\n");
    expect(sent).not.toContain("super-secret-value");
    expect(sent).not.toContain("hunter2hunter2");
  });

  it("falls back to the local estimate when accurate counting fails", async () => {
    const result = await computeAudit(request(), {
      github: fakeGitHub().client,
      countTokens: async () => {
        throw new Error("401");
      },
    });
    expect(result.estimator).toBe("local");
    expect(result.warnings.join(" ")).toContain("Anthropic token counting failed");
  });

  it("propagates repository access errors", async () => {
    await expect(computeAudit(request({ repository: "octo/private" }), { github: fakeGitHub().client })).rejects.toMatchObject({
      status: 404,
    });
  });

  it("handles a repository where nothing matches", async () => {
    const result = await computeAudit(request({ includePatterns: ["nothing/**"] }), { github: fakeGitHub().client });
    expect(result.pack.selectedFiles).toEqual([]);
    expect(result.warnings.join(" ")).toContain("No files matched");
  });
});
