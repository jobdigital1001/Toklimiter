import "server-only";
import type { Prisma } from "@prisma/client";
import { RULE_IDS, type ExcludedFile, type Finding, type RuleId, type SelectedFile, type Severity } from "@/lib/analysis/types";
import type { AuditComputation } from "@/lib/audit";
import { prisma } from "@/lib/db";
import type { AuditRequest } from "@/lib/validation";

/** Serializable shape rendered by the review step and the history detail page. */
export interface AuditView {
  id: string;
  repository: string;
  task: string;
  createdAt: string;
  tokenBudget: number;
  estimatedTokens: number;
  recommendedTokens: number;
  findings: Finding[];
  pack: {
    markdown: string;
    selectedFiles: SelectedFile[];
    excludedFiles: ExcludedFile[];
    estimatedTokens: number;
  };
}

export interface AuditSummary {
  id: string;
  repository: string;
  task: string;
  createdAt: string;
  estimatedTokens: number;
  recommendedTokens: number;
  findingCount: number;
}

const auditInclude = {
  repository: { select: { name: true } },
  findings: true,
  contextPack: true,
} satisfies Prisma.AuditInclude;

type AuditRecord = Prisma.AuditGetPayload<{ include: typeof auditInclude }>;

const SEVERITY_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

function toView(audit: AuditRecord): AuditView {
  return {
    id: audit.id,
    repository: audit.repository.name,
    task: audit.task,
    createdAt: audit.createdAt.toISOString(),
    tokenBudget: audit.tokenBudget,
    estimatedTokens: audit.estimatedTokens,
    recommendedTokens: audit.recommendedTokens,
    findings: audit.findings
      .map((finding) => ({
        ruleId: (RULE_IDS as readonly string[]).includes(finding.ruleId)
          ? (finding.ruleId as RuleId)
          : "large-file",
        severity: (finding.severity in SEVERITY_ORDER ? finding.severity : "low") as Severity,
        filePath: finding.filePath,
        explanation: finding.explanation,
        suggestedAction: finding.suggestedAction,
        estimatedTokensSaved: finding.estimatedTokensSaved,
      }))
      .sort(
        (a, b) =>
          SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
          b.estimatedTokensSaved - a.estimatedTokensSaved,
      ),
    pack: {
      markdown: audit.contextPack?.markdown ?? "",
      selectedFiles: (audit.contextPack?.selectedFiles ?? []) as unknown as SelectedFile[],
      excludedFiles: (audit.contextPack?.excludedFiles ?? []) as unknown as ExcludedFile[],
      estimatedTokens: audit.contextPack?.estimatedTokens ?? audit.recommendedTokens,
    },
  };
}

/** Persists an audit, its findings and its context pack for one user. */
export async function saveAudit(
  userId: string,
  input: AuditRequest,
  result: AuditComputation,
): Promise<AuditView> {
  const repository = await prisma.repository.upsert({
    where: { userId_githubRepoId: { userId, githubRepoId: result.repo.id } },
    update: { name: result.repo.fullName, defaultBranch: result.repo.defaultBranch },
    create: {
      userId,
      githubRepoId: result.repo.id,
      name: result.repo.fullName,
      defaultBranch: result.repo.defaultBranch,
    },
  });
  const audit = await prisma.audit.create({
    data: {
      userId,
      repositoryId: repository.id,
      task: result.task,
      prompt: result.prompt,
      includePatterns: input.includePatterns,
      excludePatterns: input.excludePatterns,
      tokenBudget: input.tokenBudget,
      estimatedTokens: result.estimatedTokens,
      recommendedTokens: result.recommendedTokens,
      findings: { create: result.findings },
      contextPack: {
        create: {
          markdown: result.pack.markdown,
          selectedFiles: result.pack.selectedFiles as unknown as Prisma.InputJsonValue,
          excludedFiles: result.pack.excludedFiles as unknown as Prisma.InputJsonValue,
          estimatedTokens: result.pack.estimatedTokens,
        },
      },
    },
    include: auditInclude,
  });
  return toView(audit);
}

/** Loads one audit. Always scoped to the owner: another user's id yields null. */
export async function getAuditForUser(userId: string, auditId: string): Promise<AuditView | null> {
  const audit = await prisma.audit.findFirst({
    where: { id: auditId, userId },
    include: auditInclude,
  });
  return audit ? toView(audit) : null;
}

export async function listAuditsForUser(userId: string): Promise<AuditSummary[]> {
  const audits = await prisma.audit.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      task: true,
      createdAt: true,
      estimatedTokens: true,
      recommendedTokens: true,
      repository: { select: { name: true } },
      _count: { select: { findings: true } },
    },
  });
  return audits.map((audit) => ({
    id: audit.id,
    repository: audit.repository.name,
    task: audit.task,
    createdAt: audit.createdAt.toISOString(),
    estimatedTokens: audit.estimatedTokens,
    recommendedTokens: audit.recommendedTokens,
    findingCount: audit._count.findings,
  }));
}
