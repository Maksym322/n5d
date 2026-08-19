-- Enums and sequences (DATA-MODEL.md §2, §3.6)
-- 8 enums borrowing the reference marketplace vocabulary for asset_category (D6).

create type user_role           as enum ('BUYER','SELLER','MANAGER');
create type account_status      as enum ('ACTIVE','SUSPENDED');
create type asset_status        as enum ('DRAFT','PUBLISHED','SUSPENDED','SOLD');
create type conversation_status as enum ('PENDING','ACCEPTED','DECLINED');
create type deal_type           as enum ('FULL_ACQUISITION','MAJORITY_STAKE','MINORITY_STAKE','ASSET_DEAL');
create type investor_type       as enum ('PE_FUND','STRATEGIC','FAMILY_OFFICE','SEARCH_FUND','ANGEL');
create type asset_category      as enum ('BANK','FINTECH','PAYMENT','EMI','CRYPTO','OTHER');
create type moderation_action   as enum ('SUSPEND','REACTIVATE','SUSPEND_ASSET','REPUBLISH_ASSET');

-- Human-readable asset identifier ("Asset #793"), shown in UI and URLs (D6).
create sequence asset_public_ref_seq start 100;
