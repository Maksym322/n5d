-- Fix reads that were being emptied by RLS subqueries against a privately-scoped table (ADR-18).
--
-- Two read paths referenced `profiles` from inside a policy's USING expression:
--   * assets_read_published — its seller-ACTIVE check, and
--   * every /messages counterparty read (the anonymous handle lives in profiles).
-- Those subqueries run under profiles' own RLS, which (via profiles_read_self) exposed only the
-- caller's own row. The result: a buyer saw 0 published assets and a null counterparty on an
-- ACCEPTED thread. This is the same recursion/visibility trap that is_active() already solves with
-- a SECURITY DEFINER helper; we apply the same convention rather than widening profiles.
--
-- Append-only: this migration supersedes policies from 20260819120300_policies.sql. That file is
-- left untouched; the drop/create statements here define the authoritative later state.

-- 1. Security-definer helper: is a given seller ACTIVE? Bypasses profiles RLS, mirroring is_active().
create or replace function public.is_seller_active(uid uuid) returns boolean
  language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from profiles where id = uid and status = 'ACTIVE'
) $$;

-- 2. assets_read_published: call the helper instead of an inline profiles subquery. A buyer can now
--    see published assets of active sellers; suspending a seller still removes their listings (F4)
--    because the helper returns false for a SUSPENDED seller — no cascading row updates.
drop policy if exists assets_read_published on assets;
create policy assets_read_published on assets for select
  using (
    (status = 'PUBLISHED' and public.is_seller_active(assets.seller_id))
    or seller_id = auth.uid()
    or public.is_manager()
  );

-- 3. profiles read: scope, don't widen. A profiles row is the anonymous handle only (display_name
--    "Seller #12", role, status — identity stays in the protected *_identities tables). It is
--    readable if it is mine, if I am a manager, or if I share a conversation with that user — the
--    counterparty handle that /messages needs. The shared-conversation clause is symmetric, so it
--    also serves a seller reading a buyer's handle. A seller browsing the anonymous buyer directory
--    reads buyer_profiles (already public via is_listed), not profiles, so no wider grant is needed.
drop policy if exists profiles_read_self on profiles;
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
