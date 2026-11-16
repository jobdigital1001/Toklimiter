import { isMentioned } from "./file-rules";
import { extractKeywords, splitWords } from "./text";
import type { ExcludedFile, FileVerdict, ScannedFile, SelectedFile } from "./types";

export const MAX_SELECTED_FILES = 40;
/** Rough cost of listing one file path in the generated prompt. */
const LISTING_TOKENS = 12;

/** How strongly a file relates to the task. 0 means no detectable link. */
export function relevanceScore(file: ScannedFile, prompt: string, keywords: Set<string>): number {
  let score = 0;
  if (isMentioned(file.path, prompt)) score += 20;
  const pathWords = new Set(splitWords(file.path));
  for (const word of pathWords) {
    if (keywords.has(word) || keywords.has(`${word}s`) || keywords.has(word.replace(/s$/, ""))) score += 3;
  }
  if (file.content && keywords.size > 0) {
    const contentWords = new Set(splitWords(file.content.slice(0, 20_000)));
    let hits = 0;
    for (const keyword of keywords) if (contentWords.has(keyword)) hits += 1;
    score += Math.min(6, hits);
  }
  return score;
}

export interface Selection {
  selected: SelectedFile[];
  excluded: ExcludedFile[];
}

/**
 * Picks the files worth reading: drops everything a waste rule flagged, ranks
 * the rest by relevance to the task, and fills the remaining token budget.
 */
export function selectFiles(input: {
  files: ScannedFile[];
  verdicts: Map<string, FileVerdict>;
  prompt: string;
  /** Tokens available for files (budget minus the prompt itself). */
  fileBudget: number;
}): Selection {
  const { files, verdicts, prompt } = input;
  const keywords = extractKeywords(prompt);
  const excluded: ExcludedFile[] = [];
  const candidates: { file: ScannedFile; score: number }[] = [];

  for (const file of files) {
    const verdict = verdicts.get(file.path);
    if (verdict) excluded.push({ path: file.path, tokens: file.tokens, reason: verdict.reason });
    else candidates.push({ file, score: relevanceScore(file, prompt, keywords) });
  }

  const anyRelevant = candidates.some((candidate) => candidate.score > 0);
  candidates.sort(
    (a, b) =>
      b.score - a.score ||
      a.file.path.split("/").length - b.file.path.split("/").length ||
      a.file.tokens - b.file.tokens ||
      a.file.path.localeCompare(b.file.path),
  );

  const selected: SelectedFile[] = [];
  let remaining = input.fileBudget;
  for (const { file, score } of candidates) {
    const cost = file.tokens + LISTING_TOKENS;
    if (anyRelevant && score === 0) {
      excluded.push({ path: file.path, tokens: file.tokens, reason: "No link to the task" });
    } else if (selected.length >= MAX_SELECTED_FILES) {
      excluded.push({ path: file.path, tokens: file.tokens, reason: "Lower relevance than the selected files" });
    } else if (cost > remaining) {
      excluded.push({ path: file.path, tokens: file.tokens, reason: "Does not fit the token budget" });
    } else {
      selected.push({ path: file.path, tokens: file.tokens });
      remaining -= cost;
    }
  }

  excluded.sort((a, b) => b.tokens - a.tokens || a.path.localeCompare(b.path));
  return { selected, excluded };
}
