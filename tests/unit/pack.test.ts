import { describe, expect, it } from "vitest";
import { cleanPrompt, CRITERIA_PLACEHOLDER, deriveObjective, extractCriteria, generatePack, summarizeExclusions } from "@/lib/analysis/pack";
import { relevanceScore, selectFiles, MAX_SELECTED_FILES } from "@/lib/analysis/select";
import { extractKeywords } from "@/lib/analysis/text";
import type { FileVerdict, ScannedFile } from "@/lib/analysis/types";

const file = (path: string, tokens = 100, content?: string): ScannedFile => ({ path, size: tokens * 4, tokens, content });
const verdict = (exclusion: string, reason = "Generated output"): FileVerdict => ({ ruleId: "generated-output", reason, exclusion });

describe("cleanPrompt", () => {
  it("removes filler lines and phrases, and repeated instructions", () => {
    const prompt = [
      "Hi Claude,",
      "You are an expert backend engineer.",
      "Could you please add rate limiting to the login endpoint in src/api/login.ts?",
      "Do not change the response format of the endpoint.",
      "do not change the response format of the endpoint",
      "Thanks in advance!",
    ].join("\n");
    expect(cleanPrompt(prompt)).toBe(
      "Add rate limiting to the login endpoint in src/api/login.ts.\nDo not change the response format of the endpoint.",
    );
  });

  it("leaves code blocks untouched", () => {
    const prompt = "Fix this:\n```\nplease(); // thanks\nplease(); // thanks\n```";
    expect(cleanPrompt(prompt)).toBe(prompt);
  });
});

describe("deriveObjective", () => {
  it("uses the first sentence and strips markdown and labels", () => {
    expect(deriveObjective("# Task: Add **cursor** pagination to /users. It is slow today.")).toBe(
      "Add cursor pagination to /users.",
    );
  });

  it("falls back for empty input and truncates long lines", () => {
    expect(deriveObjective("")).toBe("Untitled task");
    expect(deriveObjective("word ".repeat(100)).length).toBeLessThanOrEqual(200);
  });
});

describe("extractCriteria", () => {
  it("reads list items under a criteria heading", () => {
    const prompt = "Add pagination.\n\n## Acceptance criteria\n- Returns 20 items per page\n- `npm test` passes\n\n## Notes\n- unrelated note";
    expect(extractCriteria(prompt)).toEqual(["Returns 20 items per page", "`npm test` passes"]);
  });

  it("reads checkboxes", () => {
    expect(extractCriteria("Do it.\n- [ ] CI is green\n- [x] Docs updated")).toEqual(["CI is green", "Docs updated"]);
  });

  it("falls back to outcome sentences, and to nothing when there are none", () => {
    expect(extractCriteria("Rename the helper. All tests must pass afterwards.")).toEqual(["All tests must pass afterwards."]);
    expect(extractCriteria("Rename the helper in src/util.ts")).toEqual([]);
  });
});

describe("selectFiles", () => {
  const prompt = "Fix the session timeout bug in src/auth/session.ts";

  it("scores named files and keyword matches above unrelated files", () => {
    const keywords = extractKeywords(prompt);
    expect(relevanceScore(file("src/auth/session.ts"), prompt, keywords)).toBeGreaterThan(
      relevanceScore(file("src/auth/login.ts"), prompt, keywords),
    );
    expect(relevanceScore(file("src/billing/invoice.ts"), prompt, keywords)).toBe(0);
    expect(relevanceScore(file("src/x.ts", 10, "export const timeout = 5"), prompt, keywords)).toBeGreaterThan(0);
  });

  it("selects relevant files, excludes flagged and unrelated ones with reasons", () => {
    const { selected, excluded } = selectFiles({
      files: [file("src/auth/session.ts", 500), file("src/auth/timeout.ts", 300), file("src/billing/invoice.ts", 400), file("dist/out.js", 9000)],
      verdicts: new Map([["dist/out.js", verdict("dist/")]]),
      prompt,
      fileBudget: 10_000,
    });
    expect(selected.map((f) => f.path)).toEqual(["src/auth/session.ts", "src/auth/timeout.ts"]);
    expect(excluded).toEqual([
      { path: "dist/out.js", tokens: 9000, reason: "Generated output" },
      { path: "src/billing/invoice.ts", tokens: 400, reason: "No link to the task" },
    ]);
  });

  it("never exceeds the file budget", () => {
    const { selected, excluded } = selectFiles({
      files: [file("src/auth/session.ts", 800), file("src/auth/session.test.ts", 700)],
      verdicts: new Map(),
      prompt,
      fileBudget: 1000,
    });
    expect(selected.map((f) => f.path)).toEqual(["src/auth/session.ts"]);
    expect(excluded[0].reason).toBe("Does not fit the token budget");
  });

  it("falls back to shallow, small files when nothing matches the task", () => {
    const { selected } = selectFiles({
      files: [file("a/b/c/deep.ts", 10), file("index.ts", 50)],
      verdicts: new Map(),
      prompt: "zzz",
      fileBudget: 10_000,
    });
    expect(selected.map((f) => f.path)).toEqual(["index.ts", "a/b/c/deep.ts"]);
  });

  it("caps the number of selected files", () => {
    const files = Array.from({ length: 60 }, (_, i) => file(`src/session/part${i}.ts`, 10));
    expect(selectFiles({ files, verdicts: new Map(), prompt, fileBudget: 1_000_000 }).selected).toHaveLength(MAX_SELECTED_FILES);
  });
});

describe("summarizeExclusions", () => {
  it("collapses files into their flagged directory and lists user patterns first", () => {
    const verdicts = new Map([
      ["dist/a.js", verdict("dist/")],
      ["dist/b.js", verdict("dist/")],
      ["logo.png", { ruleId: "binary-file" as const, reason: "Binary file", exclusion: "logo.png" }],
    ]);
    expect(summarizeExclusions(verdicts, ["*.test.ts"])).toEqual([
      { path: "*.test.ts", reason: "Excluded by your pattern" },
      { path: "dist/", reason: "Generated output" },
      { path: "logo.png", reason: "Binary file" },
    ]);
  });
});

describe("generatePack", () => {
  const base = {
    repository: "octo/app",
    branch: "main",
    prompt: "Hello!\nFix the session timeout in src/auth/session.ts. The session should survive a page reload.",
    selected: [{ path: "src/auth/session.ts", tokens: 500 }],
    verdicts: new Map([["dist/a.js", verdict("dist/")]]),
    excludePatterns: ["docs/"],
    otherExcludedCount: 3,
    tokenBudget: 20_000,
    estimatorLabel: "local approximation",
  };

  it("contains every required section in order", () => {
    const markdown = generatePack(base).render(1234);
    const headings = [...markdown.matchAll(/^#{1,2} (.+)$/gm)].map((match) => match[1]);
    expect(headings).toEqual([
      "Context pack: Fix the session timeout in src/auth/session.ts.",
      "Task objective",
      "Acceptance criteria",
      "Relevant files",
      "Explicit exclusions",
      "Ready-to-paste Claude Code prompt",
    ]);
    expect(markdown).toContain("`octo/app` (branch `main`)");
    expect(markdown).toContain("Pack estimate: 1,234 tokens (local approximation)");
    expect(markdown).toContain("- [ ] The session should survive a page reload.");
    expect(markdown).toContain("- `src/auth/session.ts` (~500 tokens)");
    expect(markdown).toContain("- `dist/` — Generated output");
    expect(markdown).toContain("- `docs/` — Excluded by your pattern");
    expect(markdown).toContain("3 other files");
  });

  it("builds a self-contained prompt without filler", () => {
    const { claudePrompt, objective } = generatePack(base);
    expect(objective).toBe("Fix the session timeout in src/auth/session.ts.");
    expect(claudePrompt).toMatch(/^Task: Fix the session timeout/);
    expect(claudePrompt).toContain("Acceptance criteria:\n- The session should survive a page reload.");
    expect(claudePrompt).toContain("- src/auth/session.ts");
    expect(claudePrompt).toContain("Do not read these");
    expect(claudePrompt).not.toContain("Hello");
  });

  it("adds a placeholder criterion when the prompt has none", () => {
    const pack = generatePack({ ...base, prompt: "Rename getUser to fetchUser in src/api.ts" });
    expect(pack.criteria).toEqual([]);
    expect(pack.render(10)).toContain(`- [ ] ${CRITERIA_PLACEHOLDER}`);
  });

  it("handles no relevant files and no exclusions", () => {
    const pack = generatePack({ ...base, selected: [], verdicts: new Map(), excludePatterns: [], otherExcludedCount: 0 });
    expect(pack.render(10)).toContain("_No files matched the task.");
    expect(pack.render(10)).toContain("_Nothing needed excluding._");
    expect(pack.claudePrompt).toContain("No starting files were identified");
  });

  it("uses a fence longer than any backtick run in the prompt", () => {
    const pack = generatePack({ ...base, prompt: "Fix this snippet so it should compile:\n```ts\nconst a = 1\n```" });
    expect(pack.render(10)).toContain("````text\n");
  });

  it("limits the listed exclusions", () => {
    const verdicts = new Map(Array.from({ length: 40 }, (_, i) => [`gen${i}.min.js`, verdict(`gen${i}.min.js`)] as const));
    const markdown = generatePack({ ...base, verdicts, excludePatterns: [] }).render(10);
    expect(markdown).toContain("…and 15 more flagged paths");
  });
});
