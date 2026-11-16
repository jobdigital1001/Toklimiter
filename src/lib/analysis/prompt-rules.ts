import { findSecrets } from "@/lib/secrets";
import { estimateTokens } from "@/lib/tokens";
import {
  BOILERPLATE_PHRASES,
  LOG_LINE,
  codeBlocks,
  isBoilerplateLine,
  normalizeLine,
  promptLines,
  truncate,
  wordCount,
} from "./text";
import type { Finding } from "./types";

const quote = (line: string) => `“${truncate(line, 70)}”`;

/** Secret risk (prompt): credentials pasted into the task. Run on the raw prompt. */
export function secretRiskPrompt(rawPrompt: string): Finding[] {
  const kinds = [...new Set(findSecrets(rawPrompt).map((match) => match.kind))];
  if (kinds.length === 0) return [];
  return [
    {
      ruleId: "secret-risk",
      severity: "high",
      filePath: null,
      explanation: `Your prompt appears to contain credentials (${kinds.join(", ")}). They were redacted before saving and are not in the context pack.`,
      suggestedAction: "Remove the credential from your prompt and rotate it if it was ever shared.",
      estimatedTokensSaved: 0,
    },
  ];
}

const CRITERIA_SIGNALS =
  /\b(?:acceptance criteria|success criteria|definition of done|done when|expected (?:behaviou?r|output|result)|should|must|needs? to|has to|tests? (?:still )?pass(?:es)?|so that|verify that|ensure that|make sure)\b|^\s*[-*] \[[ x]\]/im;

export function hasSuccessCriteria(prompt: string): boolean {
  return CRITERIA_SIGNALS.test(prompt);
}

export function missingSuccessCriteria(prompt: string): Finding[] {
  if (hasSuccessCriteria(prompt)) return [];
  return [
    {
      ruleId: "missing-success-criteria",
      severity: "medium",
      filePath: null,
      explanation: "The prompt never says how to tell when the task is done. Claude Code will guess, which usually means extra exploration and retries.",
      suggestedAction: "Add one or two checkable outcomes, e.g. “`npm test` passes” or “the endpoint returns 404 for unknown ids”.",
      estimatedTokensSaved: 0,
    },
  ];
}

const VAGUE_PHRASES =
  /\b(?:fix (?:it|this|that|the bugs?|everything|the issues?|the problems?)|make (?:it|this) (?:better|work|faster|nicer|good|cleaner)|improve (?:it|this|the code|things|everything)|clean ?(?:it |this |things )?up|refactor (?:it|this|everything|the code)|optimi[sz]e (?:it|this|everything|the code)|doesn'?t work|not working|is broken|some(?:thing|how)|and so on|etc\.?|stuff|whatever)\b/i;

/** Concrete anchors: file paths, code identifiers, inline code, quoted errors, numbers. */
function countSpecifics(prompt: string): number {
  const patterns = [
    /`[^`\n]+`/g,
    /\b[\w-]+(?:\/[\w.-]+)+\b/g,
    /\b[\w-]+\.(?:[a-z]{1,5})\b/g,
    /\b[a-z]+[A-Z]\w*\b/g,
    /\b[a-z]+_[a-z_]+\b/g,
    /"[^"\n]{6,}"/g,
    /\b\d{2,}\b/g,
  ];
  return patterns.reduce((sum, re) => sum + (prompt.match(re)?.length ?? 0), 0);
}

export function vagueTask(prompt: string): Finding[] {
  const words = wordCount(prompt);
  const specifics = countSpecifics(prompt);
  const vaguePhrase = VAGUE_PHRASES.test(prompt);
  const tooShort = words < 8;
  if (!tooShort && !(specifics === 0 && (words < 25 || vaguePhrase))) return [];
  return [
    {
      ruleId: "vague-task",
      severity: tooShort ? "high" : "medium",
      filePath: null,
      explanation: tooShort
        ? `The task is only ${words} ${words === 1 ? "word" : "words"} long. Claude Code will have to explore the repository to work out what you mean.`
        : "The task does not name any file, function, error message or behaviour. Claude Code will have to explore the repository to work out what you mean.",
      suggestedAction: "Name the file or module, describe the current behaviour, and state the behaviour you want.",
      estimatedTokensSaved: 0,
    },
  ];
}

const EXAMPLE_MARKERS = /\b(?:for example|for instance|e\.g\.|example(?: \d+)?:|such as)/gi;
const MAX_CODE_BLOCKS = 3;
const MAX_EXAMPLE_MARKERS = 4;

export function excessiveExamples(prompt: string): Finding[] {
  const blocks = codeBlocks(prompt);
  const markers = prompt.match(EXAMPLE_MARKERS)?.length ?? 0;
  if (blocks.length <= MAX_CODE_BLOCKS && markers <= MAX_EXAMPLE_MARKERS) return [];
  const extraBlockTokens = blocks.slice(2).reduce((sum, block) => sum + estimateTokens(block), 0);
  return [
    {
      ruleId: "excessive-examples",
      severity: extraBlockTokens > 1000 ? "medium" : "low",
      filePath: null,
      explanation:
        blocks.length > MAX_CODE_BLOCKS
          ? `The prompt includes ${blocks.length} code blocks. One or two representative examples are usually enough.`
          : `The prompt gives ${markers} examples. One or two representative examples are usually enough.`,
      suggestedAction: "Keep the one or two examples that best show the pattern and reference files by path for the rest.",
      estimatedTokensSaved: extraBlockTokens,
    },
  ];
}

const MIN_DUPLICATE_LENGTH = 25;

/**
 * Duplicate instruction: lines repeated inside the prompt, and lines that
 * restate the repository's CLAUDE.md (which Claude Code already loads).
 */
export function duplicateInstructions(prompt: string, claudeMd?: string): Finding[] {
  const findings: Finding[] = [];
  const lines = promptLines(prompt).filter((line) => !line.inCodeBlock);
  const seen = new Set<string>();
  const repeated: string[] = [];
  for (const { text } of lines) {
    const normalized = normalizeLine(text);
    if (normalized.length < MIN_DUPLICATE_LENGTH) continue;
    if (seen.has(normalized)) repeated.push(text);
    else seen.add(normalized);
  }
  if (repeated.length > 0) {
    findings.push({
      ruleId: "duplicate-instruction",
      severity: "low",
      filePath: null,
      explanation: `${repeated.length === 1 ? "An instruction is" : `${repeated.length} instructions are`} repeated in the prompt, e.g. ${quote(repeated[0])}.`,
      suggestedAction: "State each instruction once.",
      estimatedTokensSaved: repeated.reduce((sum, line) => sum + estimateTokens(line), 0),
    });
  }

  if (claudeMd) {
    const known = new Set(
      claudeMd
        .split("\n")
        .map(normalizeLine)
        .filter((line) => line.length >= MIN_DUPLICATE_LENGTH),
    );
    const restated = [...new Set(lines.map((line) => line.text))].filter((text) =>
      known.has(normalizeLine(text)),
    );
    if (restated.length > 0) {
      findings.push({
        ruleId: "duplicate-instruction",
        severity: "low",
        filePath: "CLAUDE.md",
        explanation: `${restated.length === 1 ? "An instruction" : `${restated.length} instructions`} in the prompt already ${restated.length === 1 ? "exists" : "exist"} in the repository's CLAUDE.md, which Claude Code loads automatically, e.g. ${quote(restated[0])}.`,
        suggestedAction: "Remove them from the prompt; CLAUDE.md already covers them.",
        estimatedTokensSaved: restated.reduce((sum, line) => sum + estimateTokens(line), 0),
      });
    }
  }
  return findings;
}

export function promptBoilerplate(prompt: string): Finding[] {
  let saved = 0;
  let count = 0;
  let sample = "";
  for (const { text, inCodeBlock } of promptLines(prompt)) {
    if (inCodeBlock || !text.trim()) continue;
    // Check sentence by sentence so one polite sentence does not flag a whole paragraph.
    for (const sentence of text.split(/(?<=[.!?])\s+/)) {
      if (isBoilerplateLine(sentence)) {
        saved += estimateTokens(sentence);
        count += 1;
        sample ||= sentence;
        continue;
      }
      for (const re of BOILERPLATE_PHRASES) {
        for (const match of sentence.matchAll(re)) {
          saved += estimateTokens(match[0]);
          count += 1;
          sample ||= match[0];
        }
      }
    }
  }
  if (count === 0) return [];
  return [
    {
      ruleId: "prompt-boilerplate",
      severity: "low",
      filePath: null,
      explanation: `${count} ${count === 1 ? "piece" : "pieces"} of filler (greetings, role-play, politeness) that do not change what Claude Code does, e.g. ${quote(sample)}.`,
      suggestedAction: "Start with the task itself. The generated pack already has the filler removed.",
      estimatedTokensSaved: saved,
    },
  ];
}

const MAX_LOG_LINES = 15;

/** Log dump (prompt): a long paste of log lines or stack frames. */
export function logDumpPrompt(prompt: string): Finding[] {
  const logLines = prompt.split("\n").filter((line) => LOG_LINE.test(line));
  if (logLines.length < MAX_LOG_LINES) return [];
  return [
    {
      ruleId: "log-dump",
      severity: logLines.length > 60 ? "high" : "medium",
      filePath: null,
      explanation: `The prompt contains about ${logLines.length} lines of log or stack-trace output.`,
      suggestedAction: "Keep the error message and the 5–10 lines around it; drop the rest.",
      estimatedTokensSaved: logLines.slice(10).reduce((sum, line) => sum + estimateTokens(line), 0),
    },
  ];
}

/**
 * Runs every prompt rule. `rawPrompt` is only used for secret detection; all
 * other rules (and every quoted excerpt) use the redacted prompt.
 */
export function analyzePrompt(rawPrompt: string, redactedPrompt: string, claudeMd?: string): Finding[] {
  return [
    ...secretRiskPrompt(rawPrompt),
    ...vagueTask(redactedPrompt),
    ...missingSuccessCriteria(redactedPrompt),
    ...logDumpPrompt(redactedPrompt),
    ...excessiveExamples(redactedPrompt),
    ...duplicateInstructions(redactedPrompt, claudeMd),
    ...promptBoilerplate(redactedPrompt),
  ];
}
