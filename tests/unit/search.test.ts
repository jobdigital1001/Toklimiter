import { describe, expect, it } from "vitest";
import { countActiveFilters, filtersToQuery, paginationRange, parseJobFilters, relevanceScore, tokenize } from "@/lib/search";

describe("parseJobFilters", () => {
  it("applies defaults", () => {
    expect(parseJobFilters({})).toEqual({
      q: "", location: "", category: "", arrangement: "", type: "", level: "", salaryMin: null, sort: "newest", page: 1,
    });
  });
  it("normalises enums and rejects unknown values", () => {
    const f = parseJobFilters({ arrangement: "remote", type: "FULL_TIME", level: "wizard", sort: "random" });
    expect(f.arrangement).toBe("REMOTE");
    expect(f.type).toBe("FULL_TIME");
    expect(f.level).toBe("");
    expect(f.sort).toBe("newest");
  });
  it("defaults to relevance when there is a keyword", () => {
    expect(parseJobFilters({ q: " react " })).toMatchObject({ q: "react", sort: "relevance" });
    expect(parseJobFilters({ q: "react", sort: "salary" }).sort).toBe("salary");
  });
  it("sanitises numbers and array params", () => {
    const f = parseJobFilters({ salaryMin: "-5", page: "abc", q: ["first", "second"] });
    expect(f.salaryMin).toBeNull();
    expect(f.page).toBe(1);
    expect(f.q).toBe("first");
    expect(parseJobFilters({ salaryMin: "80000", page: "3" })).toMatchObject({ salaryMin: 80000, page: 3 });
  });
  it("truncates overly long input", () => expect(parseJobFilters({ q: "x".repeat(500) }).q).toHaveLength(100));
});

describe("filtersToQuery", () => {
  it("omits defaults", () => expect(filtersToQuery(parseJobFilters({}))).toBe(""));
  it("round-trips through parseJobFilters", () => {
    const filters = parseJobFilters({ q: "designer", category: "design", arrangement: "HYBRID", salaryMin: "100000", sort: "salary", page: "2" });
    const query = filtersToQuery(filters);
    expect(parseJobFilters(Object.fromEntries(new URLSearchParams(query)))).toEqual(filters);
  });
  it("applies overrides", () => expect(filtersToQuery({ q: "go" }, { page: 4 })).toBe("?q=go&page=4"));
});

describe("countActiveFilters", () => {
  it("ignores sort and page", () => {
    expect(countActiveFilters(parseJobFilters({ sort: "salary", page: "2" }))).toBe(0);
    expect(countActiveFilters(parseJobFilters({ q: "a b", type: "CONTRACT", salaryMin: "60000" }))).toBe(3);
  });
});

describe("tokenize", () => {
  it("splits, lowercases, de-duplicates and keeps tech punctuation", () => {
    expect(tokenize("Senior C++ / Node.js, senior")).toEqual(["senior", "c++", "node.js"]);
  });
  it("drops single characters", () => expect(tokenize("a b go")).toEqual(["go"]));
});

describe("relevanceScore", () => {
  const base = { skills: [], companyName: "Acme", categoryName: "Engineering", description: "", featured: false, publishedAt: null };
  it("ranks title matches above description matches", () => {
    const inTitle = relevanceScore({ ...base, title: "React Engineer" }, "react");
    const inBody = relevanceScore({ ...base, title: "Engineer", description: "We use React" }, "react");
    expect(inTitle).toBeGreaterThan(inBody);
    expect(inBody).toBeGreaterThan(0);
  });
  it("rewards exact skill matches over partial ones", () => {
    const exact = relevanceScore({ ...base, title: "Engineer", skills: ["Go"] }, "go");
    const partial = relevanceScore({ ...base, title: "Engineer", skills: ["Golang"] }, "go");
    expect(exact).toBeGreaterThan(partial);
  });
  it("is zero when nothing matches, even for fresh featured jobs", () => {
    expect(relevanceScore({ ...base, title: "Designer", featured: true, publishedAt: new Date() }, "python")).toBe(0);
  });
  it("uses freshness as a tie-breaker", () => {
    const now = new Date("2026-06-15T00:00:00Z");
    const fresh = relevanceScore({ ...base, title: "Data Analyst", publishedAt: now }, "analyst", now);
    const stale = relevanceScore({ ...base, title: "Data Analyst", publishedAt: new Date("2026-01-01T00:00:00Z") }, "analyst", now);
    expect(fresh).toBeGreaterThan(stale);
  });
});

describe("paginationRange", () => {
  it("lists all pages when few", () => expect(paginationRange(2, 4)).toEqual([1, 2, 3, 4]));
  it("adds ellipses around the window", () => expect(paginationRange(10, 20)).toEqual([1, "…", 9, 10, 11, "…", 20]));
  it("fills single-page gaps instead of using an ellipsis", () => expect(paginationRange(3, 10)).toEqual([1, 2, 3, 4, "…", 10]));
  it("handles empty and single-page results", () => {
    expect(paginationRange(1, 0)).toEqual([]);
    expect(paginationRange(1, 1)).toEqual([1]);
  });
});
