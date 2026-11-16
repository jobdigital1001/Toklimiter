import { describe, expect, it } from "vitest";
import { findSecrets, isSecretPath, redactSecrets } from "@/lib/secrets";

describe("isSecretPath", () => {
  it.each([
    ".env",
    ".env.local",
    ".env.example",
    "apps/web/.env.production",
    "certs/server.pem",
    "deploy/id_rsa",
    "keys/private.key",
    "credentials.json",
    "config/secrets.yml",
    "gcp/service-account-prod.json",
    ".npmrc",
    ".aws/credentials",
    "home/.ssh/config",
    "infra/terraform.tfstate",
    "infra/prod.tfvars",
  ])("blocks %s", (path) => {
    expect(isSecretPath(path)).toBe(true);
  });

  it.each([
    "src/env.ts",
    "src/lib/credentials.ts",
    "docs/secrets-management.md",
    "src/keyboard.ts",
    "deploy/id_rsa.pub",
    "environment.md",
  ])("allows %s", (path) => {
    expect(isSecretPath(path)).toBe(false);
  });
});

describe("findSecrets / redactSecrets", () => {
  const samples: [string, string][] = [
    ["AWS access key", "key AKIAIOSFODNN7EXAMPLE here"],
    ["GitHub token", `token ghp_${"a".repeat(36)}`],
    ["Anthropic API key", `sk-ant-api03-${"b".repeat(30)}`],
    ["private key", "-----BEGIN RSA PRIVATE KEY-----\nMIIabc\n-----END RSA PRIVATE KEY-----"],
    ["credentials in URL", "postgres://admin:hunter2secret@db.internal:5432/app"],
    ["hard-coded credential", 'const apiKey = "abcd1234efgh5678";'],
    ["Stripe key", `sk_live_${"c".repeat(24)}`],
  ];

  it.each(samples)("detects a %s", (kind, text) => {
    expect(findSecrets(text).map((match) => match.kind)).toContain(kind);
  });

  it("redacts only the secret value", () => {
    expect(redactSecrets("postgres://admin:hunter2secret@db.internal/app")).toBe(
      "postgres://admin:[REDACTED]@db.internal/app",
    );
    expect(redactSecrets('password: "correct-horse-battery"')).toBe('password: "[REDACTED]"');
  });

  it("leaves ordinary text untouched", () => {
    const text = "Rename the password field to passphrase and update token handling in auth.ts.";
    expect(findSecrets(text)).toEqual([]);
    expect(redactSecrets(text)).toBe(text);
  });
});
