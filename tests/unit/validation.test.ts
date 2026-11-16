import { describe, expect, it } from "vitest";
import { anthropicKeySchema, auditIdSchema, auditRequestSchema, repositoryNameSchema } from "@/lib/validation";

const valid = { repository: "octo/app", prompt: "Fix the login redirect", tokenBudget: 30000 };

describe("auditRequestSchema (prompt validation)", () => {
  it("accepts a minimal request and applies defaults", () => {
    expect(auditRequestSchema.parse(valid)).toEqual({
      ...valid,
      includePatterns: [],
      excludePatterns: [],
      accurate: false,
    });
  });

  it.each(["", "   \n\t "])("rejects an empty prompt (%j)", (prompt) => {
    expect(auditRequestSchema.safeParse({ ...valid, prompt }).success).toBe(false);
  });

  it("rejects prompts over the size limit", () => {
    expect(auditRequestSchema.safeParse({ ...valid, prompt: "a".repeat(50_001) }).success).toBe(false);
    expect(auditRequestSchema.safeParse({ ...valid, prompt: "a".repeat(50_000) }).success).toBe(true);
  });

  it("strips NUL characters from the prompt", () => {
    expect(auditRequestSchema.parse({ ...valid, prompt: "fix\u0000 it" }).prompt).toBe("fix it");
  });

  it.each([999, 1_000_001, 1500.5, Number.NaN, "30000"])("rejects token budget %j", (tokenBudget) => {
    expect(auditRequestSchema.safeParse({ ...valid, tokenBudget }).success).toBe(false);
  });

  it("rejects unknown fields and non-boolean flags", () => {
    expect(auditRequestSchema.safeParse({ ...valid, userId: "other" }).success).toBe(false);
    expect(auditRequestSchema.safeParse({ ...valid, accurate: "yes" }).success).toBe(false);
  });

  it("limits pattern count, length and characters", () => {
    expect(auditRequestSchema.safeParse({ ...valid, includePatterns: Array(51).fill("*.ts") }).success).toBe(false);
    expect(auditRequestSchema.safeParse({ ...valid, includePatterns: ["a".repeat(201)] }).success).toBe(false);
    expect(auditRequestSchema.safeParse({ ...valid, excludePatterns: ["a\nb"] }).success).toBe(false);
    expect(auditRequestSchema.safeParse({ ...valid, excludePatterns: ["src/**/*.ts"] }).success).toBe(true);
  });
});

describe("repositoryNameSchema", () => {
  it.each(["octo/app", "my-org/my.repo_1"])("accepts %s", (name) => {
    expect(repositoryNameSchema.safeParse(name).success).toBe(true);
  });

  it.each(["app", "octo/app/extra", "../etc/passwd", "octo/..", "octo/app?x=1", "octo/ app", "/app", "octo/"])(
    "rejects %s",
    (name) => {
      expect(repositoryNameSchema.safeParse(name).success).toBe(false);
    },
  );
});

describe("other schemas", () => {
  it("validates Anthropic keys by shape", () => {
    expect(anthropicKeySchema.safeParse("sk-ant-api03-abcdefghij").success).toBe(true);
    expect(anthropicKeySchema.safeParse("sk-other").success).toBe(false);
    expect(anthropicKeySchema.safeParse(null).success).toBe(false);
  });

  it("validates audit ids", () => {
    expect(auditIdSchema.safeParse("cmabcdefghij0123456789xyz").success).toBe(true);
    expect(auditIdSchema.safeParse("../../x").success).toBe(false);
  });
});
