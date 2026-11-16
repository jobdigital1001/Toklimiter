import picomatch from "picomatch";

/** Splits a textarea value (one pattern per line or comma-separated) into patterns. */
export function parsePatterns(input: string): string[] {
  return input
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

function expand(pattern: string): string[] {
  const p = pattern.replace(/^\.\//, "").replace(/^\/+/, "");
  if (!p) return [];
  const isDir = p.endsWith("/");
  const base = isDir ? p.slice(0, -1) : p;
  // "docs/" and "src" match the directory's contents; "*.ts" matches at any depth.
  const out = isDir ? [`${base}/**`] : [base, `${base}/**`];
  if (!base.includes("/")) out.push(...out.map((glob) => `**/${glob}`));
  return out;
}

/** Compiles glob-style patterns into a single path predicate. Empty list never matches. */
export function compilePatterns(patterns: string[]): (path: string) => boolean {
  const globs = patterns.flatMap(expand);
  if (globs.length === 0) return () => false;
  const matcher = picomatch(globs, { dot: true, nocase: false });
  return (path) => matcher(path);
}
