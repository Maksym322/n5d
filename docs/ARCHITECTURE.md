# N5Deal Prototype — Architecture Decision Records

Every entry states the alternative that was rejected. An entry without an alternative is a note, not a decision.

Stack: Next.js 15 (App Router) · TypeScript strict · Supabase (Postgres + Auth + Realtime) · Tailwind v4 · in-house UI primitives (ADR-17) · next-intl · Vitest · Playwright · Vercel.

---

## ADR-1. Supabase for database and auth

**Alternative:** Prisma + standalone Postgres + NextAuth or a custom cookie session.

**Decision:** Supabase via `@supabase/ssr`, accessed with the anon key.

**Why:** auth, Postgres and Realtime from one box is a material saving against a 24-hour budget. The stronger reason is that Supabase makes row-level security the natural home for access rules (ADR-2), which matters more in a marketplace built on bilateral confidentiality than ORM ergonomics do.

**Trade-off:** weaker type inference than Prisma. Mitigated with `supabase gen types typescript`, committed and regenerated on every migration.

---

## ADR-2. RLS is the primary security layer; manager actions are a separate audited channel

**Alternative A:** role checks inside Server Actions, service role for everything.
**Alternative B:** RLS for absolutely everything, moderation included.

**Decision:** all user-initiated reads and writes go through RLS with the anon key. Platform Manager mutations run through the service role in a small set of dedicated Server Actions, each with an explicit role assertion and a mandatory `moderation_log` write.

**Why:** one source of truth for ordinary access. Alternative B was rejected on inspection: a "manager sees everything" clause requires a subquery against the profiles table inside every policy on every table — slow and fragile. Narrowing the privileged path to a handful of audited actions is easier to reason about than a policy set with a universal escape clause embedded in it.

**Consequence:** the service role key appears in exactly two places — seed scripts and `actions/moderation.ts` — and never reaches the client.

---

## ADR-3. Filter state lives in URL search params

**Alternative:** client state via Zustand or `useState`.

**Decision:** filters, search terms, sort and pagination are URL search params.

**Why:** shareable links, working browser history, and Server Components read params directly with no client state layer. Sending someone a filtered view is a real use case in a marketplace, not a nicety.

---

## ADR-4. Money as integer cents

**Alternative:** `numeric`, or floating point.

**Decision:** `bigint` cents throughout, formatted only at the presentation boundary.

**Why:** `numeric` would be defensible; floats are not. Float arithmetic on prices in a financial product is a red flag regardless of prototype status. `bigint` beats `numeric` on index cost for range filters, which is the dominant query pattern here.

---

## ADR-5. Database access only through `lib/db/*.ts`

**Alternative:** Supabase client called directly from components.

**Decision:** a thin repository layer. Components never import the Supabase client.

**Why:** three payoffs — one place where anonymised projections are applied, one seam for testing, and a clean ownership boundary when two coding agents run in parallel worktrees.

**Consequence for D1:** the number of places that must remember the disclosure rule equals the number of repository functions, not the number of components.

---

## ADR-6. AI features degrade deterministically

Decision (revised): a single hosted Supabase project serves both development and production. Migrations applied via supabase db push, seed run manually.

Trade-off: no environment separation and no fast db reset loop. Accepted deliberately — Docker setup cost outweighed the benefit at this scope. At any real scale this becomes two projects, with local development on a containerised instance.
---

## ADR-7. Deployment: Vercel + Supabase cloud

**Alternative A:** self-hosted Supabase, or Docker Compose on a VPS.
**Alternative B:** local containerised Supabase for development, a separate
hosted project for production.

**Decision:** Vercel for the app; a single hosted Supabase project serving
both development and production. Migrations applied via `supabase db push`,
types generated with `--linked`, seed run manually.

**Why:** shortest path to the public URL the brief asks for. Alternative B
is the correct long-term shape and was the original plan, but it requires
Docker Desktop and WSL2 on the development machine — setup cost that does
not repay itself inside a 24-hour budget.

**Trade-off:** no environment separation, and no fast `db reset` loop once
real data exists. Accepted deliberately. At any real scale this becomes two
projects, with local development on a containerised instance and migrations
promoted between them.
---

## ADR-8. i18n: next-intl, EN + UK, cookie-based locale

**Alternative A:** a third language.
**Alternative B:** `[locale]` path-segment routing.

**Decision:** two languages, locale resolved from a cookie and mirrored into `profiles.locale`, no locale segment in URLs.

**Why:** a third language adds translation work and no technical decision. Path-segment routing would restructure the whole `app/` directory for a two-language prototype, and it interacts badly with ADR-3 — shared filter links would carry a locale the recipient may not want.

**Trade-off:** locale is not shareable by URL. Acceptable where locale is a user preference rather than a page property.

---

## ADR-9. Role in JWT app_metadata, status read from the table

**Alternative:** both in `raw_app_meta_data`; or both in `profiles` only.

**Decision:** `role` is written to `auth.users.raw_app_meta_data` at signup and mirrored into `profiles` for joins. `status` is deliberately **not** in the JWT — write policies check it through a `security definer` helper reading the table.

**Why:** role is effectively immutable, so caching it in the token is free performance in every policy. Status is not: a JWT stays valid until refresh, so a suspended user would keep acting on stale claims for up to an hour. For a compliance action, delayed effect is the wrong default. A subquery on writes is the correct price for immediate suspension.

---

## ADR-10. Identity separation via table split, applied symmetrically

**Alternative A:** one profile table per role, exposed through a view with `security_invoker = true`.
**Alternative B:** one table plus a `security definer` view.
**Alternative C:** asymmetric — hide buyers only, leave seller profiles public.

**Decision:** four tables. `buyer_profiles` and `seller_profiles` hold anonymous, publicly readable information. `buyer_identities` and `seller_identities` hold names and contacts, readable only by the owner, by managers, and by a counterparty holding an `ACCEPTED` conversation.

**Why the split rather than a view:** RLS in Postgres filters rows, not columns. Alternative A cannot work — for a counterparty to read a row through the view, a policy must grant them that row on the underlying table, at which point they can query the table directly and get every column. Alternative B works but bypasses RLS on the underlying table, which Supabase's own linter flags, and it buries the confidentiality boundary in a view definition nobody reads. Splitting puts the boundary in the schema, where it is visible before reading a single policy.

**Why symmetric rather than asymmetric:** C was the original design and is the more expensive one. It needs two disclosure paths, two projection shapes in `lib/db`, and a special case in F3 where only one party has anything to reveal. The symmetric version collapses to a single rule — accepted means mutually visible — implemented as two mirror-image policies over the same predicate. It is less code, and it matches how the reference marketplace actually behaves (`docs/design-audit.md` §D).

---

## ADR-11. Conversation state machine and mutual disclosure

**Alternative:** immediate mutual visibility once a thread exists.

**Decision:** `PENDING → ACCEPTED | DECLINED`, with `initiated_by` recorded. Both identities unlock at `ACCEPTED`. The initiator may send one opening message; the thread unlocks fully on acceptance.

**Why:** without a pending state, "contact" would be a lookup rather than an exchange, and D1 would have no mechanism behind it. The single opening message is a UX judgement — accepting a blank request means deciding on no information.

---

## ADR-12. Server Actions as the only mutation channel, zod at the boundary

**Alternative:** Route Handlers with a client fetch layer.

**Decision:** every mutation is a Server Action with a zod schema parsed at entry. No REST layer.

**Why:** a Route Handler layer adds a serialization boundary, a fetch wrapper and hand-written types for zero benefit — there is no external API consumer. zod at the boundary keeps validation in one place and produces the TypeScript types used downstream instead of duplicating them across client and server.

---

## ADR-13. Text search via `ilike`, not full-text search

**Alternative:** Postgres FTS with a `tsvector` column and GIN index.

**Decision:** `ilike` across title, description and headline.

**Why:** at 35 assets, FTS costs setup and a maintenance trigger to return results indistinguishable from a substring match. A deliberate ceiling, not an oversight — the change point is roughly the first few thousand rows, or the first request for relevance ranking or stemming.

---

## ADR-14. Testing strategy

**Alternative:** broad end-to-end coverage; or unit tests only.

**Decision:** Vitest units for match scoring, filter construction, money formatting and permission predicates. Two Playwright scenarios covering F1 and F4. RLS policies are **not** covered by automated tests.

**Why:** the unit-tested pieces are pure functions with real branching — where bugs are both likely and silent. The two e2e scenarios each cross the most system boundaries: F1 exercises filtering, disclosure and threading; F4 exercises moderation and its propagation into the public catalogue.

RLS is excluded because testing it properly means asserting policies against a dedicated instance under several authenticated identities — worth doing in production, out of budget here. The invariants that would be asserted are listed in `DATA-MODEL.md` §9 and were verified manually.

---

## ADR-15. Listing rows with an inline trend chart, not a card grid

**Alternative:** a responsive card grid, the default shape for marketplace listings.

**Decision:** full-width horizontal rows carrying a dense two-row attribute grid and a 6-point line chart, matching the audited reference (`docs/design-audit.md` §A–C).

**Why:** the grid was the original assumption and it was wrong — direct inspection of the reference showed rows. Beyond matching the brief's visual-consistency criterion, the row is the better shape for this content: an M&A listing has 9–10 comparable attributes, and rows let a buyer scan one attribute down a column across listings, which a card grid makes impossible.

The chart is rendered from a `price_history` JSONB column seeded with six annual points, drawn as inline SVG rather than a charting library — 6 points and 2 axes do not justify the bundle cost of Recharts, and hand-written SVG inherits the design tokens directly.

---

## ADR-16. Facet counts computed against currently applied filters

**Alternative:** static counts over the whole catalogue, or no counts.

**Decision:** category pills carry counts, recomputed with the active filter set applied, in one grouped query alongside the results query.

**Why:** counts that ignore active filters are worse than no counts — they promise results that a click then fails to deliver. Recomputing them is a single `group by` on an already-indexed column, so correctness here is nearly free.

**Implementation.** PostgREST/`supabase-js` cannot express `group by`, and adding an aggregate RPC would mean a migration (out of scope for the buyer build). So `getCategoryFacets` issues one `select("category")` under every active filter *except category itself* and buckets the rows in JS over the `asset_category` enum. At ~28 published rows this is a single small round-trip — indistinguishable in cost from a grouped query. The change point is roughly the first few thousand assets, or the first time the category column stops fitting comfortably in one response: at that scale this becomes a `security definer` RPC running `select category, count(*) ... group by category`, called in place of the JS bucketing with no change to callers.

---

## ADR-17. In-house UI primitives, not a component library

**Alternative:** shadcn/ui (its generated primitives + `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`).

**Decision:** a small set of hand-written primitives in `components/ui/` (Button, Input, Select, Checkbox, Badge, Field, an inline-SVG icon set, and a tiny `cn` helper), built on native elements and the Tailwind v4 `@theme` tokens. No component-library or icon-library dependency.

**Why:** the foundation phase already styled its shell with raw Tailwind and the design tokens, and the marketplace's distinctive surfaces — the full-width listing row, the two-row attribute grid, the inline-SVG trend chart (ADR-15) — are bespoke regardless of any library. What remains is a handful of form controls and badges that native elements plus tokens cover directly. Pulling in Radix + cva + tailwind-merge + lucide to render a `<select>` and a checkbox is bundle and dependency surface bought for little. It also honours the parallel-work rule in `AGENTS.md` ("add a dependency on one branch only, on `main` first"): the buyer build adds none.

**Trade-off:** we forgo Radix's accessibility behaviours for the few controls that would benefit (e.g. a custom listbox). Accepted at prototype scope — the controls used are native and accessible by default. The change point is the first primitive whose correct behaviour is genuinely hard to hand-roll (a combobox, a focus-trapped dialog, a date picker); at that point adopt the library rather than reimplement it.

**Consequence:** the CLAUDE.md rule "do not edit `components/ui/**` after the foundation phase without saying so explicitly" continues to apply — this ADR is that explicit statement for their initial creation.

---

## ADR-18. Policy subqueries against `profiles` use a `security definer` helper, not a widened read grant

**Alternative:** open `profiles` to all authenticated users (a single permissive `select` policy).

**Decision:** keep `profiles` read **scoped** — own row, manager, or a user you share a conversation with — and give `assets_read_published` a `security definer` helper, `public.is_seller_active(uid)`, for its seller-ACTIVE check instead of an inline `select … from profiles` subquery. Applied in migration `20260819130000_fix_read_rls.sql`.

**Why:** Postgres applies a table's RLS to *every* reference to it, including subqueries inside another policy's `USING` expression. `assets_read_published` checked the seller's status with an inline `exists (select 1 from profiles …)`, so that subquery ran under `profiles_read_self` (own-row-only) and returned nothing for other sellers — making **every** published asset invisible to a buyer, and nulling the counterparty handle in `/messages`. This is the same trap `is_active()` already sidesteps with `security definer`; `is_seller_active()` is the same convention, one more time, rather than a new one.

Widening `profiles` to all authenticated users would also have worked and is defensible (the table holds only the non-identifying handle), but it trades a precise grant for a blanket one and quietly exposes every participant's `display_name`/`role` to every other. Scoping the read to an existing relationship (a shared conversation) keeps the confidentiality surface as small as the feature needs — the handle is visible exactly to a counterparty, which is the only place the UI renders it. The anonymous buyer directory reads `buyer_profiles` (gated by `is_listed`), not `profiles`, so it needs no wider grant.

**Trade-off:** a `security definer` function is a small privileged surface that must pin `search_path` (it does) and stay narrow (a single boolean). Accepted — it is strictly less exposure than a table-wide read policy, and it matches the pattern already in the schema.
