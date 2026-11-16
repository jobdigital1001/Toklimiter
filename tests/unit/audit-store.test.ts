import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  audit: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  repository: { upsert: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { getAuditForUser, listAuditsForUser, saveAudit } from "@/lib/audit-store";
import type { AuditComputation } from "@/lib/audit";

const record = {
  id: "audit_1",
  task: "Fix it",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  tokenBudget: 20000,
  estimatedTokens: 9000,
  recommendedTokens: 1200,
  repository: { name: "octo/app" },
  findings: [
    { ruleId: "large-file", severity: "low", filePath: "a.ts", explanation: "e", suggestedAction: "s", estimatedTokensSaved: 10 },
    { ruleId: "secret-risk", severity: "high", filePath: ".env", explanation: "e", suggestedAction: "s", estimatedTokensSaved: 5 },
  ],
  contextPack: { markdown: "# Pack", selectedFiles: [{ path: "a.ts", tokens: 10 }], excludedFiles: [], estimatedTokens: 1200 },
};

describe("audit history access", () => {
  beforeEach(() => {
    prismaMock.audit.findFirst.mockReset();
    prismaMock.audit.findMany.mockReset();
    prismaMock.audit.create.mockReset();
    prismaMock.repository.upsert.mockReset();
  });

  it("always scopes single-audit lookups to the requesting user", async () => {
    prismaMock.audit.findFirst.mockResolvedValue(null);
    expect(await getAuditForUser("user_2", "audit_1")).toBeNull();
    expect(prismaMock.audit.findFirst.mock.calls[0][0].where).toEqual({ id: "audit_1", userId: "user_2" });
  });

  it("returns a view with findings ordered by severity", async () => {
    prismaMock.audit.findFirst.mockResolvedValue(record);
    const view = await getAuditForUser("user_1", "audit_1");
    expect(view?.repository).toBe("octo/app");
    expect(view?.findings.map((finding) => finding.ruleId)).toEqual(["secret-risk", "large-file"]);
    expect(view?.pack.markdown).toBe("# Pack");
  });

  it("lists only the requesting user's audits, newest first", async () => {
    prismaMock.audit.findMany.mockResolvedValue([]);
    await listAuditsForUser("user_1");
    const query = prismaMock.audit.findMany.mock.calls[0][0];
    expect(query.where).toEqual({ userId: "user_1" });
    expect(query.orderBy).toEqual({ createdAt: "desc" });
  });

  it("stores the audit, findings and pack under the user's own repository row", async () => {
    prismaMock.repository.upsert.mockResolvedValue({ id: "repo_row" });
    prismaMock.audit.create.mockResolvedValue(record);
    const result = {
      repo: { id: "42", fullName: "octo/app", private: true, defaultBranch: "main" },
      task: "Fix it",
      prompt: "Fix it [REDACTED]",
      estimatedTokens: 9000,
      recommendedTokens: 1200,
      findings: record.findings,
      pack: { markdown: "# Pack", selectedFiles: [], excludedFiles: [], estimatedTokens: 1200 },
      estimator: "local",
      warnings: [],
    } as unknown as AuditComputation;
    await saveAudit("user_1", { repository: "octo/app", prompt: "raw", includePatterns: ["src/**"], excludePatterns: [], tokenBudget: 20000, accurate: false }, result);

    expect(prismaMock.repository.upsert.mock.calls[0][0].where).toEqual({ userId_githubRepoId: { userId: "user_1", githubRepoId: "42" } });
    const data = prismaMock.audit.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ userId: "user_1", repositoryId: "repo_row", prompt: "Fix it [REDACTED]", includePatterns: ["src/**"], tokenBudget: 20000 });
    expect(data.findings.create).toHaveLength(2);
    expect(data.contextPack.create.markdown).toBe("# Pack");
  });
});
