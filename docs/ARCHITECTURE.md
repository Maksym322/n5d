# N5Deal Prototype — Architecture Decision Records

Every entry states the alternative that was rejected. An entry without an alternative is a note, not a decision.

Stack: Next.js 16 (App Router) · TypeScript strict · Supabase (Postgres + Auth + RLS) · Tailwind v4 · in-house UI primitives (ADR-17) · next-intl · Gemini via `@google/genai` (ADR-6) · Vitest · Playwright · Vercel.

---

## ADR-1. Supabase for database and auth

**Alternative:** Prisma + standalone Postgres + NextAuth or a custom cookie session.

**Decision:** Supabase via `@supabase/ssr`, accessed with the anon key.

**Why:** auth and Postgres from one box is a material saving against a 24-hour budget. The stronger reason is that Supabase makes row-level security the natural home for access rules (ADR-2), which matters more in a marketplace built on bilateral confidentiality than ORM ergonomics do.

**Trade-off:** weaker type inference than Prisma. Mitigated with `supabase gen types typescript`, committed and regenerated on every migration.

**Not used:** Supabase Realtime. Message threads refresh on navigation rather than live-updating — a deliberate omission, not a platform limitation. Live threads would be the natural next step and require no schema change.

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

**Why:** two payoffs that matter here — one place where anonymised projections are applied, and one seam for testing. Because disclosure rules live in the projection rather than in the render, the number of places that must remember them equals the number of repository functions, not the number of components.

**Consequence for D1:** a component cannot leak an identity it was never handed. The `if (accepted)` conditional a naive implementation would scatter through the UI does not exist anywhere in this codebase.

---

## ADR-6. AI features degrade deterministically

**Alternative:** AI features that require an API key and fail (or are hidden) without one.

**Decision:** the two AI features — natural-language search (free text → structured filters, rendered as editable chips) and match score (mandate↔asset overlap with a one-sentence model-generated rationale) — are each designed as a thin generative layer over a deterministic core. With no API key present, natural-language search falls back to the ordinary faceted filters and match score falls back to the pure overlap calculation with no rationale text.

**Why:** the demo must work for a reviewer without credentials. Binding a core browsing or ranking capability to an external API key would make the whole flow fragile and unreviewable offline. The deterministic path is also the source of truth the generative layer is graded against, so building it first is not throwaway work.

**Implementation.** Natural-language search is built. Match score is not — its deterministic overlap ranking exists in `lib/db/`, but the rationale layer remains descoped; see the README.

**Model and SDK.** Gemini `gemini-2.0-flash`, through `@google/genai` pinned to an exact version. The task is structured extraction, not reasoning: the model maps a sentence onto an enum this database already defines, and the cost of a wrong reading is bounded by validation and made visible by the chips. A slower model would buy latency, not accuracy. The named legacy package `@google/generative-ai` was rejected — it was last published in April 2025 and is superseded — and the version is pinned rather than caret-ranged so a build today and a build next month are the same build.

**Two lines of validation, because they check different things.** The request carries a `responseSchema` whose enum members are interpolated from `Constants.public.Enums` and `SEEDED_JURISDICTIONS`, so the model is constrained at the API level and cannot invent a category, a deal type or a jurisdiction — malformed output is not a case the code has to handle. `lib/ai/search-intent.ts` then re-validates with zod, because a schema constrains shape and shape is not the same question as *does this value exist in this database*. The rule there: a wrong **type** rejects the whole response, a wrong **value** drops that field. Rejecting wholesale on one bad value would fall back to an `ilike` over the raw sentence, which returns nothing — a partial interpretation is strictly better, and the chips show what was actually applied. Prices come back as plain euros and the conversion to cents happens here, never in the model (ADR-4).

**The output is a URL patch, nothing more.** Interpreted filters are written to the search params and read back by `parseAssetFilters`, so the catalogue query, the facet counts and the empty-state suggestions are the same code paths an unaided user drives (ADR-3). A pasted link reproduces an interpreted search exactly.

**The fallback, as built.** With no key, `/assets` passes `aiEnabled={false}` and the client never calls the action at all — no round-trip, no added latency, the field behaves exactly as it did before this feature existed. Behind that, the Server Action re-checks the key, and `interpretQuery` swallows every failure — bad key, quota, timeout at six seconds, unusable output — and returns null, which the client treats identically: the raw sentence becomes a plain `ilike` query. This was verified by running the app and the end-to-end suite with `GEMINI_API_KEY` unset, not by reading the code.

**Consequence:** the search field became submit-driven. A 300 ms debounce is right for a substring match and wrong for a model call — it would fire one interpretation per keystroke. So the box is a form now, and the query is sent once, when the user says it is finished. A query that parses as an asset reference (`Asset #113`) short-circuits past the model entirely, which also keeps the F1 end-to-end spec deterministic and runnable without credentials.

---

## ADR-7. Deployment: Vercel + Supabase cloud

**Alternative A:** self-hosted Supabase, or Docker Compose on a VPS.
**Alternative B:** local containerised Supabase for development, a separate hosted project for production.

**Decision:** Vercel for the app; a single hosted Supabase project serving both development and production. Migrations applied via `supabase db push`, types generated with `--linked`, seed run manually.

**Why:** shortest path to the public URL the brief asks for. Alternative B is the correct long-term shape and was the original plan, but it requires Docker Desktop and WSL2 on the development machine — setup cost that does not repay itself inside a 24-hour budget.

**Trade-off:** no environment separation, and no fast `db reset` loop once real data exists. Accepted deliberately. At any real scale this becomes two projects, with local development on a containerised instance and migrations promoted between them.

---

## ADR-8. i18n: next-intl, EN + UK, cookie-based locale

**Alternative A:** a third language.
**Alternative B:** `[locale]` path-segment routing.

**Decision:** two languages, locale resolved from a cookie and mirrored into `profiles.locale`, no locale segment in URLs.

**Why:** a third language adds translation work and no technical decision. Path-segment routing would restructure the whole `app/` directory for a two-language prototype, and it interacts badly with ADR-3 — shared filter links would carry a locale the recipient may not want.

**Trade-off:** locale is not shareable by URL. Acceptable where locale is a user preference rather than a page property.

**Rule:** a user-visible string is never assembled in `lib/`. Modules there are pure and have no
locale, so any English they build leaks past next-intl and renders untranslated on a Ukrainian
page — silently, because nothing errors. `lib/` may decide *which* string applies and return a key
or a value; `messages/` decides the wording, and the component joins them.

This was not obvious from a single instance. Four separate gaps appeared before the pattern was
named — `jurisdictionName` returning English country names, `Intl` rendering EUR as the word "EUR"
for a Ukrainian viewer, `formatTicketRange` hardcoding "Up to" and "Any", and the moderation log
building `Asset #113` in the query layer instead of using `marketplace.listing.ref` the way every
other surface does. Each was found by looking rather than by a test, which is why the rule now has
one: `tests/i18n-coverage.test.ts` asserts key parity across all six namespaces per locale and that
every key `lib/` can emit resolves in both.

**Where the line falls.** `profiles.display_name` (`Seller #03`) is English and stays that way —
it is seeded data, persisted in Postgres and read back like any other row, not a string assembled
for display. Translating it would mean the database holding one language. Formatters keep taking a
`locale` for grouping, decimal separators and date order; what they must not take is the words.

---

## ADR-9. Role in JWT app_metadata, status read from the table

**Alternative:** both in `raw_app_meta_data`; or both in `profiles` only.

**Decision:** `role` is written to `auth.users.raw_app_meta_data` at user creation and mirrored into `profiles` for joins. `status` is deliberately **not** in the JWT — write policies check it through a `security definer` helper reading the table.

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

**Decision:** `ilike` across title, description and headline, plus an exact match on `public_ref` when the query parses as an asset reference.

**Why:** at 35 assets, FTS costs setup and a maintenance trigger to return results indistinguishable from a substring match. A deliberate ceiling, not an oversight — the change point is roughly the first few thousand rows, or the first request for relevance ranking or stemming.

Since natural-language search shipped (ADR-6) this is the fallback path rather than the only one: a query the model can read becomes structured filters, and `ilike` is what runs on the residual keywords, on an uninterpretable query, and on every query at all when no API key is configured.

The reference-match special case exists because `Asset #113` is the only identifier a user ever sees — it appears in every listing title, every URL and every thread — and a search that cannot find it reads as broken regardless of what the text index does.

---

## ADR-14. Testing strategy

**Alternative:** broad end-to-end coverage; or unit tests only.

**Decision:** Vitest units for the pure functions — money formatting and locale-independent currency symbols (`format.test.ts`), localized jurisdiction names (`jurisdictions`), locale key parity and the strings `lib/` can emit (`i18n-coverage`), filter construction and active-filter/widen helpers for the catalogue, buyer directory and admin registry (`asset-filters`, `buyer-filters`, `admin-filters`), faceted category counts (`facet-counts`, `buyer-facet-counts`), trend-chart geometry (`chart-geometry`), price-history defaults (`price-history`) and the natural-language search narrowing layer (`search-intent`). Playwright scenarios for `login`, F1 (`buyer-f1`), F2/F3 (`seller-f2-f3`) and F4 (`admin-f4`). RLS policies are **not** covered by automated tests.

**Why:** the unit-tested pieces are pure functions with real branching — where bugs are both likely and silent. The e2e scenarios each cross the most system boundaries: F1 exercises filtering, disclosure and threading; F4 exercises moderation and its propagation into the public catalogue.

The F4 scenario earned its cost immediately. It exposed that the moderation reason's minimum length was enforced only by a disabled submit button, so the server-side path could never be reached; the guarantee moved onto the server — zod `.min(10)` at the Server Action boundary (ADR-12), with the database `CHECK` as the backstop behind it (ADR-2) — and the disabled state was demoted to UX. It also surfaced a subtler point: F4's propagation is invisible from the manager's own session, because `is_manager()` grants them every row, so the assertion that a suspended seller's listings left the catalogue had to be made from a buyer's session. A privileged test subject would have reported success on a broken feature.

> **Note.** Match-scoring and permission-predicate units are *not* in the suite — match scoring because that feature is still descoped (ADR-6), and permissions because they are RLS, excluded below. The other AI feature, natural-language search, *is* covered: `search-intent` asserts the narrowing layer against a valid response, unknown enum values, out-of-range and inverted prices, an empty response and a malformed one. That layer is deliberately pure — no network, no server-only import — so the tests need no mocking, which is the same seam that makes `asset-filters` testable.

RLS is excluded because testing it properly means asserting policies against a dedicated instance under several authenticated identities — worth doing in production, out of budget here. The invariants that would be asserted are listed in `DATA-MODEL.md` §9 and were verified manually against the live database.

---

## ADR-15. Listing rows with an inline trend chart, not a card grid

**Alternative:** a responsive card grid, the default shape for marketplace listings.

**Decision:** full-width horizontal rows carrying a dense two-row attribute grid and a 6-point line chart, matching the audited reference (`docs/design-audit.md` §A–C).

**Why:** the grid was the original assumption and it was wrong — direct inspection of the reference showed rows. Beyond matching the brief's visual-consistency criterion, the row is the better shape for this content: an M&A listing has 7 comparable attributes, and rows let a buyer scan one attribute down a column across listings, which a card grid makes impossible.

The chart is rendered from a `price_history` JSONB column seeded with six annual points, drawn as inline SVG rather than a charting library — 6 points and 2 axes do not justify the bundle cost of Recharts, and hand-written SVG inherits the design tokens directly.

**One deliberate divergence from the reference:** its charts use spline smoothing, which overshoots between data points and implies values the series does not contain. For a price history that is misleading, so the polyline here is straight-segmented.

---

## ADR-16. Facet counts computed against currently applied filters

**Alternative:** static counts over the whole catalogue, or no counts.

**Decision:** category pills carry counts, recomputed with the active filter set applied, alongside the results query.

**Why:** counts that ignore active filters are worse than no counts — they promise results that a click then fails to deliver.

**Implementation.** PostgREST and `supabase-js` cannot express `group by`, and adding an aggregate RPC would have required a migration. So `getCategoryFacets` issues one `select("category")` under every active filter *except category itself* and buckets the rows in JS over the `asset_category` enum. At roughly 28 published rows this is a single small round-trip — indistinguishable in cost from a grouped query. The change point is a few thousand assets, or the first time the category column stops fitting comfortably in one response: at that scale this becomes a `security definer` RPC running `select category, count(*) … group by category`, called in place of the JS bucketing with no change to callers.

---

## ADR-17. In-house UI primitives, not a component library

**Alternative:** shadcn/ui (its generated primitives + `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`).

**Decision:** a small set of hand-written primitives in `components/ui/` (Button, Input, Select, Checkbox, Badge, Field and an inline-SVG icon set), plus a tiny `cn` class-name joiner in `lib/cn.ts`, built on native elements and the Tailwind v4 `@theme` tokens. No component-library or icon-library dependency.

**Why:** the foundation phase already styled its shell with raw Tailwind and the design tokens, and the marketplace's distinctive surfaces — the full-width listing row, the two-row attribute grid, the inline-SVG trend chart (ADR-15) — are bespoke regardless of any library. What remains is a handful of form controls and badges that native elements plus tokens cover directly. Pulling in Radix, cva, tailwind-merge and lucide to render a `<select>` and a checkbox is bundle and dependency surface bought for very little.

**Trade-off:** we forgo Radix's accessibility behaviours for the few controls that would benefit, such as a custom listbox. Accepted at prototype scope — the controls used are native and accessible by default. The change point is the first primitive whose correct behaviour is genuinely hard to hand-roll (a combobox, a focus-trapped dialog, a date picker); at that point adopt the library rather than reimplement it.

---

## ADR-18. Policy subqueries against `profiles` use a `security definer` helper, not a widened read grant

**Alternative:** open `profiles` to all authenticated users (a single permissive `select` policy).

**Decision:** keep `profiles` read **scoped** — own row, manager, or a user you share a conversation with — and give `assets_read_published` a `security definer` helper, `public.is_seller_active(uid)`, for its seller-ACTIVE check instead of an inline `select … from profiles` subquery. Applied in migration `20260819130000_fix_read_rls.sql`.

**Why:** Postgres applies a table's RLS to *every* reference to it, including subqueries inside another policy's `USING` expression. `assets_read_published` checked the seller's status with an inline `exists (select 1 from profiles …)`, so that subquery ran under `profiles_read_self` (own-row-only) and returned nothing for other sellers — making **every** published asset invisible to a buyer, and nulling the counterparty handle in `/messages`. This is the same trap `is_active()` already sidesteps with `security definer`; `is_seller_active()` is the same convention, one more time, rather than a new one.

Widening `profiles` to all authenticated users would also have worked and is defensible — the table holds only a non-identifying handle — but it trades a precise grant for a blanket one and quietly exposes every participant's `display_name` and `role` to every other. Scoping the read to an existing relationship keeps the confidentiality surface as small as the feature needs: the handle is visible exactly to a counterparty, which is the only place the UI renders it. The anonymous buyer directory reads `buyer_profiles`, gated by `is_listed`, so it needs no wider grant.

**Trade-off:** a `security definer` function is a small privileged surface that must pin `search_path` (it does) and stay narrow (a single boolean). Accepted — it is strictly less exposure than a table-wide read policy, and it matches the pattern already in the schema.

**Note on symmetry:** the same gap existed on the buyer side. `buyer_profile_read` gated on `is_listed` alone, so a suspended-but-listed buyer stayed visible in the seller-facing directory and in its facet counts, while a suspended seller's assets correctly vanished. F4 is a symmetric requirement that had been implemented on one side only; migration `20260819140000` closes it by adding a role-neutral `is_active(uid)` overload on the same `security definer` convention.