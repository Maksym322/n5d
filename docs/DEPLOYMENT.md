# Deployment (Vercel + Supabase)

The app deploys to **Vercel**; the database and auth are a **single hosted Supabase project**
serving both development and production (ADR-7). The schema and seed are applied out-of-band with
the Supabase CLI — Vercel does **not** run migrations or the seed.

## Prerequisites

- A Supabase project with the migrations applied and the demo data seeded — see the repo README
  "Quick start". Note the **`DEMO_ACCOUNT_PASSWORD`** you seeded with; the deployed build must use
  the same value or the `/login` switcher cannot sign in.
- The repo pushed to a Git provider Vercel can import.

## Steps

1. **Import the repo** into Vercel (New Project → import from Git). Framework is auto-detected as
   **Next.js 16**; leave the defaults — Build Command `next build`, Install Command `npm install`,
   Output handled by the Next adapter. No `vercel.json` is needed and none is committed.
2. **Set environment variables** (Settings → Environment Variables) for **Production** *and*
   **Preview** — see the table below.
3. **Deploy.** After the first deploy, open `/login` and sign in with a role button to confirm the
   session and RLS are working against the hosted project.

## Environment variables to set in Vercel

Set the four required ones, plus `GEMINI_API_KEY` if you want natural-language search on the deployed build. These are the app-runtime variables from `.env.local`:

| Variable | Value | Scope |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` | Public (build + runtime) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable key `sb_publishable_…` | Public (build + runtime) |
| `SUPABASE_SERVICE_ROLE_KEY` | secret key `sb_secret_…` | **Server-only** — do not expose; used only by `actions/moderation.ts` at runtime |
| `DEMO_ACCOUNT_PASSWORD` | **the exact password the hosted project was seeded with** | **Server-only** — the passwordless `/login` switcher signs in with it |
| `GEMINI_API_KEY` | Google AI Studio key — **optional** | **Server-only** — enables natural-language search on `/assets`. Omit it and the search box silently falls back to the `ilike` text search (ADR-6); nothing errors and nothing is hidden, so a deploy without it is a valid deploy |

**Do not add the Supabase CLI variables to Vercel.** `SUPABASE_ACCESS_TOKEN` and
`SUPABASE_DB_PASSWORD` live only in `.env.cli.local`; they are for running `supabase link` / `db
push` from your machine and have no role in the running app. Adding them to Vercel would put
unnecessary secrets in the deployment.

## Applying schema / seed to the hosted project

Run from your machine (reads `.env.cli.local` for the CLI, `.env.local` for the seed):

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push          # apply migrations
npm run seed                  # idempotent demo data
```

Because dev and prod share one project (ADR-7), **seeding touches live data** — run
`npm run seed:reset` only when you intend to force the demo back to its fixture state.

## Production foot-guns (things that pass locally but can break in prod)

- **`DEMO_ACCOUNT_PASSWORD` mismatch or missing.** If it is unset, `actions/auth.ts` throws
  `"DEMO_ACCOUNT_PASSWORD is not set in the environment"` and `/login` fails. If it is set to a
  value different from what the project was seeded with, every sign-in fails with invalid
  credentials. It must be present **and** equal to the seed-time value.
- **`proxy.ts` fails silently on missing Supabase env.** The session-refresh proxy returns
  `NextResponse.next()` (a no-op) when `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` are absent, so a
  misconfigured deploy serves pages with stale/expired sessions rather than erroring — verify both
  are set for Production and Preview.
- **No `.env.example` in the repo.** The env contract lives in the README and this file; there is
  no template file to copy, so set the four required variables explicitly in Vercel.
- **`GEMINI_API_KEY` set locally but not in Vercel.** This is the one that will not announce
  itself: natural-language search works on your machine and quietly degrades to substring search
  on the deployed build, with no error anywhere. That silence is the designed behaviour (ADR-6),
  which is exactly why the key has to be set deliberately for **Production *and* Preview** if the
  feature is meant to be part of the demo. It is also the only variable here that costs money per
  request, so leaving it unset on Preview is a legitimate choice rather than a mistake.
- **e2e specs hardcode `http://localhost:3000`.** `npm run test:e2e` is a local-only gate
  (`playwright.config.ts` launches `npm run dev`); it is not meant to run against the deployed URL.
- **Single shared dev/prod Supabase project.** There is no environment isolation — a migration or
  seed run hits the same database that serves production traffic. Acceptable at prototype scope;
  the first step at real scale is to split the projects.
- **`DEMO_ACCOUNT_PASSWORD` guards a public demo.** Every seeded account shares it and `/login`
  exposes a one-click switcher, so anyone with the URL can act as any demo role. That is intended
  for a reviewer demo, not a real environment.
