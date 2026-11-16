/**
 * Secret handling. Two jobs:
 *  1. `isSecretPath` — files that must never be read or stored.
 *  2. `findSecrets` / `redactSecrets` — credentials pasted into prompts or
 *     committed inside otherwise ordinary files.
 * Findings never include the secret value itself.
 */

const SECRET_BASENAMES = [
  /^\.env($|\.)/i, // .env, .env.local, .env.example …
  /^\.envrc$/i,
  /\.(pem|key|p12|pfx|jks|keystore|ppk|kdbx|tfvars|tfstate)$/i,
  /\.tfstate\.backup$/i,
  /^id_(rsa|dsa|ecdsa|ed25519)$/i,
  /^(credentials?|secrets?)(\.(json|ya?ml|toml|ini|txt|xml|properties|conf|cfg|env))?$/i,
  /credentials.*\.json$/i,
  /^service[-_]?account.*\.json$/i,
  /^client_secret.*\.json$/i,
  /^\.(npmrc|netrc|pypirc|htpasswd|git-credentials|dockercfg|pgpass)$/i,
  /^secring\./i,
];

const SECRET_DIRS = new Set([".ssh", ".aws", ".gnupg", ".docker", "secrets", ".secrets"]);

export function isSecretPath(path: string): boolean {
  const segments = path.split("/");
  const basename = segments[segments.length - 1] ?? "";
  if (SECRET_BASENAMES.some((re) => re.test(basename))) return true;
  return segments.slice(0, -1).some((segment) => SECRET_DIRS.has(segment.toLowerCase()));
}

interface SecretPattern {
  kind: string;
  re: RegExp;
  /** Capture group holding the secret value (defaults to the whole match). */
  group?: number;
}

const SECRET_PATTERNS: SecretPattern[] = [
  {
    kind: "private key",
    re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g,
  },
  { kind: "AWS access key", re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { kind: "GitHub token", re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})\b/g },
  { kind: "Anthropic API key", re: /\bsk-ant-[A-Za-z0-9_-]{20,}/g },
  { kind: "API key", re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}/g },
  { kind: "Slack token", re: /\bxox[abeoprs]-[A-Za-z0-9-]{10,}/g },
  { kind: "Stripe key", re: /\b[sr]k_live_[A-Za-z0-9]{20,}/g },
  { kind: "Google API key", re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  {
    kind: "credentials in URL",
    re: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@]+:([^\s@/]{3,})@/gi,
    group: 1,
  },
  {
    kind: "hard-coded credential",
    re: /\b(?:api[_-]?key|secret(?:[_-]?key)?|access[_-]?token|auth[_-]?token|password|passwd)\b["']?\s*[:=]\s*["']([^"'\s]{12,})["']/gi,
    group: 1,
  },
];

export interface SecretMatch {
  kind: string;
  start: number;
  end: number;
}

export function findSecrets(text: string): SecretMatch[] {
  const matches: SecretMatch[] = [];
  for (const { kind, re, group } of SECRET_PATTERNS) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      const value = group ? m[group] : m[0];
      if (!value) continue;
      const start = (m.index ?? 0) + (group ? m[0].lastIndexOf(value) : 0);
      const end = start + value.length;
      // Skip ranges already covered by an earlier, more specific pattern.
      if (matches.some((x) => start < x.end && end > x.start)) continue;
      matches.push({ kind, start, end });
    }
  }
  return matches.sort((a, b) => a.start - b.start);
}

export function redactSecrets(text: string): string {
  const matches = findSecrets(text);
  if (matches.length === 0) return text;
  let out = "";
  let cursor = 0;
  for (const m of matches) {
    out += text.slice(cursor, m.start) + "[REDACTED]";
    cursor = m.end;
  }
  return out + text.slice(cursor);
}
