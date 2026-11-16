/**
 * Local token approximation. Runs entirely in the browser or on the server and
 * never sends text anywhere. It is deliberately conservative (it tends to
 * over-count slightly) so budgets err on the safe side.
 */
const SEGMENT = /[A-Za-z]+|\d+|\s+|[^\sA-Za-z\d]/gu;

export function estimateTokens(text: string): number {
  if (!text) return 0;
  let tokens = 0;
  for (const match of text.matchAll(SEGMENT)) {
    const segment = match[0];
    const first = segment.charCodeAt(0);
    if ((first >= 65 && first <= 90) || (first >= 97 && first <= 122)) {
      // Words: short words are one token, long identifiers split into pieces.
      tokens += Math.ceil(segment.length / 6);
    } else if (first >= 48 && first <= 57) {
      tokens += Math.ceil(segment.length / 3);
    } else if (/\s/.test(segment[0])) {
      // A single space is absorbed into the next word. Newlines and
      // indentation runs cost tokens.
      const newlines = segment.split("\n").length - 1;
      const indent = segment.length - newlines;
      tokens += newlines + Math.floor(indent / 8);
    } else {
      // Punctuation, symbols, CJK and other non-ASCII characters.
      tokens += 1;
    }
  }
  return tokens;
}

/** Estimate for files whose content was not downloaded (size in bytes). */
export function estimateTokensFromBytes(bytes: number): number {
  return Math.ceil(Math.max(0, bytes) / 3.5);
}
