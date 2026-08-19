# N5Deal Marketplace Prototype

## Read first
`docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DATA-MODEL.md`, `docs/design-audit.md`.
These are the source of truth. If a request conflicts with them, say so instead of silently deviating.

## Stack
Next.js 16 (App Router) · TypeScript strict · Supabase (`@supabase/ssr`) · Tailwind v4 · in-house UI primitives (`components/ui/`, no component library — ADR-17) · next-intl · Vitest · Playwright.
Package manager: **npm**. Never introduce a second lockfile.
Next 16: the request-interception convention is `proxy.ts`, not `middleware.ts`.

## Directory layout
```
app/                routes (no src/ directory in this project)
components/ui/      in-house primitives (ADR-17) — shared, do not restructure
components/marketplace/
components/admin/
lib/db/             ALL database access lives here
lib/ai/             AI features w/ deterministic fallback (ADR-6) — NL search built, match score not
lib/format.ts       money, dates, ticket ranges
lib/types/          one file per entity, no barrel index.ts
actions/            Server Actions
supabase/migrations/
supabase/seed/
messages/en/*.json  messages/uk/*.json   (namespaced per feature)
tests/
docs/
```

## Rules
- Server Components by default. `"use client"` only where interactivity requires it.
- No Supabase client inside components. Database access goes through `lib/db/*.ts` (ADR-5).
- All mutations are Server Actions with a zod schema parsed at the boundary (ADR-12).
- RLS is the security layer. The service role key is used **only** in `supabase/seed/` and `actions/moderation.ts` (ADR-2).
- Money is `bigint` cents everywhere. Format at the presentation boundary only. Never float.
- Filters, search and pagination live in URL search params, never in client state (ADR-3).
- No user-visible string is assembled in `lib/`. Those modules have no locale — they return a
  key or a value, `messages/` holds the wording, the component joins them (ADR-8).
- Buyer anonymity is enforced by the schema and RLS, never by conditionals in components (ADR-10).
- No `any`. No non-null assertions without a comment explaining why.
- No barrel `index.ts` files — import directly. This keeps merge conflicts local.
- Do not edit `app/globals.css` `@theme` block or `components/ui/**` after the foundation phase without saying so explicitly.

## Before reporting a task complete
```
npm run typecheck && npm run lint && npm test
```
Do not report done if any of these fail. If a failure is pre-existing, say which.

## Migrations
Append-only. Never edit an applied migration file. Regenerate types after every schema change:
```
npx supabase gen types typescript --linked > lib/types/database.ts
```

## Guardrails
See `AGENTS.md` for the schema-ownership and shared-file guardrails.
