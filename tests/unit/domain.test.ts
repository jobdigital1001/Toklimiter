import { describe, expect, it } from "vitest";
import { availableJobActions, canCandidateWithdraw, canRecruiterSetStatus, isJobOpen, nextJobStatus } from "@/lib/job-status";
import { profileCompleteness } from "@/lib/profile";
import { escapeHtml, renderEmail } from "@/lib/email";

describe("job status transitions", () => {
  it("follows the publish → pause → unpause → close → reopen lifecycle", () => {
    expect(nextJobStatus("DRAFT", "publish")).toBe("PUBLISHED");
    expect(nextJobStatus("PUBLISHED", "pause")).toBe("PAUSED");
    expect(nextJobStatus("PAUSED", "unpause")).toBe("PUBLISHED");
    expect(nextJobStatus("PAUSED", "close")).toBe("CLOSED");
    expect(nextJobStatus("CLOSED", "reopen")).toBe("PUBLISHED");
  });
  it("rejects invalid transitions", () => {
    expect(nextJobStatus("DRAFT", "pause")).toBeNull();
    expect(nextJobStatus("CLOSED", "publish")).toBeNull();
    expect(nextJobStatus("PUBLISHED", "unpause")).toBeNull();
  });
  it("lists the actions available in each state", () => {
    expect(availableJobActions("DRAFT")).toEqual(["publish"]);
    expect(availableJobActions("PUBLISHED")).toEqual(["pause", "close"]);
    expect(availableJobActions("PAUSED")).toEqual(["unpause", "close"]);
    expect(availableJobActions("CLOSED")).toEqual(["reopen"]);
  });
});

describe("isJobOpen", () => {
  const now = new Date("2026-06-15T15:00:00Z");
  it("requires a published job", () => {
    expect(isJobOpen({ status: "PUBLISHED", deadline: null }, now)).toBe(true);
    expect(isJobOpen({ status: "PAUSED", deadline: null }, now)).toBe(false);
    expect(isJobOpen({ status: "DRAFT", deadline: null }, now)).toBe(false);
  });
  it("stays open through the whole deadline day, then closes", () => {
    expect(isJobOpen({ status: "PUBLISHED", deadline: new Date("2026-06-15T00:00:00Z") }, now)).toBe(true);
    expect(isJobOpen({ status: "PUBLISHED", deadline: new Date("2026-06-14T00:00:00Z") }, now)).toBe(false);
  });
});

describe("application status rules", () => {
  it("lets recruiters move between pipeline stages", () => {
    expect(canRecruiterSetStatus("SUBMITTED", "INTERVIEW")).toBe(true);
    expect(canRecruiterSetStatus("REJECTED", "UNDER_REVIEW")).toBe(true);
  });
  it("reserves WITHDRAWN for the candidate", () => {
    expect(canRecruiterSetStatus("SUBMITTED", "WITHDRAWN")).toBe(false);
    expect(canRecruiterSetStatus("WITHDRAWN", "INTERVIEW")).toBe(false);
  });
  it("ignores no-op changes", () => expect(canRecruiterSetStatus("OFFER", "OFFER")).toBe(false));
  it("lets candidates withdraw only while in progress", () => {
    expect(canCandidateWithdraw("SUBMITTED")).toBe(true);
    expect(canCandidateWithdraw("INTERVIEW")).toBe(true);
    expect(canCandidateWithdraw("OFFER")).toBe(false);
    expect(canCandidateWithdraw("REJECTED")).toBe(false);
    expect(canCandidateWithdraw("WITHDRAWN")).toBe(false);
  });
});

describe("profileCompleteness", () => {
  it("is 0% for an empty profile and lists everything as missing", () => {
    const result = profileCompleteness({});
    expect(result.percent).toBe(0);
    expect(result.missing).toHaveLength(result.items.length);
  });
  it("is 100% for a complete profile", () => {
    const result = profileCompleteness({
      name: "Casey",
      headline: "Engineer",
      location: "Portland",
      bio: "x".repeat(40),
      skills: ["a", "b", "c"],
      hasCv: true,
      links: [null, "https://example.com"],
      experienceCount: 1,
      educationCount: 1,
    });
    expect(result.percent).toBe(100);
    expect(result.missing).toEqual([]);
  });
  it("weights always sum to 100", () => {
    expect(profileCompleteness({}).items.reduce((s, i) => s + i.weight, 0)).toBe(100);
  });
  it("applies thresholds for bio and skills", () => {
    const result = profileCompleteness({ name: "Casey", bio: "too short", skills: ["a", "b"], links: ["  "] });
    expect(result.percent).toBe(10);
    expect(result.missing.map((m) => m.key)).toEqual(expect.arrayContaining(["bio", "skills", "links"]));
  });
});

describe("email rendering", () => {
  it("escapes HTML-significant characters", () => {
    expect(escapeHtml(`<script>alert("x")</script> & 'y'`)).toBe("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;");
  });
  it("renders heading, paragraphs and an escaped call-to-action", () => {
    const html = renderEmail({ heading: "Hello", paragraphs: ["One", "Two"], cta: { label: "Go <now>", url: "https://example.com/?a=1&b=2" } });
    expect(html).toContain("<h1");
    expect(html).toContain("One");
    expect(html).toContain("Go &lt;now&gt;");
    expect(html).toContain('href="https://example.com/?a=1&amp;b=2"');
  });
});
