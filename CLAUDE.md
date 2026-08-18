# N5Deal Marketplace Prototype

## Read first
`docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DATA-MODEL.md`, `docs/design-audit.md`.
These are the source of truth. If a request conflicts with them, say so instead of silently deviating.

## Stack
Next.js 15 (App Router) · TypeScript strict · Supabase (`@supabase/ssr`) · Tailwind v4 · shadcn/ui · next-intl · Vitest · Playwright.
Package manager: **npm**. Never introduce a second lockfile.

## Directory layout
```
app/                routes (no src/ directory in this project)
components/ui/      shadcn primitives — shared, do not restructure
components/marketplace/
components/admin/
lib/db/             ALL database access lives here
lib/ai/             AI features, each with a deterministic fallback
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
npx supabase gen types typescript --local > lib/types/database.ts
```

## Ownership during parallel work
When branches `feature/admin` or `feature/ai` are active, respect the boundaries in `AGENTS.md`.
