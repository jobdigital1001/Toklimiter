/** Shared text helpers for the prompt rules and the pack generator. */

const STOPWORDS = new Set(
  `a about above after again all also am an and any are as at be because been before being below
  between both but by can could did do does doing down during each few for from further had has
  have having he her here hers him his how i if in into is it its just like make me more most my
  need needs new no nor not now of off on once only or other our out over own please same she
  should so some such than that the their them then there these they this those through to too
  under until up use used using very want was we were what when where which while who why will
  with would you your add fix update change create implement write code file files function make
  sure work works working get set task step
  src lib app apps packages pkg index main tsx jsx mjs cjs json yml yaml css scss html java test
  tests spec http https www com`.split(/\s+/),
);

/** Splits identifiers (camelCase, snake_case, kebab-case, paths) into lowercase words. */
export function splitWords(text: string): string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Distinct, meaningful keywords from a task prompt. */
export function extractKeywords(prompt: string): Set<string> {
  const keywords = new Set<string>();
  for (const word of splitWords(prompt)) {
    if (word.length >= 3 && !STOPWORDS.has(word) && !/^\d+$/.test(word)) keywords.add(word);
  }
  return keywords;
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export interface PromptLine {
  text: string;
  inCodeBlock: boolean;
}

/** Lines of the prompt, flagged by whether they sit inside a fenced code block. */
export function promptLines(prompt: string): PromptLine[] {
  let inCodeBlock = false;
  return prompt.split("\n").map((text) => {
    const isFence = /^\s*(```|~~~)/.test(text);
    const line = { text, inCodeBlock: inCodeBlock || isFence };
    if (isFence) inCodeBlock = !inCodeBlock;
    return line;
  });
}

/** Fenced code blocks (including the fences). */
export function codeBlocks(prompt: string): string[] {
  return prompt.match(/^[ \t]*(```|~~~)[^\n]*\n[\s\S]*?^[ \t]*\1[ \t]*$/gm) ?? [];
}

/** Normalises an instruction line for duplicate detection. */
export function normalizeLine(line: string): string {
  return line
    .toLowerCase()
    .replace(/^\s*(?:[-*+>]|\d+[.)]|#+)\s*/, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(text: string, max: number): string {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

export const LOG_LINE =
  /^\s*(?:\[?\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}|\[?\d{2}:\d{2}:\d{2}\b|\[?(?:INFO|DEBUG|WARN|WARNING|ERROR|TRACE|FATAL)\]?[\s:]|at\s+[\w$.<>/]+.*[(:]\d+|File ".*", line \d+|npm (?:ERR!|WARN)|\d{1,3}(?:\.\d{1,3}){3} - )/;

/** Whole sentences/lines that carry no instruction. */
export const BOILERPLATE_LINES: RegExp[] = [
  /^\s*(?:hi|hello|hey|dear|good (?:morning|afternoon|evening))\b[^.!?\n]{0,40}[.!,]?\s*$/i,
  /\b(?:thank you|thanks)\b[^.!?\n]{0,60}[.!]?\s*$/i,
  /\bi hope (?:you|this)\b/i,
  /^\s*you are (?:a|an|the)\b[^.\n]{0,160}\b(?:expert|engineer|developer|programmer|assistant|architect|specialist)\b/i,
  /^\s*act as (?:a|an)\b/i,
  /\bas an ai\b/i,
  /\btake a deep breath\b/i,
  /\b(?:think|work|reason) (?:this )?(?:through )?step[- ]by[- ]step\b/i,
  /\bthis is (?:very|really|extremely) important\b/i,
  /\bi(?:'ll| will) tip\b/i,
  /^\s*(?:let me know if you have (?:any )?questions|feel free to ask)\b/i,
];

/** Filler phrases that can be removed while keeping the rest of the sentence. */
export const BOILERPLATE_PHRASES: RegExp[] = [
  /\b(?:could|can|would|will) you (?:please |kindly )?/gi,
  /\bi (?:would|'d) (?:really )?(?:like|love|appreciate it if) (?:for )?you (?:to |could |would )?/gi,
  /\bi (?:want|need) you to /gi,
  /\bplease (?:kindly )?/gi,
  /\bif (?:it(?:'s| is) )?possible,? ?/gi,
  /\bkindly /gi,
];

export function isBoilerplateLine(line: string): boolean {
  return BOILERPLATE_LINES.some((re) => re.test(line));
}

/** Removes filler phrases and re-capitalises the sentence start. */
export function stripBoilerplatePhrases(line: string): string {
  let out = line;
  for (const re of BOILERPLATE_PHRASES) out = out.replace(re, "");
  if (out === line) return line;
  // "Could you fix X?" becomes the instruction "Fix X."
  return out
    .replace(/^(\s*(?:[-*+]|\d+[.)])?\s*)([a-z])/, (_, lead: string, ch: string) => lead + ch.toUpperCase())
    .replace(/\?(\s*)$/, ".$1");
}
