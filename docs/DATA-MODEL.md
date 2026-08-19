# N5Deal Prototype — Data Model

Schema, access policies and invariants. Implements D1–D6 from `PRD.md` and ADR-2, ADR-9, ADR-10, ADR-11, ADR-15 from `ARCHITECTURE.md`.

Target: Postgres 15 (Supabase). All monetary values are `bigint` cents (ADR-4).

---

## 1. The central structural idea

Both roles have their profile split across **two tables** — one public and anonymous, one private and identifying.

| Table | Contents | Readable by |
|---|---|---|
| `buyer_profiles` | mandate: investor type, categories, jurisdictions, ticket range, headline | all authenticated |
| `buyer_identities` | company name, website, contact person | owner, MANAGER, counterparty with an ACCEPTED conversation |
| `seller_profiles` | trading profile: headline, jurisdiction, description, verified flag | all authenticated |
| `seller_identities` | company name, website, contact person, registration number | owner, MANAGER, counterparty with an ACCEPTED conversation |

**Why the split rather than a view.** RLS filters rows, not columns. Granting a counterparty read access to a profile row means they can query the table directly and retrieve every column — a view over the same table hides nothing. A view with `security_invoker = true` inherits exactly that policy; without it, the view bypasses RLS entirely and is flagged by Supabase's security linter.

**Why symmetric.** One rule — accepted means mutually visible — expressed as two mirror-image policies over the same predicate. The asymmetric alternative needs two disclosure paths and a special case for whichever party initiated (ADR-10).

**UI consequence.** Directories and listings render from the `_profiles` tables and are always anonymous. Identity is a separate query that returns rows only where RLS permits — no `if (accepted)` conditionals in React components.

---

## 2. Enums

```sql
create type user_role           as enum ('BUYER','SELLER','MANAGER');
create type account_status      as enum ('ACTIVE','SUSPENDED');
create type asset_status        as enum ('DRAFT','PUBLISHED','SUSPENDED','SOLD');
create type conversation_status as enum ('PENDING','ACCEPTED','DECLINED');
create type deal_type           as enum ('FULL_ACQUISITION','MAJORITY_STAKE','MINORITY_STAKE','ASSET_DEAL');
create type investor_type       as enum ('PE_FUND','STRATEGIC','FAMILY_OFFICE','SEARCH_FUND','ANGEL');
create type asset_category      as enum ('BANK','FINTECH','PAYMENT','EMI','CRYPTO','OTHER');
create type moderation_action   as enum ('SUSPEND','REACTIVATE','SUSPEND_ASSET','REPUBLISH_ASSET');
```

`asset_category` borrows the reference marketplace's vocabulary (D6). Jurisdictions are ISO-3166 alpha-2 codes with a lookup in application code, not a table — at 35 assets, normalisation adds joins without adding capability. At scale both become lookup tables with M2M relations.

---

## 3. Tables

### 3.1 `profiles` — shared core

```sql
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         user_role      not null,
  status       account_status not null default 'ACTIVE',
  display_name text           not null,
  locale       text           not null default 'en',
  created_at   timestamptz    not null default now()
);
```

`display_name` is a non-identifying handle used in threads before acceptance (`Seller #12`, `Buyer #04`), never a company name.

Role is duplicated into `auth.users.raw_app_meta_data.role` at signup (ADR-9), making it available to policies via JWT without a subquery.

> **Known edge case.** JWTs are cached until refresh (~1 hour). A suspended user may hold a token with stale claims, which is why `status` is **not** mirrored into the JWT — write policies check it via `public.is_active()`, which reads the table. Suspension takes effect immediately.

### 3.2 `seller_profiles` — public trading profile

```sql
create table seller_profiles (
  user_id      uuid primary key references profiles(id) on delete cascade,
  headline     text not null,          -- "Owner-operator, two payment businesses"
  jurisdiction text not null,          -- ISO alpha-2
  description  text,
  verified     boolean not null default false,
  updated_at   timestamptz not null default now()
);
```

`verified` is a KYC stub (out of scope per PRD §3) and drives the `Validated` badge on listings.

### 3.3 `seller_identities` — protected

```sql
create table seller_identities (
  user_id             uuid primary key references profiles(id) on delete cascade,
  company_name        text not null,
  registration_number text,
  website             text,
  contact_name        text,
  updated_at          timestamptz not null default now()
);
```

### 3.4 `buyer_profiles` — anonymous mandate

```sql
create table buyer_profiles (
  user_id          uuid primary key references profiles(id) on delete cascade,
  headline         text not null,      -- "PE fund focused on payment infrastructure in DACH"
  investor_type    investor_type not null,
  categories       asset_category[] not null default '{}',
  jurisdictions    text[] not null default '{}',
  deal_types       deal_type[] not null default '{}',
  ticket_min_cents bigint,
  ticket_max_cents bigint,
  is_listed        boolean not null default true,  -- directory opt-out
  updated_at       timestamptz not null default now(),
  constraint ticket_range_valid check (
    ticket_min_cents is null or ticket_max_cents is null
    or ticket_min_cents <= ticket_max_cents
  )
);
```

### 3.5 `buyer_identities` — protected

```sql
create table buyer_identities (
  user_id      uuid primary key references profiles(id) on delete cascade,
  company_name text not null,
  website      text,
  contact_name text,
  updated_at   timestamptz not null default now()
);
```

### 3.6 `assets`

```sql
create sequence asset_public_ref_seq start 100;

create table assets (
  id                 uuid primary key default gen_random_uuid(),
  public_ref         int not null unique default nextval('asset_public_ref_seq'),
  seller_id          uuid not null references profiles(id) on delete cascade,
  title              text not null,
  description        text not null,
  category           asset_category not null,
  jurisdiction       text not null,
  deal_type          deal_type not null,
  revenue_cents      bigint,
  ebitda_cents       bigint,
  asking_price_cents bigint,
  employees          int,
  year_founded       int,
  highlights         text[] not null default '{}',   -- "Recurring revenue", "Transferable contracts"
  price_history      jsonb  not null default '[]',   -- [{ "year": 2020, "value_cents": 12000000 }, ...]
  validated          boolean not null default false,
  view_count         int not null default 0,
  status             asset_status not null default 'DRAFT',
  created_at         timestamptz not null default now(),
  published_at       timestamptz,
  constraint year_founded_sane check (year_founded is null or year_founded between 1800 and 2100)
);

create index assets_browse_idx    on assets (status, category, jurisdiction);
create index assets_seller_idx    on assets (seller_id);
create index assets_price_idx     on assets (asking_price_cents);
create unique index assets_ref_idx on assets (public_ref);
```

`public_ref` is the human identifier shown as `Asset #113` and used in URLs (D6). Exposing a sequential integer is acceptable here — the catalogue size is not confidential, and the alternative (a UUID in the URL) is worse for a marketplace people talk about by reference number.

`price_history` holds six annual points for the Market Trend chart (ADR-15). JSONB rather than a child table: the series is always read whole, never queried into, and never updated independently of the asset.

No hard delete (D2). `published_at` is set on the first transition to `PUBLISHED` and drives catalogue ordering.

### 3.7 `conversations`

```sql
create table conversations (
  id           uuid primary key default gen_random_uuid(),
  buyer_id     uuid not null references profiles(id) on delete cascade,
  seller_id    uuid not null references profiles(id) on delete cascade,
  asset_id     uuid references assets(id) on delete set null,
  initiated_by uuid not null references profiles(id),
  status       conversation_status not null default 'PENDING',
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  constraint distinct_parties check (buyer_id <> seller_id)
);

create unique index conversations_unique_pair
  on conversations (buyer_id, seller_id,
                    coalesce(asset_id, '00000000-0000-0000-0000-000000000000'::uuid));

create index conversations_initiator_idx on conversations (initiated_by, status);
```

`asset_id` is nullable with `on delete set null`: a seller-initiated thread (F3) is not tied to an asset, and a withdrawn asset must not take the thread with it.

**Mutual disclosure (ADR-11).** At `ACCEPTED`, each party can read the other's `_identities` row. The rule is identical regardless of who initiated — the two policies in §5 are mirror images.

### 3.8 `messages`

```sql
create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid not null references profiles(id),
  body            text not null,
  created_at      timestamptz not null default now(),
  read_at         timestamptz,
  constraint body_length check (char_length(body) between 1 and 4000)
);

create index messages_thread_idx on messages (conversation_id, created_at);
```

### 3.9 `moderation_log`

```sql
create table moderation_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid not null references profiles(id),
  target_type text not null check (target_type in ('USER','ASSET')),
  target_id   uuid not null,
  action      moderation_action not null,
  reason      text not null check (char_length(reason) >= 10),
  created_at  timestamptz not null default now()
);

create index modlog_target_idx on moderation_log (target_type, target_id, created_at desc);
```

`reason` is mandatory at the database level (D3) — it cannot be skipped by bypassing the UI.

---

## 4. Policy helpers

```sql
create or replace function public.jwt_role() returns text
language sql stable
as $$ select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') $$;

-- security definer to avoid RLS recursion when reading profiles
create or replace function public.is_active() returns boolean
language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from profiles where id = auth.uid() and status = 'ACTIVE'
) $$;

create or replace function public.is_manager() returns boolean
language sql stable
as $$ select public.jwt_role() = 'MANAGER' $$;

-- security definer so the seller-ACTIVE check in assets_read_published is not emptied by
-- profiles' own RLS (ADR-18). Added in migration 20260819130000_fix_read_rls.sql.
create or replace function public.is_seller_active(uid uuid) returns boolean
language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from profiles where id = uid and status = 'ACTIVE'
) $$;
```

---

## 5. RLS policies

Enabled on every table: `alter table X enable row level security;`

### profiles
```sql
-- Read scoped to self, manager, or a user you share a conversation with — the anonymous
-- handle (display_name) that /messages renders for a counterparty (ADR-18). Superseded the
-- own-row-only profiles_read_self in migration 20260819130000_fix_read_rls.sql.
create policy profiles_read_scoped on profiles for select
  using (
    id = auth.uid()
    or public.is_manager()
    or exists (
      select 1 from conversations c
      where (c.buyer_id = auth.uid() and c.seller_id = profiles.id)
         or (c.seller_id = auth.uid() and c.buyer_id = profiles.id)
    )
  );

create policy profiles_update_self on profiles for update
  using (id = auth.uid() and public.is_active())
  with check (id = auth.uid() and status = 'ACTIVE');  -- cannot self-edit status/role
```

### Public profile tables
```sql
create policy seller_profile_read on seller_profiles for select
  using (true);

create policy seller_profile_write_own on seller_profiles for all
  using (user_id = auth.uid() and public.is_active())
  with check (user_id = auth.uid() and public.is_active());

create policy buyer_profile_read on buyer_profiles for select
  using (is_listed = true or user_id = auth.uid() or public.is_manager());

create policy buyer_profile_write_own on buyer_profiles for all
  using (user_id = auth.uid() and public.is_active())
  with check (user_id = auth.uid() and public.is_active());
```

### Identity tables — the core of D1

Mirror images. `buyer_identities` opens to the seller side of an accepted thread; `seller_identities` opens to the buyer side.

```sql
create policy buyer_identity_read_own on buyer_identities for select
  using (user_id = auth.uid() or public.is_manager());

create policy buyer_identity_read_accepted on buyer_identities for select
  using (exists (
    select 1 from conversations c
    where c.buyer_id = buyer_identities.user_id
      and c.seller_id = auth.uid()
      and c.status = 'ACCEPTED'
  ));

create policy buyer_identity_write_own on buyer_identities for all
  using (user_id = auth.uid() and public.is_active())
  with check (user_id = auth.uid() and public.is_active());

create policy seller_identity_read_own on seller_identities for select
  using (user_id = auth.uid() or public.is_manager());

create policy seller_identity_read_accepted on seller_identities for select
  using (exists (
    select 1 from conversations c
    where c.seller_id = seller_identities.user_id
      and c.buyer_id = auth.uid()
      and c.status = 'ACCEPTED'
  ));

create policy seller_identity_write_own on seller_identities for all
  using (user_id = auth.uid() and public.is_active())
  with check (user_id = auth.uid() and public.is_active());
```

### assets
```sql
-- The seller-ACTIVE check goes through the security definer is_seller_active() rather than an
-- inline profiles subquery, so it is not emptied by profiles' RLS (ADR-18). Migration
-- 20260819130000_fix_read_rls.sql superseded the inline-subquery version below.
create policy assets_read_published on assets for select
  using (
    (status = 'PUBLISHED' and public.is_seller_active(assets.seller_id))
    or seller_id = auth.uid()
    or public.is_manager()
  );

create policy assets_write_own on assets for all
  using (seller_id = auth.uid() and public.is_active())
  with check (seller_id = auth.uid() and public.is_active());
```

The seller-status check inside `assets_read_published` implements F4: suspending a seller removes their listings from the catalogue with no cascading row updates and no risk of drift.

### conversations / messages
```sql
create policy conv_read_party on conversations for select
  using (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_manager());

create policy conv_insert on conversations for insert
  with check (initiated_by = auth.uid()
              and (buyer_id = auth.uid() or seller_id = auth.uid())
              and public.is_active());

create policy conv_respond on conversations for update
  using ((buyer_id = auth.uid() or seller_id = auth.uid())
         and initiated_by <> auth.uid()
         and public.is_active());

create policy msg_read_party on messages for select
  using (exists (
    select 1 from conversations c
    where c.id = messages.conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid() or public.is_manager())
  ));

create policy msg_insert_accepted on messages for insert
  with check (
    sender_id = auth.uid() and public.is_active()
    and exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
        and (c.status = 'ACCEPTED' or c.initiated_by = auth.uid())
    )
  );
```

The initiator may post one opening message before acceptance; the thread unlocks fully at `ACCEPTED`.

### moderation_log
```sql
create policy modlog_read_manager on moderation_log for select
  using (public.is_manager());
```
Writes happen only through the service role in dedicated Server Actions (ADR-2).

---

## 6. Contact request quota (D5)

Symmetric — the limit applies to whoever initiates, regardless of role.

```sql
create or replace function public.enforce_contact_quota()
returns trigger language plpgsql as $$
declare pending_count int;
begin
  select count(*) into pending_count
    from conversations
   where initiated_by = new.initiated_by and status = 'PENDING';

  if pending_count >= 5 then
    raise exception 'CONTACT_QUOTA_EXCEEDED'
      using errcode = 'P0001',
            hint = 'Participant already has 5 pending contact requests';
  end if;
  return new;
end $$;

create trigger contact_quota_check
  before insert on conversations
  for each row execute function public.enforce_contact_quota();
```

**Why in the database rather than a Server Action.** The quota is a data invariant, not a UI rule. A trigger makes it unviolatable through any path, including future admin scripts. The Server Action catches `CONTACT_QUOTA_EXCEEDED` and translates it into a user-facing message; the UI shows a "3 of 5 requests active" counter *before* the action, so the limit is never a surprise.

The quota is released on `ACCEPTED` or `DECLINED` — it penalises indiscriminate outreach, not activity.

---

## 7. Publication trigger

```sql
create or replace function public.set_published_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'PUBLISHED' and old.status is distinct from 'PUBLISHED'
     and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end $$;

create trigger assets_published_at
  before update on assets
  for each row execute function public.set_published_at();
```

---

## 8. Demo data

| Entity | Count | Notes |
|---|---|---|
| Sellers | 12 | 2 suspended (F4); all have both profile and identity rows |
| Buyers | 20 | 1 suspended, 3 with `is_listed = false` |
| Assets | 35 | 28 PUBLISHED, 4 DRAFT, 2 SUSPENDED, 1 SOLD; 20 `validated` |
| Conversations | 14 | 9 PENDING, **4 ACCEPTED**, 1 DECLINED |
| Messages | 32 | across 13 threads — every PENDING thread carries its initiator's one opening message |
| Moderation log | 4 | one of each action |

Content is realistic European M&A across the reference's categories — Bank, Fintech, Payment, EMI, Crypto — in DE, PL, NL, ES, UA, CZ, SE, MT, IE, with tickets from €200k to €40M. `price_history` gets six annual points per asset with plausible drift, so no two charts look alike.

**Three seed requirements are load-bearing, not cosmetic:**

1. **At least four `ACCEPTED` threads spread across the demo accounts.** A reviewer signing in must see anonymous listings and revealed counterparties in the same session. Without that contrast, D1 reads as missing data rather than as a mechanism.
2. **One participant at exactly 5 pending outbound requests**, so the quota is demonstrable without setup.
3. **Both `/login` role-button accounts carry a PENDING thread as well.** `buyer01` holds two (p7, p8) beside its ACCEPTED one so the anonymous-vs-revealed contrast is on the first screen after clicking "Buyer"; `seller01` holds an incoming one (p9) so clicking "Seller" lands on a dashboard with something to accept or decline. Without these, the two default paths show only half the mechanism.

Seeding runs through the service role, bypassing RLS.

---

## 9. Invariants (test targets)

1. A seller with no ACCEPTED thread receives zero rows from `buyer_identities`.
2. A buyer with no ACCEPTED thread receives zero rows from `seller_identities`.
3. Accepting a thread makes both identity rows readable in the same transaction — disclosure is simultaneous.
4. Suspending a seller removes their PUBLISHED assets from the catalogue while leaving them visible to the seller and to managers.
5. A suspended user cannot perform any INSERT or UPDATE (`is_active()` guard on writes).
6. A sixth pending request from one initiator fails with `CONTACT_QUOTA_EXCEEDED`, for both roles.
7. `moderation_log` rejects a reason shorter than 10 characters.
8. `ticket_min_cents > ticket_max_cents` is rejected by the check constraint.
9. `public_ref` is unique and stable across an asset's status transitions.

---

## 10. What would change at real scale

- `categories` / `jurisdictions` → normalised lookup tables with M2M relations and GIN indexes
- text search → Postgres FTS with a maintained `tsvector` column, replacing `ilike` (ADR-13)
- `price_history` → a time-series child table once points become individually queryable
- `conversations` → a participants table instead of a fixed `buyer_id`/`seller_id` pair, for multiple users per company
- quota → configurable per plan rather than a hardcoded 5
- `public_ref` → non-sequential, once catalogue size becomes commercially sensitive
