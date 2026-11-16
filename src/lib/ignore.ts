import ignore from "ignore";

export interface IgnoreFile {
  /** Directory containing the ignore file ("" for the repository root). */
  dir: string;
  content: string;
}

/**
 * Builds a predicate from `.gitignore` / `.contextbudgetignore` files using
 * gitignore semantics. Each file applies to paths under its own directory.
 */
export function buildIgnoreFilter(files: IgnoreFile[]): (path: string) => boolean {
  const matchers = files
    .filter((file) => file.content.trim())
    .map((file) => ({
      prefix: file.dir ? `${file.dir}/` : "",
      matcher: ignore().add(file.content),
    }));
  if (matchers.length === 0) return () => false;
  return (path) =>
    matchers.some(({ prefix, matcher }) => {
      if (!path.startsWith(prefix)) return false;
      const relative = path.slice(prefix.length);
      return relative.length > 0 && matcher.ignores(relative);
    });
}
