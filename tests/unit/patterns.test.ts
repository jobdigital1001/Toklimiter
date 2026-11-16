import { describe, expect, it } from "vitest";
import { buildIgnoreFilter } from "@/lib/ignore";
import { compilePatterns, parsePatterns } from "@/lib/patterns";

describe("parsePatterns", () => {
  it("splits on newlines and commas, trims, and drops blanks and comments", () => {
    expect(parsePatterns("src/**\n\n  *.ts , docs/\n# comment")).toEqual(["src/**", "*.ts", "docs/"]);
  });
});

describe("compilePatterns", () => {
  it("never matches when empty", () => {
    expect(compilePatterns([])("a.ts")).toBe(false);
  });

  it("matches extension globs at any depth", () => {
    const match = compilePatterns(["*.ts"]);
    expect(match("a.ts")).toBe(true);
    expect(match("src/deep/a.ts")).toBe(true);
    expect(match("src/a.tsx")).toBe(false);
  });

  it("treats bare names and trailing slashes as directories", () => {
    const match = compilePatterns(["docs/", "src"]);
    expect(match("docs/guide.md")).toBe(true);
    expect(match("packages/app/docs/guide.md")).toBe(true);
    expect(match("src/index.ts")).toBe(true);
    expect(match("lib/index.ts")).toBe(false);
  });

  it("supports rooted globs and dotfiles", () => {
    const match = compilePatterns(["src/**/*.test.ts", ".github/**"]);
    expect(match("src/a/b.test.ts")).toBe(true);
    expect(match("other/src/a/b.test.ts")).toBe(false);
    expect(match(".github/workflows/ci.yml")).toBe(true);
  });
});

describe("buildIgnoreFilter", () => {
  it("applies gitignore semantics, including negation", () => {
    const ignored = buildIgnoreFilter([{ dir: "", content: "dist/\n*.log\n!keep.log\n" }]);
    expect(ignored("dist/app.js")).toBe(true);
    expect(ignored("a/b/debug.log")).toBe(true);
    expect(ignored("keep.log")).toBe(false);
    expect(ignored("src/app.ts")).toBe(false);
  });

  it("scopes nested ignore files to their directory", () => {
    const ignored = buildIgnoreFilter([{ dir: "packages/web", content: "tmp/\n" }]);
    expect(ignored("packages/web/tmp/x.txt")).toBe(true);
    expect(ignored("tmp/x.txt")).toBe(false);
  });

  it("ignores nothing without ignore files", () => {
    expect(buildIgnoreFilter([])("anything")).toBe(false);
  });
});
