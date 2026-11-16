// Minimal stand-in for the GitHub REST API used by the end-to-end tests.
// Serves one fixture repository and records every request path at /__requests.
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_GITHUB_PORT ?? 4010);
const TOKEN = "gho_e2e_mock_token";

const files = {
  ".gitignore": "tmp/\n",
  ".contextbudgetignore": "legacy/\n",
  ".env": "DATABASE_PASSWORD=do-not-read-me\n",
  "CLAUDE.md": "# Project rules\n- Always run the linter before committing changes.\n",
  "README.md": "# Demo app\n",
  "src/auth/session.ts": "export function refreshSession(timeout: number) {\n  return timeout > 0;\n}\n",
  "src/auth/login.ts": "export function login(user: string) {\n  return user.length > 0;\n}\n",
  "src/billing/invoice.ts": "export function invoiceTotal(items: number[]) {\n  return items.reduce((a, b) => a + b, 0);\n}\n",
  "dist/bundle.js": "var a=1;".repeat(4000),
  "docs/guide.md": "# Guide\n\n" + "Lorem ipsum dolor sit amet. ".repeat(300),
  "assets/logo.png": "\u0089PNG\r\n",
  "package-lock.json": '{"lockfileVersion":3}'.repeat(500),
  "tmp/scratch.ts": "export {}\n",
  "legacy/old.ts": "export {}\n",
};
const paths = Object.keys(files);
const sha = (path) => `sha-${paths.indexOf(path)}`;

const repos = [
  { id: 501, full_name: "octo-org/demo-app", private: true, default_branch: "main" },
  { id: 502, full_name: "octo-org/empty-notes", private: false, default_branch: "main" },
];

const requests = [];

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  if (path === "/__health") return send(res, 200, { ok: true });
  if (path === "/__requests") return send(res, 200, { requests });
  if (path === "/__reset") {
    requests.length = 0;
    return send(res, 200, { ok: true });
  }

  requests.push(path);
  if (req.headers.authorization !== `Bearer ${TOKEN}`) return send(res, 401, { message: "Bad credentials" });

  if (path === "/user/installations") return send(res, 200, { total_count: 1, installations: [{ id: 9 }] });
  if (path === "/user/installations/9/repositories") {
    return send(res, 200, { total_count: repos.length, repositories: url.searchParams.get("page") === "1" ? repos : [] });
  }
  if (path === "/repos/octo-org/demo-app") return send(res, 200, repos[0]);
  if (path === "/repos/octo-org/demo-app/git/trees/main") {
    return send(res, 200, {
      truncated: false,
      tree: paths.map((p) => ({ path: p, type: "blob", sha: sha(p), size: Buffer.byteLength(files[p]) })),
    });
  }
  const blob = path.match(/^\/repos\/octo-org\/demo-app\/git\/blobs\/(sha-\d+)$/);
  if (blob) {
    const file = paths.find((p) => sha(p) === blob[1]);
    if (file) return send(res, 200, { encoding: "base64", content: Buffer.from(files[file]).toString("base64") });
  }
  return send(res, 404, { message: "Not Found" });
}).listen(PORT, "127.0.0.1", () => console.log(`mock GitHub listening on ${PORT}`));
