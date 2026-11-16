import { hasSuccessCriteria } from "./prompt-rules";
import {
  isBoilerplateLine,
  normalizeLine,
  promptLines,
  stripBoilerplatePhrases,
  truncate,
} from "./text";
import type { FileVerdict, SelectedFile } from "./types";

const MAX_EXCLUSIONS_LISTED = 25;
const MAX_CRITERIA = 8;
export const CRITERIA_PLACEHOLDER =
  "TODO: add a checkable success criterion (for example, a test or command that must pass)";

/** The prompt with filler lines, filler phrases and repeated instructions removed. */
export function cleanPrompt(prompt: string): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const { text, inCodeBlock } of promptLines(prompt)) {
    if (inCodeBlock) {
      out.push(text);
      continue;
    }
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .filter((sentence) => !sentence.trim() || !isBoilerplateLine(sentence))
      .map(stripBoilerplatePhrases);
    const line = sentences.join(" ");
    if (text.trim() && !line.trim()) continue;
    const normalized = normalizeLine(line);
    if (normalized.length >= 25) {
      if (seen.has(normalized)) continue;
      seen.add(normalized);
    }
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** One-line objective: the first meaningful sentence of the cleaned prompt. */
export function deriveObjective(cleanedPrompt: string): string {
  const first = promptLines(cleanedPrompt).find((line) => !line.inCodeBlock && /[a-z0-9]/i.test(line.text));
  if (!first) return "Untitled task";
  const text = first.text
    .replace(/^\s*(?:#+|[-*+>]|\d+[.)])\s*/, "")
    .replace(/^(?:task|objective|goal|title)\s*[:\-–]\s*/i, "")
    .replace(/[*_`]{1,2}([^*_`]+)[*_`]{1,2}/g, "$1");
  const sentence = text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text;
  return truncate(sentence, 200) || "Untitled task";
}

const CRITERIA_HEADING =
  /^\s*(?:#+\s*|\*\*)?(?:acceptance criteria|success criteria|definition of done|done when|requirements|expected (?:behaviou?r|result|output))\b[^\n]*$/i;
const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s*)?(.+)$/;
const CRITERIA_SENTENCE =
  /\b(?:should|must|needs? to|has to|ensure|make sure|verify|so that|tests? (?:still )?pass(?:es)?)\b/i;

/** Pulls checkable outcomes out of the prompt. Empty when the prompt has none. */
export function extractCriteria(cleanedPrompt: string): string[] {
  const lines = promptLines(cleanedPrompt).filter((line) => !line.inCodeBlock).map((line) => line.text);
  const criteria: string[] = [];
  const add = (text: string) => {
    const item = truncate(text.replace(/[*_]{2}/g, ""), 240);
    if (item && !criteria.includes(item) && criteria.length < MAX_CRITERIA) criteria.push(item);
  };

  // 1. List items under an explicit criteria heading.
  for (let i = 0; i < lines.length; i++) {
    if (!CRITERIA_HEADING.test(lines[i])) continue;
    const inline = lines[i].split(/:\s+/)[1];
    if (inline && !LIST_ITEM.test(lines[i])) add(inline);
    for (let j = i + 1; j < lines.length; j++) {
      const item = lines[j].match(LIST_ITEM);
      if (item) add(item[1]);
      else if (lines[j].trim() && criteria.length > 0) break;
      else if (/^\s*#/.test(lines[j])) break;
    }
  }
  // 2. Markdown checkboxes anywhere.
  for (const line of lines) {
    const checkbox = line.match(/^\s*[-*+]\s+\[[ xX]\]\s*(.+)$/);
    if (checkbox) add(checkbox[1]);
  }
  if (criteria.length > 0) return criteria;

  // 3. Sentences that state a required outcome.
  if (!hasSuccessCriteria(cleanedPrompt)) return [];
  for (const line of lines) {
    for (const sentence of line.replace(/^\s*(?:[-*+]|\d+[.)]|#+)\s*/, "").split(/(?<=[.!?])\s+/)) {
      if (CRITERIA_SENTENCE.test(sentence)) add(sentence);
    }
  }
  return criteria;
}

function fence(content: string): string {
  const longest = Math.max(2, ...(content.match(/`+/g) ?? []).map((run) => run.length));
  return "`".repeat(longest + 1);
}

/** Collapses per-file verdicts into a short, de-duplicated exclusion list. */
export function summarizeExclusions(
  verdicts: Map<string, FileVerdict>,
  excludePatterns: string[],
): { path: string; reason: string }[] {
  const grouped = new Map<string, { reason: string; count: number }>();
  for (const verdict of verdicts.values()) {
    const entry = grouped.get(verdict.exclusion) ?? { reason: verdict.reason, count: 0 };
    entry.count += 1;
    grouped.set(verdict.exclusion, entry);
  }
  const fromRules = [...grouped.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
    .map(([path, { reason }]) => ({ path, reason }));
  const fromUser = excludePatterns
    .filter((pattern) => !grouped.has(pattern))
    .map((pattern) => ({ path: pattern, reason: "Excluded by your pattern" }));
  return [...fromUser, ...fromRules];
}

export interface PackInput {
  repository: string;
  branch: string;
  /** Prompt with secrets already redacted. */
  prompt: string;
  selected: SelectedFile[];
  verdicts: Map<string, FileVerdict>;
  excludePatterns: string[];
  /** Files left out only because of relevance or budget. */
  otherExcludedCount: number;
  tokenBudget: number;
  estimatorLabel: string;
}

export interface Pack {
  objective: string;
  criteria: string[];
  /** The ready-to-paste Claude Code prompt on its own. */
  claudePrompt: string;
  /** Renders the full Markdown pack once the final token estimate is known. */
  render(estimatedTokens: number): string;
}

const formatTokens = (n: number) => n.toLocaleString("en-US");

export function generatePack(input: PackInput): Pack {
  const cleaned = cleanPrompt(input.prompt);
  const objective = deriveObjective(cleaned);
  const criteria = extractCriteria(cleaned);
  const criteriaLines = criteria.length > 0 ? criteria : [CRITERIA_PLACEHOLDER];
  const exclusions = summarizeExclusions(input.verdicts, input.excludePatterns);
  const listed = exclusions.slice(0, MAX_EXCLUSIONS_LISTED);
  const unlisted = exclusions.length - listed.length;

  // Details: the cleaned prompt, unless it is nothing more than the objective.
  const details = normalizeLine(cleaned) === normalizeLine(objective) ? "" : cleaned;

  const promptParts = [
    `Task: ${objective}`,
    details ? `Details:\n${details}` : "",
    `Acceptance criteria:\n${criteriaLines.map((item) => `- ${item}`).join("\n")}`,
    input.selected.length > 0
      ? `Start with these files and read only what you need:\n${input.selected.map((file) => `- ${file.path}`).join("\n")}`
      : "No starting files were identified. Ask which files are relevant before exploring the repository.",
    listed.length > 0
      ? `Do not read these (not needed for this task):\n${listed.map((item) => `- ${item.path}`).join("\n")}`
      : "",
    "Stay within the files above unless the task requires more, and say why before reading anything large or generated.",
  ];
  const claudePrompt = promptParts.filter(Boolean).join("\n\n");
  const promptFence = fence(claudePrompt);

  const render = (estimatedTokens: number) =>
    [
      `# Context pack: ${objective}`,
      [
        `- Repository: \`${input.repository}\` (branch \`${input.branch}\`)`,
        `- Token budget: ${formatTokens(input.tokenBudget)}`,
        `- Pack estimate: ${formatTokens(estimatedTokens)} tokens (${input.estimatorLabel})`,
      ].join("\n"),
      `## Task objective\n\n${objective}`,
      `## Acceptance criteria\n\n${criteriaLines.map((item) => `- [ ] ${item}`).join("\n")}`,
      `## Relevant files\n\n${
        input.selected.length > 0
          ? input.selected.map((file) => `- \`${file.path}\` (~${formatTokens(file.tokens)} tokens)`).join("\n")
          : "_No files matched the task. Name the files or modules involved in your prompt._"
      }`,
      `## Explicit exclusions\n\n${
        [
          ...listed.map((item) => `- \`${item.path}\` — ${item.reason}`),
          unlisted > 0 ? `- …and ${formatTokens(unlisted)} more flagged paths` : "",
          input.otherExcludedCount > 0
            ? `- ${formatTokens(input.otherExcludedCount)} other ${input.otherExcludedCount === 1 ? "file" : "files"} with no link to the task or outside the budget`
            : "",
        ]
          .filter(Boolean)
          .join("\n") || "_Nothing needed excluding._"
      }`,
      `## Ready-to-paste Claude Code prompt\n\n${promptFence}text\n${claudePrompt}\n${promptFence}`,
    ].join("\n\n") + "\n";

  return { objective, criteria, claudePrompt, render };
}
