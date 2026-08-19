# N5Deal Prototype — Product Requirements

## 1. Problem framing

An M&A marketplace connects business owners (Sellers) with investors (Buyers) under platform supervision (Platform Manager).

What separates this from a generic marketplace is that **confidentiality runs in both directions**. A seller whose business is publicly for sale loses staff, customers and negotiating position before a deal is anywhere near closing. A buyer publishing their acquisition mandate is telling competitors exactly where they are looking. Neither side can transact in the open, yet both need to be discoverable. Every product decision below follows from that constraint.

## 2. Scope

### Buyer
- sign up / sign in, maintain a company profile
- define an investment mandate: investor type, categories, jurisdictions, ticket range, deal types
- browse published assets with faceted filters and free-text search
- initiate contact with a Seller, which opens a message thread
- opt out of the buyer directory entirely

### Seller
- maintain a company profile, split into a public trading identity and a private legal identity
- publish assets through a draft → published flow
- browse Buyers in anonymised form
- filter Buyers by mandate fit
- respond to incoming contact requests

### Platform Manager
- unified registry of Buyers, Sellers and Assets
- search and filter across all three
- suspend / reactivate participants and assets, reason mandatory
- moderation audit log

### AI features
- **natural-language search** — a free-text query is translated into structured filters; applied filters render as editable chips so the user sees and can correct the interpretation
- **match score** — deterministic score from mandate ↔ asset overlap (category, jurisdiction, ticket range, deal type), with a one-sentence model-generated rationale cached in the database
- both degrade to deterministic behaviour with no API key present, so the demo works for a reviewer without credentials

### Internationalisation
- EN + UK interface via `next-intl`, locale stored per user profile

## 3. Explicitly out of scope

- actual transactions, escrow, payments
- KYC/AML verification (stubbed as a `verified` flag)
- document handling: teasers, NDAs, data rooms
- email / push notifications
- teams and multiple users per company account
- deal pipeline stages beyond first contact (LOI, due diligence, closing)
- saved assets / favourites (the reference shows a counter; the feature is not required by the brief)
- a Partner role (present in the reference navigation, absent from the brief)
- public unauthenticated browsing — all listings require an account
- monetisation and plan tiers

Scoping these out is itself the decision. A 24-hour prototype touching all of them would demonstrate nothing well.

## 4. Key product decisions

### D1. Confidentiality is bilateral and disclosure is mutual

Neither side is identified before contact is accepted.

- A listing shows `Asset #793` — jurisdiction, category, financials, deal type — never the seller's company name.
- The buyer directory shows `PE fund · €2–5M · DACH · Fintech` — never the buyer's company name.
- When a contact request reaches `ACCEPTED`, **both** identities are revealed simultaneously.

**Why:** the seller's exposure is immediate and operational — staff and customers learn the business is for sale. The buyer's exposure is strategic — competitors learn their mandate. Protecting one side and not the other would be arbitrary, and asymmetric disclosure is harder both to implement and to explain: it needs two code paths, two projections, and a special case for whichever party initiated.

Mutual disclosure gives one rule — *accepted means visible, in both directions* — and it makes acceptance meaningful. Before it, neither party knows the other. The reference marketplace behaves the same way: its listings carry an asset ID and a flag, never a vendor name.

**Implementation consequence:** enforced by the schema and RLS (see `DATA-MODEL.md` §1), never by conditionals in UI components.

### D2. Assets have status, not existence
`DRAFT → PUBLISHED → (SUSPENDED | SOLD)`. No hard delete anywhere.

**Why:** a thread must stay readable after the asset it referenced is withdrawn, and moderation must be reversible. Deleting rows makes both impossible.

### D3. Moderation is suspension with a reason, never deletion
Every manager action writes to `moderation_log` with a reason of at least 10 characters, enforced by a database constraint.

**Why:** decisions must be reversible and attributable. A reason field the UI can skip is not a reason field.

### D4. Contact is a thread, not a contact form
A one-way "send message" form does not exercise the two-sided flow that is the point of a marketplace.

### D5. Contact requests are rate-limited by quota
Any participant may hold at most **5 pending** outbound contact requests. The quota frees up on acceptance or decline.

**Why:** unsolicited volume is a real failure mode in M&A marketplaces and degrades trust faster than almost anything else. A cap turns contact from a free action into a scarce one, raising the quality of each request. Combined with D1 it produces a coherent posture: nobody is visible until an exchange is agreed, and nobody can request an exchange indiscriminately.

Applying the same limit to both roles rather than to buyers only keeps the rule symmetric with D1 and reduces it to a single trigger.

**Implementation consequence:** enforced by a database trigger — it is a data invariant, not a UI rule. The UI shows the counter *before* the action, so the limit is never a surprise.

### D6. Visual consistency with the reference marketplace
The reference was audited directly (`docs/design-audit.md`) rather than approximated. Adopted:

- listings as **full-width horizontal rows**, not a card grid — four per screen
- human-readable `Asset #793` identifier instead of a UUID, in the UI and in URLs
- a two-row attribute grid with hairline dividers; asking price large and in the accent colour, right-aligned
- a `Market Trend` line chart per listing — 6 annual points, both axes labelled, ~250×150
- a `Validated` badge on vetted listings
- category facets as pill buttons carrying result counts, e.g. `Fintech (17)`
- filters behind a `Filters` toggle rather than a permanently open sidebar
- pagination, not infinite scroll
- tokens from the audit: Inter, `#383BFE` accent used for both price and primary buttons, radii 16 / 12 / 100

**Not adopted:** the reference's licensing-specific domain (license type, regulator, permissions). The brief describes "M&A opportunities and financial assets", and a generic M&A model covers it without inventing regulatory detail in front of reviewers who work with it daily. Categories borrow the reference's vocabulary — Bank, Fintech, Payment, EMI, Crypto — which gives recognisability at the cost of one lookup table.

## 5. Primary user flows

These must work end-to-end on the deployed build.

- **F1** — Buyer completes their mandate → filters assets → opens a listing → contacts the Seller
- **F2** — Seller publishes an asset → receives a contact request → accepts → both identities are revealed → they exchange messages
- **F3** — Seller browses anonymised Buyers → filters by mandate → initiates contact → Buyer accepts → both identities are revealed
- **F4** — Manager finds a non-compliant participant → suspends with a reason → their assets leave the public catalogue → the action appears in the audit log
- **F5** — Suspended user signs in → sees a banner → the interface is read-only

**Disclosure is identical in F1 and F3.** Whoever initiates, the counterparty accepts, and acceptance reveals both sides at once. The initiator may send one opening message before acceptance — accepting a blank request with no context would be a decision made on no information — after which the thread unlocks fully.

## 6. Edge cases handled deliberately

- suspended seller → published assets leave the catalogue automatically, no cascading updates
- withdrawn asset referenced by an existing thread → thread stays readable
- buyer with `is_listed = false` → absent from the directory but can still initiate contact
- invalid ticket range (`min > max`) → rejected by a check constraint, not just client validation
- empty filter results → empty state suggesting which facet to widen
- facet counts reflect currently applied filters, not the full catalogue
- message length bounded at the database level

## 7. Success criteria

- all five flows complete on the deployed build without errors
- state survives a refresh (Postgres, not localStorage)
- demo data is dense enough for filters to be meaningful: 35 assets, 20 buyers, 12 sellers
- **at least four seeded threads are `ACCEPTED`**, so a reviewer signing in sees anonymous listings and revealed counterparties side by side within seconds — without this contrast, D1 reads as missing data rather than as a mechanism
- one seeded participant sits at the quota limit so D5 is visible without setup
- automated tests pass: unit coverage of the pure logic — filters, facet counts, money formatting, chart geometry and natural-language search narrowing — plus end-to-end scenarios for all four flow groups. Match scoring is not covered because that feature is descoped (ADR-6), and permissions are not, because they are RLS and asserting them properly needs a dedicated instance under several identities (ADR-14); the RLS invariants are listed in `DATA-MODEL.md` §9 and were verified manually
- deployed URL reachable with documented demo accounts for all three roles
- UI available in EN and UK with no hardcoded strings on in-scope pages
