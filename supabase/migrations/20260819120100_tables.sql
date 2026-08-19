-- Tables (DATA-MODEL.md §3). Money is bigint cents everywhere (ADR-4).
-- No hard delete anywhere (D2). RLS enabled on every table at the end of this file.

-- §3.1 profiles — shared core
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         user_role      not null,
  status       account_status not null default 'ACTIVE',
  display_name text           not null,
  locale       text           not null default 'en',
  created_at   timestamptz    not null default now()
);

-- §3.2 seller_profiles — public trading profile
create table seller_profiles (
  user_id      uuid primary key references profiles(id) on delete cascade,
  headline     text not null,
  jurisdiction text not null,
  description  text,
  verified     boolean not null default false,
  updated_at   timestamptz not null default now()
);

-- §3.3 seller_identities — protected
create table seller_identities (
  user_id             uuid primary key references profiles(id) on delete cascade,
  company_name        text not null,
  registration_number text,
  website             text,
  contact_name        text,
  updated_at          timestamptz not null default now()
);

-- §3.4 buyer_profiles — anonymous mandate
create table buyer_profiles (
  user_id          uuid primary key references profiles(id) on delete cascade,
  headline         text not null,
  investor_type    investor_type not null,
  categories       asset_category[] not null default '{}',
  jurisdictions    text[] not null default '{}',
  deal_types       deal_type[] not null default '{}',
  ticket_min_cents bigint,
  ticket_max_cents bigint,
  is_listed        boolean not null default true,
  updated_at       timestamptz not null default now(),
  constraint ticket_range_valid check (
    ticket_min_cents is null or ticket_max_cents is null
    or ticket_min_cents <= ticket_max_cents
  )
);

-- §3.5 buyer_identities — protected
create table buyer_identities (
  user_id      uuid primary key references profiles(id) on delete cascade,
  company_name text not null,
  website      text,
  contact_name text,
  updated_at   timestamptz not null default now()
);

-- §3.6 assets
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
  highlights         text[] not null default '{}',
  price_history      jsonb  not null default '[]',
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

-- §3.7 conversations
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

-- §3.8 messages
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

-- §3.9 moderation_log
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

-- RLS enabled on every table (DATA-MODEL.md §5). Policies added in the policies migration.
alter table profiles          enable row level security;
alter table seller_profiles   enable row level security;
alter table seller_identities enable row level security;
alter table buyer_profiles    enable row level security;
alter table buyer_identities  enable row level security;
alter table assets            enable row level security;
alter table conversations     enable row level security;
alter table messages          enable row level security;
alter table moderation_log    enable row level security;
