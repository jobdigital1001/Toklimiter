import { describe, expect, it } from "vitest";
import { conversionRate, formatSalary, initials, safeRedirect, slugify, timeAgo } from "@/lib/utils";

describe("slugify", () => {
  it("lowercases, strips accents and punctuation", () => {
    expect(slugify("Senior Frontend Engineer @ Lumen Labs!")).toBe("senior-frontend-engineer-lumen-labs");
    expect(slugify("Café & Crème")).toBe("cafe-and-creme");
  });
  it("trims separators and caps length", () => {
    expect(slugify("  --hello--  ")).toBe("hello");
    expect(slugify("a".repeat(200)).length).toBe(80);
  });
  it("returns an empty string when nothing is usable", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("initials", () => {
  it("uses first and last name", () => expect(initials("Ada King Lovelace")).toBe("AL"));
  it("handles single names and empties", () => {
    expect(initials("Lumen")).toBe("LU");
    expect(initials("")).toBe("?");
    expect(initials(null)).toBe("?");
  });
});

describe("formatSalary", () => {
  it("formats a range", () => expect(formatSalary(120000, 150000)).toBe("$120K – $150K / yr"));
  it("formats open-ended ranges", () => {
    expect(formatSalary(90000, null)).toBe("From $90K / yr");
    expect(formatSalary(null, 90000)).toBe("Up to $90K / yr");
  });
  it("collapses equal bounds and respects currency", () => {
    expect(formatSalary(50000, 50000, "EUR")).toBe("€50K / yr");
  });
  it("returns null when no salary is listed", () => expect(formatSalary(null, undefined)).toBeNull());
});

describe("timeAgo", () => {
  const now = new Date("2026-06-15T12:00:00Z");
  const ago = (ms: number) => timeAgo(new Date(now.getTime() - ms), now);
  it("covers each unit", () => {
    expect(ago(5_000)).toBe("just now");
    expect(ago(60_000)).toBe("1 minute ago");
    expect(ago(3 * 3_600_000)).toBe("3 hours ago");
    expect(ago(2 * 86_400_000)).toBe("2 days ago");
    expect(ago(21 * 86_400_000)).toBe("3 weeks ago");
    expect(ago(400 * 86_400_000)).toBe("1 year ago");
  });
  it("never goes negative for future dates", () => expect(ago(-10_000)).toBe("just now"));
});

describe("conversionRate", () => {
  it("is applications over views as a percentage", () => expect(conversionRate(5, 200)).toBe(2.5));
  it("handles zero views and caps at 100", () => {
    expect(conversionRate(3, 0)).toBe(0);
    expect(conversionRate(10, 4)).toBe(100);
  });
});

describe("safeRedirect", () => {
  it("allows same-origin paths", () => expect(safeRedirect("/jobs/abc#apply")).toBe("/jobs/abc#apply"));
  it("rejects absolute and protocol-relative URLs", () => {
    expect(safeRedirect("https://evil.example", "/x")).toBe("/x");
    expect(safeRedirect("//evil.example", "/x")).toBe("/x");
    expect(safeRedirect("/\\evil.example", "/x")).toBe("/x");
    expect(safeRedirect(undefined, "/x")).toBe("/x");
  });
});
