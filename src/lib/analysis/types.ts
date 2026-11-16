export const RULE_IDS = [
  "large-file",
  "generated-output",
  "binary-file",
  "log-dump",
  "duplicate-instruction",
  "missing-success-criteria",
  "vague-task",
  "excessive-examples",
  "secret-risk",
  "irrelevant-directory",
  "prompt-boilerplate",
] as const;

export type RuleId = (typeof RULE_IDS)[number];
export type Severity = "high" | "medium" | "low";

export const RULE_LABELS: Record<RuleId, string> = {
  "large-file": "Large file",
  "generated-output": "Generated output",
  "binary-file": "Binary file",
  "log-dump": "Log dump",
  "duplicate-instruction": "Duplicate instruction",
  "missing-success-criteria": "Missing success criteria",
  "vague-task": "Vague task",
  "excessive-examples": "Excessive examples",
  "secret-risk": "Secret risk",
  "irrelevant-directory": "Irrelevant directory",
  "prompt-boilerplate": "Prompt boilerplate",
};

export interface Finding {
  ruleId: RuleId;
  severity: Severity;
  /** File or directory the finding is about; null for prompt-level findings. */
  filePath: string | null;
  explanation: string;
  suggestedAction: string;
  estimatedTokensSaved: number;
}

/** A repository file under analysis. `content` only ever lives in memory. */
export interface ScannedFile {
  path: string;
  size: number;
  tokens: number;
  content?: string;
}

export interface FileVerdict {
  ruleId: RuleId;
  reason: string;
  /** Path to list in the pack's exclusions (a directory, with trailing slash, or the file). */
  exclusion: string;
}

export interface FileRuleResult {
  findings: Finding[];
  /** Files this rule recommends leaving out of the context pack. */
  verdicts: Map<string, FileVerdict>;
}

export interface AnalysisContext {
  /** Prompt with detected secrets already redacted. */
  prompt: string;
  tokenBudget: number;
}

export interface SelectedFile {
  path: string;
  tokens: number;
}

export interface ExcludedFile {
  path: string;
  tokens: number;
  reason: string;
}
