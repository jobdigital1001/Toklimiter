# ContextBudget Web

A mobile-first web app that helps Claude Code users cut wasted tokens **before** sending a coding task.

Paste a prompt, pick a GitHub repository, and ContextBudget estimates the token cost, flags waste, and generates a minimal context pack you can paste straight into Claude Code.

It is a local-first, privacy-respecting tool. It is not a chat product or a coding agent, and it never executes repository code.

## How it works

1. **Choose repository** – sign in with GitHub and pick one repository you have granted access to.
2. **Add task** – paste a prompt or upload a `task.md`, set include/exclude globs and a token budget.
3. **Review context pack** – see the estimated total tokens, the largest contributors, waste findings and recommended exclusions, then copy the pack or download it as Markdown.

Every audit and pack is saved to your history.

### Waste rules

| Rule | Flags |
| --- | --- |
| Large file | A single file that takes a large share of the budget |
| Generated output | `dist/`, `node_modules/`, lockfiles, minified bundles, auto-generated files |
| Binary file | Images, archives, fonts and other non-text files |
| Log dump | Log files, and long log or stack-trace pastes in the prompt |
| Duplicate instruction | Instructions repeated in the prompt or already present in the repo's `CLAUDE.md` |
| Missing success criteria | Prompts with no checkable outcome |
| Vague task | Prompts that are very short or name no file, function or behaviour |
| Excessive examples | More examples or code blocks than the task needs |
| Secret risk | Secret files matched by your patterns, and credentials in files or the prompt |
| Irrelevant directory | Supporting directories (`docs/`, `.github/`, fixtures…) the task does not mention |
| Prompt boilerplate | Greetings, role-play and politeness filler |

### Token estimation

Tokens are estimated with a local approximation by default; nothing leaves the app.

For exact numbers, add your own Anthropic API key under **Settings** and switch on accurate counting. The key is kept in your browser's local storage, sent only with an audit request, and never stored on the server. When it is on, your prompt and the text of up to 40 scanned files are sent to Anthropic's Token Count API; the remaining files are scaled by the measured ratio.

## Security and privacy

- **GitHub tokens are encrypted at rest** with AES-256-GCM (`TOKEN_ENCRYPTION_KEY`) and never placed in the session cookie.
- **Read-only, minimal access.** With a GitHub App the app needs only read access to Contents and Metadata on the repositories you pick. With a classic OAuth App the default scope is `read:user`.
- **Secret files are never read or stored**: `.env`, `.env.*`, private keys, credential files, `.npmrc`, `.aws/`, `.ssh/`, Terraform state and similar. They are reported by path only.
- **`.gitignore` is respected**, plus an optional `.contextbudgetignore` at the repository root (same syntax).
- **Repository code is never executed.** Only file names, sizes and text are inspected.
- **File contents are never stored.** They are analysed in memory; the database holds paths, token counts, findings and the generated pack. Credentials detected in a prompt are redacted before saving.
- **No third parties** unless you enable Anthropic token counting.
- **All input is validated with Zod and API routes are rate limited.** The limiter is in-memory, so on serverless hosts it applies per running instance.

## Tech stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui-style components · Prisma + PostgreSQL · NextAuth.js (GitHub only) · Zod · Vitest · Playwright

## Setup

Requirements: Node.js 20.9 or newer and PostgreSQL.

```bash
npm install
cp .env.example .env    # then fill in the values below
npm run db:migrate      # create the database schema
npm run dev             # http://localhost:3000
```

### GitHub credentials

**Recommended: a GitHub App** (fine-grained and read-only; users choose exactly which repositories to share).

1. GitHub → Settings → Developer settings → GitHub Apps → **New GitHub App**.
2. Callback URL: `http://localhost:3000/api/auth/callback/github` (use your production URL when deploying).
3. Enable **Request user authorization (OAuth) during installation**. Webhooks can be disabled.
4. Repository permissions: **Contents: Read-only**, **Metadata: Read-only**. Nothing else.
5. Under *Optional features*, opt out of **User-to-server token expiration**. Otherwise tokens expire after 8 hours and users must sign in again.
6. Create the app, generate a client secret, then install the app on the repositories you want to audit.

**Alternative: a classic OAuth App.** Use the same callback URL. With the default `GITHUB_OAUTH_SCOPE="read:user"` only public repositories can be audited. Private repositories need the broad `repo` scope, which is why a GitHub App is preferred.

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string (pooled, if your provider offers one) |
| `DIRECT_URL` | yes | Direct connection used for migrations. Same as `DATABASE_URL` if you have no pooler |
| `NEXTAUTH_URL` | yes | Public base URL, e.g. `http://localhost:3000` |
| `NEXTAUTH_SECRET` | yes | Session secret. Generate with `openssl rand -base64 32` |
| `GITHUB_CLIENT_ID` | yes | Client ID of the GitHub App or OAuth App |
| `GITHUB_CLIENT_SECRET` | yes | Client secret |
| `GITHUB_OAUTH_SCOPE` | no | Scopes for classic OAuth Apps. Default `read:user`. Ignored by GitHub Apps |
| `TOKEN_ENCRYPTION_KEY` | yes | 32-byte base64 key for encrypting GitHub tokens. Generate with `openssl rand -base64 32` |
| `GITHUB_API_URL` | no | Override the GitHub API base URL. Used by the end-to-end tests |

Changing `TOKEN_ENCRYPTION_KEY` invalidates stored tokens; users simply sign in again.

## Database migrations

```bash
npm run db:migrate   # development: create and apply migrations (prisma migrate dev)
npm run db:deploy    # production: apply committed migrations (prisma migrate deploy)
```

The schema lives in `prisma/schema.prisma`. It follows the product data model, plus one `encryptedAccessToken` column on `User` for the encrypted GitHub token.

## Tests and checks

```bash
npm run typecheck    # TypeScript
npm run lint         # ESLint
npm test             # Vitest unit tests
npm run test:e2e     # Playwright end-to-end tests
npm run build        # production build
```

The end-to-end tests build the app and run it against a mock GitHub API (`tests/e2e/mock-github.mjs`) with an Android phone profile and a desktop profile. They need:

- a PostgreSQL database for tests. The default is `postgresql://postgres:postgres@localhost:5432/contextbudget_test`; override it with `E2E_DATABASE_URL`. **Its tables are cleared on every run.**
- a Chromium browser for Playwright: `npx playwright install chromium`.

Test users are signed in by minting a session cookie with the test-only secret. The app contains no test login path.

## Deployment (Vercel)

1. Create a PostgreSQL database (Vercel Postgres, Neon, Supabase, …).
2. Import the repository in Vercel. The framework is detected as Next.js.
3. Add every required environment variable from the table above. Set `NEXTAUTH_URL` to your production URL, and `DIRECT_URL` to the non-pooled connection string.
4. Set the build command to `npm run db:deploy && npm run build` so migrations are applied on each deploy.
5. Add `https://<your-domain>/api/auth/callback/github` as a callback URL in your GitHub App.
6. Deploy.

Audits run in a single serverless function with a 60-second limit (`maxDuration` in `src/app/api/audits/route.ts`). Use include patterns to narrow very large repositories.

## Project structure

```
prisma/                 Schema and migrations
src/app/                Routes: landing, (app)/audit, history, settings, api/
src/components/         UI primitives (ui/) and feature components (audit/)
src/lib/                Auth, encryption, GitHub client, rate limiting, validation
src/lib/analysis/       Waste rules, file selection, context pack generator
src/lib/audit.ts        Repository scan and audit orchestration
tests/unit/             Vitest tests
tests/e2e/              Playwright tests and the mock GitHub server
```

## Limits

- File text is downloaded for at most 150 files of up to 200 KB each, chosen by relevance to the task. Other files are estimated from their size.
- For repositories with more than about 100,000 files GitHub returns a partial file list, and the app says so.
- A context pack lists at most 40 relevant files.
