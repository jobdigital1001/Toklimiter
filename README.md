# Genius JobPortal

A mobile-first job portal for innovative companies and exceptional candidates. Companies publish jobs, candidates discover and apply to them, and administrators run the platform.

**Stack:** Next.js (App Router, TypeScript) · Tailwind CSS · shadcn/ui · Prisma + PostgreSQL · React Hook Form + Zod · Auth.js (email/password, GitHub, Google) · Resend · Vitest · Playwright · Vercel.

## Features

| Area | What's included |
| --- | --- |
| Public | Home page (hero search, featured carousel, popular categories, latest jobs, company CTA, newsletter), `/jobs` with keyword, category, location, arrangement, type, salary and experience filters, sorting (newest, salary, relevance), pagination, empty state and loading skeletons, job detail with apply, save, share, similar jobs and report, company directory and profiles |
| Candidate | Sign up / sign in (email or OAuth), profile with skills, experience, education, links, CV upload and visibility controls, completeness indicator, saved jobs, application tracking with withdraw, job alerts from saved searches |
| Recruiter | Dashboard analytics (views, applications, conversion rate, status breakdown), company profile, job create / edit / preview / publish / pause / unpause / close / reopen, eight built-in templates plus custom templates, per-job applicant pipeline, status changes, private notes, CV download |
| Admin | Overview, users (roles, suspend), companies (verify, suspend), jobs (feature, close, delete), categories, built-in templates, reports queue, platform settings |

Out of scope for v1, by design: AI matching, chat or messaging, payments, résumé parsing, multi-tenancy.

## Getting started

Requires Node.js 20.19+ and PostgreSQL 14+.

```bash
cp .env.example .env          # then set DATABASE_URL and AUTH_SECRET (npx auth secret)
npm install
npm run db:migrate            # apply migrations
npm run db:seed               # categories, templates and demo data
npm run dev
```

The seed creates demo accounts, all with the password `Genius123!`:

| Role | Email |
| --- | --- |
| Admin | `admin@genius.test` |
| Recruiter (Lumen Labs) | `recruiter@genius.test` |
| Candidate | `candidate@genius.test` |

Demo data is skipped when `NODE_ENV` or `VERCEL_ENV` is `production`, or when `SEED_DEMO=false`. Categories and built-in templates are always seeded.

## Environment variables

See `.env.example` for the full list. Only `DATABASE_URL` and `AUTH_SECRET` are required to run locally.

| Variable | Purpose | Without it |
| --- | --- | --- |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`, `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | OAuth sign-in | That provider's button is hidden |
| `RESEND_API_KEY`, `EMAIL_FROM` | Transactional email | Emails are logged to the server console |
| `BLOB_READ_WRITE_TOKEN` | CV storage on Vercel Blob | Files are written to `./.uploads` (local only; uploads fail on Vercel) |
| `CRON_SECRET` | Authorises the job-alert cron | The cron endpoint rejects every request |

OAuth callback URLs are `{APP_URL}/api/auth/callback/github` and `{APP_URL}/api/auth/callback/google`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` / `build` / `start` | Develop, build, serve |
| `npm run lint` / `typecheck` | ESLint, TypeScript |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run db:migrate` / `db:deploy` / `db:seed` | Prisma migrations and seed |

### End-to-end tests

Playwright builds the app, serves it on port 3100 and runs against a **separate** database (`E2E_DATABASE_URL`, default `genius_jobportal_test` on localhost; the name must contain "test"). Setup applies migrations and runs the idempotent seed, and the specs create uniquely named data, so the suite can be re-run against the same database. Set `E2E_RESET_DB=1` to wipe and rebuild that database first.

```bash
createdb genius_jobportal_test
npm run test:e2e
```

## Deploying to Vercel

1. Create a PostgreSQL database (for example Neon or Vercel Postgres) and a Vercel Blob store.
2. Set the environment variables above, plus `NEXT_PUBLIC_APP_URL`.
3. Deploy. `vercel.json` runs `prisma migrate deploy` during the build and schedules the daily job-alert cron.
4. Run `SEED_DEMO=false npm run db:seed` once against the production database to create categories and templates.
5. Create the first admin: sign up normally, then run `UPDATE "User" SET role = 'ADMIN' WHERE email = '…';`. Later admins can be promoted from **Admin → Users**.

## Architecture notes

- **Authorisation** is enforced on the server in every page and server action (`src/lib/session.ts`), never by hiding UI. The current user is read from the database on each request, so role changes and suspensions apply immediately.
- **Validation** uses one set of Zod schemas (`src/lib/validation.ts`) on both the client forms and the server actions.
- **CVs** are never served from a public URL. Downloads go through route handlers that check the viewer is the applicant, a recruiter at the hiring company, or an admin.
- **Search** uses Postgres `ILIKE` filters. Relevance sorting scores up to 500 matching jobs in memory (`src/lib/search.ts`), which is adequate for v1 volumes; move to Postgres full-text search or a search service as the catalogue grows.
- **shadcn/ui** components live in `src/components/ui` and are excluded from linting, as they are vendored upstream code.

## Known limitations

- No email verification or password reset for email/password accounts.
- No rate limiting on sign-in, sign-up or the newsletter form; add one (for example Upstash) before a public launch.
- Company logos and banners are URLs rather than uploads.
- One company per recruiter; there is no flow to invite teammates (an admin can attach users in the database).
- The Privacy and Terms pages are plain-language placeholders that need legal review.
