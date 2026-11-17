import { execSync } from "node:child_process";
import { E2E_DATABASE_URL } from "../../playwright.config";

/**
 * Prepares the test database. By default this is non-destructive: pending migrations are applied and the
 * idempotent seed is run, and the specs create uniquely named data so they can be re-run against the same database.
 * Set E2E_RESET_DB=1 to wipe and rebuild the database first (recommended in CI).
 */
export default function globalSetup() {
  if (!/test/i.test(new URL(E2E_DATABASE_URL).pathname)) {
    throw new Error(`Refusing to use "${E2E_DATABASE_URL}": the e2e database name must contain "test".`);
  }
  const env = { ...process.env, DATABASE_URL: E2E_DATABASE_URL, NODE_ENV: "test" as const };
  const run = (command: string) => execSync(command, { env, stdio: "inherit" });
  run(process.env.E2E_RESET_DB === "1" ? "npx prisma migrate reset --force" : "npx prisma migrate deploy");
  run("npx prisma db seed");
}
