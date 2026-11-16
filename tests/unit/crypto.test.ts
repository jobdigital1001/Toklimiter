import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

const key = randomBytes(32).toString("base64");

describe("token encryption", () => {
  it("round-trips a token", () => {
    const encrypted = encryptSecret("gho_exampletoken", key);
    expect(decryptSecret(encrypted, key)).toBe("gho_exampletoken");
  });

  it("never contains the plaintext and is different on every call", () => {
    const a = encryptSecret("gho_exampletoken", key);
    const b = encryptSecret("gho_exampletoken", key);
    expect(a).not.toContain("gho_exampletoken");
    expect(a).not.toBe(b);
  });

  it("rejects tampered ciphertext and wrong keys", () => {
    const encrypted = encryptSecret("gho_exampletoken", key);
    const parts = encrypted.split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => decryptSecret(parts.join("."), key)).toThrow();
    expect(() => decryptSecret(encrypted, randomBytes(32).toString("base64"))).toThrow();
  });

  it("requires a 32-byte key", () => {
    expect(() => encryptSecret("x", "c2hvcnQ=")).toThrow(/32 bytes/);
    expect(() => encryptSecret("x", "")).toThrow();
  });
});
