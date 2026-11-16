import { describe, expect, it } from "vitest";
import { estimateTokens, estimateTokensFromBytes } from "@/lib/tokens";

describe("estimateTokens (local approximation)", () => {
  it("returns 0 for empty input", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("counts short words as one token each", () => {
    expect(estimateTokens("fix the login bug")).toBe(4);
  });

  it("splits long identifiers and numbers into several tokens", () => {
    expect(estimateTokens("internationalization")).toBe(4);
    expect(estimateTokens("1234567")).toBe(3);
  });

  it("counts punctuation and newlines", () => {
    expect(estimateTokens("a.b()")).toBe(5);
    expect(estimateTokens("a\nb")).toBe(3);
  });

  it("counts non-ASCII characters individually", () => {
    expect(estimateTokens("日本語")).toBe(3);
  });

  it("stays within a sane range of the 4-characters-per-token rule on prose and code", () => {
    const prose = "The quick brown fox jumps over the lazy dog near the quiet river bank. ".repeat(40);
    const code = "export function add(a: number, b: number): number {\n  return a + b;\n}\n".repeat(40);
    for (const text of [prose, code]) {
      const ratio = estimateTokens(text) / (text.length / 4);
      expect(ratio).toBeGreaterThan(0.7);
      expect(ratio).toBeLessThan(1.6);
    }
  });

  it("grows monotonically with input", () => {
    expect(estimateTokens("hello world again")).toBeGreaterThan(estimateTokens("hello world"));
  });

  it("estimates from byte size for unread files", () => {
    expect(estimateTokensFromBytes(0)).toBe(0);
    expect(estimateTokensFromBytes(3500)).toBe(1000);
    expect(estimateTokensFromBytes(-5)).toBe(0);
  });
});
