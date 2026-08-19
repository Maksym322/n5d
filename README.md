# N5Deal Marketplace — Prototype

**Live demo:** `<[fill in after deploy](https://n5-gamma.vercel.app/)>` · **Repository:** `<fill in>`

A confidential M&A marketplace connecting business owners (**Sellers**) with investors (**Buyers**) under a **Platform Manager**. Its defining constraint is that **confidentiality runs in both directions**: neither side is identified until a contact request is *accepted*, at which point *both* identities are revealed at once. Every structural decision follows from that.

The long-form source of truth lives in `docs/`:
[`PRD.md`](docs/PRD.md) (product) · [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) (ADRs) · [`DATA-MODEL.md`](docs/DATA-MODEL.md) (schema + RLS) · [`design-audit.md`](docs/design-audit.md) (the audited reference UI). This README is the 10-minute tour; the docs are the reference.

**Stack:** Next.js 16 (App Router) · TypeScript strict · Supabase (`@supabase/ssr`, Postgres + Auth + RLS) · Tailwind v4 · in-house UI primitives (no component library) · next-intl (EN/UK) · Gemini (`@google/genai`, natural-language search only) · Vitest · Playwright. Package manager: **npm**.

---

## Quick start

```bash
git clone <repo-url> n5deal-marketplace
cd n5deal-marketplace
npm install
```

### 1. Environment variables

Create **`.env.local`** at the repo root (gitignored — never commit it):

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
DEMO_ACCOUNT_PASSWORD=<choose one shared password for all demo accounts>
GEMINI_API_KEY=<optional — enables natural-language search>
```

| Variable | Where it comes from | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase: **Project Settings → Data API → Project URL** | Public; used by browser, server, `proxy.ts`, and the seed. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase: **Project Settings → API Keys → publishable** (`sb_publishable_…`) | Public; every RLS-gated request runs under this key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase: **Project Settings → API Keys → secret** (`sb_secret_…`) | **Server-only, bypasses RLS.** Used in exactly two places — the seed and `actions/moderation.ts` (ADR-2). `lib/supabase/admin.ts` is `import "server-only"`, so it can never reach the client. |
| `DEMO_ACCOUNT_PASSWORD` | You choose it | The passwordless `/login` switcher and the seed both sign in with this single shared password. **The seed fails loudly if it is unset.** For a deployed build it must equal the value used when that project was seeded. |
| `GEMINI_API_KEY` | **Optional.** [Google AI Studio](https://aistudio.google.com/apikey) — not a Supabase key | **Server-only.** Enables natural-language search on `/assets`. Leave it out and the search box behaves exactly as it otherwise would, silently falling back to the `ilike` text search (ADR-6) — nothing errors and nothing is hidden. |

> **Don't put a space after `=`.** dotenv keeps a leading space as part of the value (`KEY= foo` → `" foo"`), which will silently break the Supabase URL and keys. Write `KEY=foo`.

Applying the schema with the Supabase CLI needs a second file, **`.env.cli.local`** (CLI only, kept out of the app env deliberately):

```dotenv
SUPABASE_ACCESS_TOKEN=sbp_...        # dashboard → Account → Access Tokens
SUPABASE_DB_PASSWORD=<db password>   # Project Settings → Database → Database password
```

### 2. Apply the schema

Migrations live in `supabase/migrations/` (append-only). Apply them to your Supabase project:

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Generated types (`lib/types/database.ts`) are **already committed**; regenerate only after a schema change with `npx supabase gen types typescript --linked > lib/types/database.ts`.

### 3. Seed demo data

```bash
npm run seed          # idempotent — safe to run repeatedly
# npm run seed:reset  # force every seeded row back to its fixture state, then re-seed
```

The seed reads `.env.local`, creates the demo auth users with `DEMO_ACCOUNT_PASSWORD`, and populates the tables. It requires `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `DEMO_ACCOUNT_PASSWORD`.

### 4. Run

```bash
npm run dev           # http://localhost:3000  →  visit /login
```

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build (`next build`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright (run `npx playwright install chromium` once first) |
| `npm run seed` / `npm run seed:reset` | Seed / reset-and-reseed demo data |

Quality gate used throughout: `npm run typecheck && npm run lint && npm test`.

---

## Demo accounts

There is **no password to type**. Open **`/login`** and either click one of the three **role buttons** — Buyer / Seller / Manager — or expand the **account picker** to sign into any specific seeded account by email.

All accounts share `DEMO_ACCOUNT_PASSWORD`. The roster is a single source of truth in `lib/demo-accounts.ts`, consumed by the login page, the auth actions, and the seed, so it cannot drift.

**Accounts worth trying** — each demonstrates one mechanism in a single click:

| Account | What it shows |
|---|---|
| `buyer01@example.com` | Baseline buyer. Has an **ACCEPTED** thread and two **PENDING** ones, so you see anonymous listings, anonymous pending threads *and* a revealed counterparty in the same session. |
| `buyer05@example.com` | **At the 5-pending-request quota limit.** The contact panel shows "5 of 5 requests active" and blocks a sixth. |
| `seller11@example.com` | **Suspended (F4).** Its published listings are gone from the public catalogue, yet remain visible to the seller and the manager. |
| `buyer17@example.com` | **Directory opt-out** (`is_listed = false`). Absent from the seller-facing buyer directory, but can still initiate contact. |
| `buyer20@example.com` | **Suspended (F5).** Signs in to a read-only interface with a banner; every mutation is refused. |
| `seller01@example.com` | Seller side: dashboard, an incoming request to accept/decline, and the anonymised buyer directory. |
| `manager01@example.com` | Manager registry across Buyers/Sellers/Assets, suspend/reactivate with a mandatory reason, and the moderation audit log. |

**Seed density** (enough for filters to be meaningful): 12 sellers (2 suspended), 20 buyers (1 suspended, 3 directory opt-outs), 35 assets (28 published, 4 draft, 2 suspended, 1 sold; 20 validated), 14 conversations of which **4 are ACCEPTED**, 32 messages, and 4 moderation-log entries (one of each action).

**The fastest way to see the product idea:** sign in as `buyer01` and open `/messages`. Anonymous pending threads and a revealed accepted counterparty sit in the same list.

---

## What is built — mapped to the five brief flows (F1–F5)

All five flows work end-to-end on the seeded database.

- **F1 — Buyer contacts a Seller.** `/profile` maintains the mandate; `/assets` is the catalogue with faceted filters, natural-language and free-text search, category pills carrying live result counts, removable filter chips, and pagination — all driven by URL search params. `/assets/[ref]` opens a listing (human `Asset #NNN`, two-row attribute grid, inline-SVG trend chart) and its contact panel, which shows the quota counter before sending. Contact is created by `actions/conversations.ts`.
- **F2 — Seller publishes → accepts → both revealed → they message.** `/seller/assets/new` and `/seller/assets/[ref]/edit` run the `DRAFT → PUBLISHED` flow. `/seller` lists incoming requests; accept/decline runs through `actions/conversations.ts`. Acceptance unlocks both `_identities` rows via RLS, and `/messages/[id]` is the thread.
- **F3 — Seller browses anonymised Buyers → contacts one.** `/seller/buyers` is the anonymised directory (`PE fund · €2–5M · Germany · Fintech`, never a company name) with mandate-fit filters; `/seller/buyers/[id]` initiates contact. Disclosure on acceptance is identical to F1 — the same rule, mirror-image policies.
- **F4 — Manager moderates.** `/admin/{buyers,sellers,assets}` is the unified registry with search and filters; a detail page suspends or reactivates with a mandatory ≥10-character reason (`actions/moderation.ts`, the one service-role mutation channel). Suspending a seller drops their listings from the public catalogue with no cascading updates, and the action lands in `/admin/log`.
- **F5 — Suspended user is read-only.** A suspended sign-in sees a banner and every mutation is refused at the database by the `is_active()` guard on writes — status is deliberately *not* cached in the JWT, so suspension takes effect immediately (ADR-9), not at the next token refresh.

### AI features

**Natural-language search — built.** A query typed into the catalogue search box goes to a fast model (`gemini-2.0-flash`) whose response schema carries this database's own enum values, so it cannot return a category, deal type or jurisdiction that does not exist. What comes back is validated again against those enums before it is used — a schema constrains shape, not whether a value is real here — and the surviving filters are written to the URL and applied by the ordinary catalogue query. They render as removable chips above the results, so the interpretation is visible and one click corrects it; a query reinterpreted silently would be worse than no interpretation at all. With no API key, a failed call, or output that survives neither check, the box falls back to the plain `ilike` search with nothing shown to the user. That path is the default: the app was developed and its end-to-end suite runs with no key set.

**Match score — not implemented.** The deterministic mandate↔asset overlap it would wrap exists in `lib/db/`; the model-generated rationale on top of it is descoped (ADR-6).

Bilateral anonymity is enforced by the **schema and RLS**, never by `if (accepted)` conditionals in components: public/anonymous data and private identity data live in separate tables (`buyer_profiles`/`buyer_identities`, `seller_profiles`/`seller_identities`), and an identity row is readable only by its owner, a manager, or a counterparty holding an ACCEPTED conversation (ADR-10).

---

## Edge cases handled deliberately

Cases the brief does not name, each falling out of the model rather than being special-cased in the UI:

- **Suspending a seller** removes their published listings from the catalogue with no cascading writes — the policy checks the seller's status, so nothing needs updating.
- **A suspended buyer** disappears from the seller-facing directory *and* from its facet counts, not just from the detail page. The two sides of that rule were implemented at different times; see ADR-18's closing note.
- **A directory opt-out** (`is_listed = false`) hides a buyer from browsing while leaving them able to initiate contact — outbound and inbound visibility are separate concerns.
- **A withdrawn asset** keeps its conversation threads readable; nothing is hard-deleted (`on delete set null`).
- **A saved link to a now-hidden buyer** returns `notFound()` rather than an empty shell.
- **Facet counts** are recomputed against the active filter set, so a pill never promises results a click cannot deliver.
- **Searching `Asset #113`** matches the reference, not just the description text — the ref is the only identifier a user ever sees.
- **An invalid ticket range** (`min > max`) is rejected by a database `CHECK`, not only by client validation.
- **A too-short moderation reason** surfaces as a form error, not a crash — the disabled button is UX, the Server Action's zod `.min(10)` is the guarantee, and the database `CHECK` is the backstop behind it.
- **Empty filter results** name which facet to widen rather than showing a bare "no results".

---

## Deliberately out of scope

Scoping is itself a decision — a 24-hour prototype that touched everything would demonstrate nothing well. Excluded on purpose (PRD §3), each because it adds surface without exercising the marketplace's core idea:

actual transactions, escrow, payments; KYC/AML (stubbed as a `seller_profiles.verified` flag, surfaced only in the manager registry); document handling (teasers, NDAs, data rooms); email and push notifications; teams or multiple users per company; deal-pipeline stages beyond first contact; saved assets and favourites; a Partner role (present in the reference nav, absent from the brief); public unauthenticated browsing; monetisation and plan tiers.

**One of the two AI features is not implemented — stated plainly.** PRD §2 specifies *natural-language search* and a *match score* (a deterministic mandate↔asset overlap with a one-sentence model-generated rationale), each designed to **degrade to deterministic behaviour with no API key**. Natural-language search is built, fallback included — see *AI features* above. The match-score rationale is not: the deterministic overlap ranking it would wrap already exists in `lib/db/`, and **no flow depends on the model-generated sentence on top of it**, so it was the half that stayed descoped under the time budget.

---

## Known limitations

Things that work but are not finished, listed because knowing where the edges are is part of the work:

- **`view_count` is display-only.** Incrementing it from a buyer's session needs a `security definer` RPC — that is a migration, and papering over it with the service role would violate ADR-2. Left honest rather than faked.
- **Creating a contact request is two round-trips** (conversation insert, then the opening message) with no transaction, because PostgREST cannot express one without an RPC. A failed second write would leave a bare pending thread. Acceptable at prototype scale; the clean fix is a `create_contact_request(...)` RPC.
- **RLS policies are verified manually, not by automated tests** (ADR-14). The invariants are enumerated in `DATA-MODEL.md` §9 and were each checked against the live database; asserting them in CI needs a dedicated instance and several authenticated identities.
- **Message threads do not live-update.** Supabase Realtime is available and unused (ADR-1).
- **Natural-language search is one-shot.** The query is interpreted once, with no clarification round-trip: if the reading is wrong, the correction is removing a chip and searching again, not a conversation. There is also no rate limiting on the interpretation action beyond a signed-in session and a 200-character cap, and terms the model maps to a value this database does not have are dropped silently rather than reported.
- **Match score remains descoped** (ADR-6) — the deterministic overlap exists in `lib/db/`, the model-generated rationale does not.
- **One shared Supabase project serves dev and prod** (ADR-7), so seeding touches live data.

---

## Key technical decisions

The seven that matter most, each with the alternative rejected. `docs/ARCHITECTURE.md` is the long version (ADR numbers in brackets).

1. **RLS is the security layer; the service role is a narrow audited channel** *(ADR-2)* — rejected role checks inside actions with a service role for everything, and "RLS for everything including moderation" (a `manager sees all` subquery on every policy is slow and fragile). All ordinary reads and writes run under the anon key with RLS; the secret key appears only in the seed and `actions/moderation.ts`, each writing an audit-log row.
2. **Bilateral confidentiality via a table split, applied symmetrically** *(ADR-10)* — rejected a `security_invoker` view (RLS filters rows, not columns: grant the row and every column leaks) and an asymmetric "hide buyers only" design (two disclosure paths, a special case for the initiator). Public versus identity tables put the boundary in the schema; one rule — accepted means mutually visible — as two mirror-image policies.
3. **Money as `bigint` cents** *(ADR-4)* — rejected floats outright (a red flag in a financial product) and `numeric` on index cost for the dominant range-filter query. Formatted only at the presentation boundary (`lib/format.ts`).
4. **Filter, search, sort and pagination in URL search params** *(ADR-3)* — rejected client state. Shareable filtered links are a real marketplace use case, and Server Components read params directly with no client state layer.
5. **Database access only through `lib/db/*.ts`** *(ADR-5)* — rejected calling Supabase from components. One place applies the anonymised projections, one seam for tests. A component cannot leak an identity it was never handed.
6. **Role in the JWT, status read live from the table** *(ADR-9)* — rejected caching both in the JWT and putting both only in `profiles`. Role is effectively immutable and free to cache; status is not — a cached-status token would let a suspended user act for up to an hour, so writes check `is_active()` against the table for immediate effect.
7. **In-house UI primitives, not a component library** *(ADR-17)* — rejected shadcn/ui with Radix, cva, tailwind-merge and lucide. The distinctive surfaces (full-width listing row, attribute grid, inline-SVG chart) are bespoke regardless; the rest is a handful of native form controls on the Tailwind `@theme` tokens — not worth the dependency surface at this scope.

Two more worth a line: **`ilike` over full-text search** at 35 rows (ADR-13) — now the fallback path under natural-language search rather than the only one — and **facet counts recomputed against the active filter set** (ADR-16).

---

## Assumptions made

- **Authentication is real; registration is not.** Supabase Auth, JWT, httpOnly cookie sessions, and RLS policies reading `auth.uid()` — the confidentiality model depends on all of it. What is deliberately absent is signup: demo accounts are pre-seeded and signed into via a role switcher with a shared env-provided password, so a reviewer moves between the three roles in one click instead of registering three accounts. In production this becomes ordinary signup with email verification plus SSO; nothing in the data model or the policies changes, because role and status already live in `profiles` and `app_metadata`.
- **Jurisdictions are ISO-3166 alpha-2 codes** with a lookup in application code (`lib/jurisdictions.ts`), not a table — at 35 assets, normalisation adds joins without adding capability.
- **A sequential `public_ref` (`Asset #113`) is acceptable** in the UI and URLs — catalogue size is not confidential, and people in this market talk about listings by reference number.
- **A single Supabase project serves both dev and prod** *(ADR-7)* — no environment separation and no fast `db reset` loop, accepted over a Docker/WSL2 setup that would not repay itself in the budget.
- **`verified` is a KYC stub** — a boolean on `seller_profiles`, surfaced only in the manager registry, standing in for the out-of-scope KYC/AML flow. It is a separate column from `assets.validated`, which is what drives the `Validated` badge on a listing.
- **A single opening message is allowed before acceptance** — accepting a blank request means deciding on no information (ADR-11).

---

## AI tools used, and how

*This section is about the tools used to **build** the project. For the model the product itself calls at runtime, see [AI features](#ai-features) above.*

This was a **single-agent build**. **Claude Code (Opus)** wrote effectively all of the code on one branch — schema, RLS and triggers, the seed, `lib/db`, the Server Actions, the pages and components, i18n and the tests. **Antigravity was used only in the specification phase**, to inspect the reference marketplace and produce `docs/design-audit.md`; it wrote none of the application code.

**My role was specification, decision and review.** The PRD and the ADRs were drafted in dialogue with an LLM, but the decisions they record are mine — bilateral rather than one-sided anonymity, the contact-request quota as a marketplace-health mechanism, RLS as the security layer rather than an ORM with checks in application code, and each of the scoping calls above. I reviewed the diffs, which is where the following were caught:

- **RLS recursion in `assets_read_published` — 0 of 28 assets visible to buyers.** The policy checked the seller's status with an inline `exists (select 1 from profiles …)` subquery. That subquery ran under `profiles`' own row-only RLS and returned nothing for *other* sellers, so **every** published listing was invisible to a buyer, and the counterparty handle in `/messages` came back null. Fixed with a `security definer` helper and a scoped `profiles` read policy — the same trick `is_active()` already used (ADR-18).
- **One-sided conversation query hid threads from sellers.** The thread list filtered on `buyer_id` only, so a seller saw none of their own conversations. The schema was symmetric; the query was not. Fixed to a two-sided filter with the counterparty projected from whichever identity table applies.
- **A disabled button masquerading as a guarantee.** Moderation leaned on a disabled Suspend button to enforce the ≥10-character reason, so the server-side path was unreachable. The F4 end-to-end test drove a too-short reason and forced the guarantee off the button and onto the server: zod `.min(10)` at the Server Action boundary rejects it first, with the database `CHECK` as the backstop, both surfacing as the same form error.
- **Documentation drifting from the schema.** A doc count claimed 10 tables against 9 in the schema; seed counts in `DATA-MODEL.md` §8 fell out of step with what the seed actually produced. Both reconciled — a spec that contradicts the code is worse than no spec.

The pattern is consistent: the agent produced plausible code quickly, and the non-obvious failures were nearly all at the RLS boundary, where *plausible* and *correct* diverge silently. None were caught by the type checker. They were caught by reading policies and by two end-to-end tests written from the right vantage point — the F4 test only worked once it made its assertion from a buyer's session rather than the manager's, because a manager sees every row and would have reported success on a broken feature.

---

## What I'd improve with more time

- **Build the match score** against the deterministic overlap ranking already in `lib/db/`, the way natural-language search was built against the filters — and give search a clarification round-trip, so a misread query can be corrected in words rather than only by removing a chip.
- **RLS policy tests** under several authenticated identities against a dedicated instance — the invariants in `DATA-MODEL.md` §9 are verified manually and explicitly outside the automated suite today (ADR-14).
- **Split dev and prod Supabase projects** with migrations promoted between them (ADR-7).
- **Full-text search** with a maintained `tsvector` column once the catalogue outgrows `ilike` (ADR-13), and normalised category and jurisdiction lookup tables at the same scale.
- **Live threads** via Supabase Realtime, and a `create_contact_request` RPC to make contact creation atomic.

---

## Deployment

See **[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)** for the exact Vercel steps, every environment variable to set (including `DEMO_ACCOUNT_PASSWORD`), and the production foot-guns.

## Migrations

Append-only in `supabase/migrations/`. Never edit an applied migration file. Policies and triggers are written to be re-runnable (`drop … if exists` before each `create`). Regenerate `lib/types/database.ts` after any schema change.
