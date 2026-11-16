/** Fixed, test-only configuration shared by the Playwright config, setup and specs. */
export const APP_PORT = 3100;
export const MOCK_GITHUB_PORT = 4010;
export const BASE_URL = `http://localhost:${APP_PORT}`;

const DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/contextbudget_test?schema=public";

export const TEST_ENV = {
  DATABASE_URL,
  DIRECT_URL: DATABASE_URL,
  NEXTAUTH_URL: BASE_URL,
  NEXTAUTH_SECRET: "e2e-only-secret-not-used-anywhere-else",
  // 32 zero bytes, base64. Test-only key.
  TOKEN_ENCRYPTION_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
  GITHUB_CLIENT_ID: "e2e",
  GITHUB_CLIENT_SECRET: "e2e",
  GITHUB_API_URL: `http://127.0.0.1:${MOCK_GITHUB_PORT}`,
};

export const USERS = {
  alice: { id: "e2e_alice", githubId: "1001", name: "Alice", state: "test-results/.auth/alice.json" },
  bob: { id: "e2e_bob", githubId: "1002", name: "Bob", state: "test-results/.auth/bob.json" },
};

export const MOCK_GITHUB_TOKEN = "gho_e2e_mock_token";
