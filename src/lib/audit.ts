import { analyzeFiles, isMentioned, shouldSkipContent } from "@/lib/analysis/file-rules";
import { cleanPrompt, generatePack } from "@/lib/analysis/pack";
import { analyzePrompt } from "@/lib/analysis/prompt-rules";
import { selectFiles } from "@/lib/analysis/select";
import { extractKeywords, splitWords } from "@/lib/analysis/text";
import type { ExcludedFile, Finding, ScannedFile, SelectedFile, Severity } from "@/lib/analysis/types";
import { mapLimit } from "@/lib/concurrency";
import type { GitHubClient, GitHubRepo, TreeEntry } from "@/lib/github";
import { buildIgnoreFilter, type IgnoreFile } from "@/lib/ignore";
import { compilePatterns } from "@/lib/patterns";
import { isSecretPath, redactSecrets } from "@/lib/secrets";
import { estimateTokens, estimateTokensFromBytes } from "@/lib/tokens";
import type { AuditRequest } from "@/lib/validation";

export const LIMITS = {
  /** Files whose content is downloaded for content-based rules and relevance. */
  maxContentFiles: 150,
  maxContentBytes: 200_000,
  maxIgnoreFiles: 20,
  /** Files counted with the Anthropic API; the rest are scaled by the measured ratio. */
  maxAccurateFiles: 40,
  maxFindings: 200,
  maxStoredExcluded: 500,
  fetchConcurrency: 8,
};

export type TokenCounter = (texts: string[]) => Promise<number[]>;

export interface AuditDeps {
  github: GitHubClient;
  /** Present only when the user opted in to Anthropic token counting. */
  countTokens?: TokenCounter;
}

export interface AuditComputation {
  repo: GitHubRepo;
  task: string;
  /** Prompt with detected secrets redacted — the only form that is stored. */
  prompt: string;
  estimatedTokens: number;
  recommendedTokens: number;
  findings: Finding[];
  pack: {
    markdown: string;
    selectedFiles: SelectedFile[];
    excludedFiles: ExcludedFile[];
    estimatedTokens: number;
  };
  estimator: "local" | "anthropic";
  warnings: string[];
}

const decoder = new TextDecoder("utf-8");
const SEVERITY_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

function dirname(path: string): string {
  const index = path.lastIndexOf("/");
  return index === -1 ? "" : path.slice(0, index);
}

async function readText(github: GitHubClient, repo: string, entry: TreeEntry): Promise<string | undefined> {
  // Defence in depth: secret files are never downloaded, whatever the caller asked for.
  if (isSecretPath(entry.path) || entry.size > LIMITS.maxContentBytes) return undefined;
  try {
    const text = decoder.decode(await github.getBlob(repo, entry.sha));
    // Keep a single NUL as a "this is binary" marker instead of the raw bytes.
    return text.includes("\u0000") ? "\u0000" : text;
  } catch {
    return undefined;
  }
}

/**
 * Scans a repository through the GitHub API and analyses it against the task.
 * Read-only: file metadata and text are inspected, nothing is executed, and
 * file contents never leave memory (unless `countTokens` was explicitly enabled).
 */
export async function computeAudit(input: AuditRequest, deps: AuditDeps): Promise<AuditComputation> {
  const { github } = deps;
  const warnings: string[] = [];
  const prompt = redactSecrets(input.prompt);

  const repo = await github.getRepo(input.repository);
  const tree = await github.getTree(repo.fullName, repo.defaultBranch);
  if (tree.truncated) {
    warnings.push("This repository is very large, so GitHub returned a partial file list. Narrow your include patterns for a complete scan.");
  }

  // 1. Ignore files: every .gitignore plus the root .contextbudgetignore.
  const ignoreEntries = tree.entries
    .filter((entry) => /(^|\/)\.gitignore$/.test(entry.path) || entry.path === ".contextbudgetignore")
    .sort((a, b) => a.path.split("/").length - b.path.split("/").length)
    .slice(0, LIMITS.maxIgnoreFiles);
  const ignoreFiles: IgnoreFile[] = (
    await mapLimit(ignoreEntries, LIMITS.fetchConcurrency, async (entry) => ({
      dir: dirname(entry.path),
      content: (await readText(github, repo.fullName, entry)) ?? "",
    }))
  ).filter((file) => file.content !== "\u0000");
  const isIgnored = buildIgnoreFilter(ignoreFiles);

  // 2. Candidate files: include patterns minus exclude patterns minus ignored.
  const included = input.includePatterns.length > 0 ? compilePatterns(input.includePatterns) : () => true;
  const excludedByUser = compilePatterns(input.excludePatterns);
  let ignoredCount = 0;
  const candidates = tree.entries.filter((entry) => {
    if (!included(entry.path) || excludedByUser(entry.path)) return false;
    if (isIgnored(entry.path)) {
      ignoredCount += 1;
      return false;
    }
    return true;
  });
  if (ignoredCount > 0) {
    warnings.push(`${ignoredCount.toLocaleString("en-US")} ${ignoredCount === 1 ? "file was" : "files were"} skipped by .gitignore or .contextbudgetignore.`);
  }
  if (candidates.length === 0) {
    warnings.push("No files matched your include and exclude patterns.");
  }

  // 3. Download text for the most promising files only.
  const keywords = extractKeywords(prompt);
  const pathScore = (path: string) =>
    (isMentioned(path, prompt) ? 100 : 0) + splitWords(path).filter((word) => keywords.has(word)).length;
  const readable = candidates
    .filter((entry) => entry.size > 0 && entry.size <= LIMITS.maxContentBytes && !shouldSkipContent(entry.path))
    .map((entry) => ({ entry, score: pathScore(entry.path) }))
    .sort((a, b) => b.score - a.score || a.entry.size - b.entry.size)
    .slice(0, LIMITS.maxContentFiles)
    .map(({ entry }) => entry);
  const contents = new Map<string, string>();
  await mapLimit(readable, LIMITS.fetchConcurrency, async (entry) => {
    const text = await readText(github, repo.fullName, entry);
    if (text !== undefined) contents.set(entry.path, text);
  });

  const files: ScannedFile[] = candidates.map((entry) => {
    const content = contents.get(entry.path);
    return {
      path: entry.path,
      size: entry.size,
      content,
      tokens: content && content !== "\u0000" ? estimateTokens(content) : estimateTokensFromBytes(entry.size),
    };
  });

  // CLAUDE.md is loaded by Claude Code automatically; used to spot restated instructions.
  const claudeMdEntry = tree.entries.find((entry) => entry.path === "CLAUDE.md");
  const claudeMd =
    claudeMdEntry && !isIgnored("CLAUDE.md") && !excludedByUser("CLAUDE.md")
      ? (contents.get("CLAUDE.md") ?? (await readText(github, repo.fullName, claudeMdEntry)))
      : undefined;

  // 4. Optional accurate counting (explicit opt-in, user's own key).
  let estimator: AuditComputation["estimator"] = "local";
  let ratio = 1;
  let promptTokens = estimateTokens(prompt);
  if (deps.countTokens) {
    try {
      const sample = files
        .filter((file) => file.content && file.content !== "\u0000")
        .sort((a, b) => b.tokens - a.tokens)
        .slice(0, LIMITS.maxAccurateFiles);
      const counts = await deps.countTokens([prompt, ...sample.map((file) => file.content as string)]);
      const localTotal = promptTokens + sample.reduce((sum, file) => sum + file.tokens, 0);
      const accurateTotal = counts.reduce((sum, count) => sum + count, 0);
      ratio = localTotal > 0 && accurateTotal > 0 ? accurateTotal / localTotal : 1;
      const measured = new Set(sample.map((file) => file.path));
      promptTokens = counts[0];
      sample.forEach((file, index) => (file.tokens = counts[index + 1]));
      for (const file of files) {
        if (!measured.has(file.path)) file.tokens = Math.round(file.tokens * ratio);
      }
      estimator = "anthropic";
    } catch {
      warnings.push("Anthropic token counting failed (check your API key in Settings). The local approximation was used instead.");
    }
  }

  // 5. Waste analysis.
  const ctx = { prompt, tokenBudget: input.tokenBudget };
  const fileAnalysis = analyzeFiles(files, ctx);
  const findings = [
    ...analyzePrompt(input.prompt, prompt, claudeMd === "\u0000" ? undefined : claudeMd),
    ...fileAnalysis.findings,
  ].sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      b.estimatedTokensSaved - a.estimatedTokensSaved,
  );
  if (findings.length > LIMITS.maxFindings) {
    warnings.push(`Showing the ${LIMITS.maxFindings} most significant of ${findings.length} findings.`);
  }

  // 6. File selection and pack.
  const reserve = Math.round((estimateTokens(cleanPrompt(prompt)) + 150) * ratio);
  const selection = selectFiles({
    files,
    verdicts: fileAnalysis.verdicts,
    prompt,
    fileBudget: Math.max(0, input.tokenBudget - reserve),
  });
  const pack = generatePack({
    repository: repo.fullName,
    branch: repo.defaultBranch,
    prompt,
    selected: selection.selected,
    verdicts: fileAnalysis.verdicts,
    excludePatterns: input.excludePatterns,
    otherExcludedCount: selection.excluded.filter((file) => !fileAnalysis.verdicts.has(file.path)).length,
    tokenBudget: input.tokenBudget,
    estimatorLabel:
      estimator === "anthropic" ? "Anthropic Token Count API" : "local approximation",
  });

  const packPromptTokens = Math.round(estimateTokens(pack.claudePrompt) * ratio);
  const recommendedTokens = packPromptTokens + selection.selected.reduce((sum, file) => sum + file.tokens, 0);
  const estimatedTokens = promptTokens + files.reduce((sum, file) => sum + file.tokens, 0);
  if (selection.excluded.length > LIMITS.maxStoredExcluded) {
    warnings.push(`Listing the ${LIMITS.maxStoredExcluded} largest of ${selection.excluded.length.toLocaleString("en-US")} excluded files.`);
  }

  return {
    repo,
    task: pack.objective,
    prompt,
    estimatedTokens,
    recommendedTokens,
    findings: findings.slice(0, LIMITS.maxFindings),
    pack: {
      markdown: pack.render(recommendedTokens),
      selectedFiles: selection.selected,
      excludedFiles: selection.excluded.slice(0, LIMITS.maxStoredExcluded),
      estimatedTokens: recommendedTokens,
    },
    estimator,
    warnings,
  };
}
