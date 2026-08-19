# N5Deal Marketplace — Prototype

Confidential M&A marketplace connecting Sellers and Buyers under a Platform Manager, where
**confidentiality runs in both directions** (neither side is identified until a contact
request is accepted). See `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DATA-MODEL.md`,
`docs/design-audit.md` for the source of truth.

This repository currently contains the **foundation**: schema + RLS, an idempotent demo
seed, `@supabase/ssr` auth, a passwordless role-switcher login, the design-token shell,
EN/UK i18n, and the test harness. Marketplace, buyer directory and admin pages come later.

## Stack

Next.js (App Router) · TypeScript strict · Supabase (`@supabase/ssr`) · Tailwind v4 ·
next-intl · Vitest · Playwright. Package manager: **npm**.

## Environment

Two env files (both gitignored — never commit secrets):

`.env.local` — app runtime:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
DEMO_ACCOUNT_PASSWORD=<shared password for all demo accounts>
```

- **`DEMO_ACCOUNT_PASSWORD` is required.** All seeded demo accounts share it, and the
  passwordless `/login` role switcher signs in with it. The seed fails loudly if it is
  unset. A reviewer running locally must set this in their own `.env.local`; the value for
  the deployed build is supplied separately (out of band).

`.env.cli.local` — Supabase CLI only (kept out of the app env deliberately):

```
SUPABASE_ACCESS_TOKEN=sbp_...        # https://supabase.com/dashboard/account/tokens
SUPABASE_DB_PASSWORD=<db password>   # Project Settings → Database
```

## Setup

```bash
npm install

# Apply schema to the hosted project (reads .env.cli.local)
npx supabase link --project-ref <project-ref>
npx supabase db push
npx supabase gen types typescript --linked > lib/types/database.ts

# Seed demo data (reads .env.local; safe to run repeatedly)
npm run seed

npm run dev            # http://localhost:3000
```

## Demo accounts

`/login` offers three buttons — Buyer / Seller / Manager — that sign into pre-seeded
accounts (`buyer01@example.com`, `seller01@example.com`, `manager01@example.com`), all using
`DEMO_ACCOUNT_PASSWORD`. The seed also creates 12 sellers, 20 buyers, 35 assets, 11
conversations (4 accepted, one initiator sitting at exactly 5 pending), messages and a
moderation log.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright (`npx playwright install chromium` first) |
| `npm run seed` | Idempotent demo seed |

Before reporting a task complete: `npm run typecheck && npm run lint && npm test`.

## Migrations

Append-only in `supabase/migrations/`. Never edit an applied migration. Regenerate types
after any schema change (`gen types --linked`). Policies and triggers are written to be
re-runnable (`drop ... if exists` before each `create`).
