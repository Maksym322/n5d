-- Gate the anonymous buyer directory on the buyer's account status (F3/F5), symmetric to how
-- assets_read_published gates on the seller's status (ADR-18, migration 20260819130000).
--
-- buyer_profile_read exposed every is_listed = true row to any authenticated user, but it never
-- checked the buyer's account status. A seller cannot read a buyer's profiles.status either
-- (profiles_read_scoped is own-row / manager / shared-conversation only), so a SUSPENDED-but-listed
-- buyer would leak into the directory list, the facet counts and the detail page. This is the same
-- RLS-subquery-emptied trap that is_seller_active() already sidesteps; we add the role-neutral
-- is_active(uid) on the same SECURITY DEFINER convention rather than widening profiles.
--
-- Append-only and idempotent: create-or-replace the function, drop-if-exists then recreate the
-- policy. Supersedes the buyer_profile_read defined in 20260819120300_policies.sql; that file is
-- left untouched.

-- 1. Role-neutral security-definer helper: is a given user ACTIVE? Bypasses profiles RLS.
create or replace function public.is_active(uid uuid) returns boolean
  language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from profiles where id = uid and status = 'ACTIVE'
) $$;

-- 2. buyer_profile_read: a listed buyer is visible only while ACTIVE. Own row and manager reads are
--    unchanged, so a suspended buyer still sees their own mandate and managers still see everyone.
drop policy if exists buyer_profile_read on buyer_profiles;
create policy buyer_profile_read on buyer_profiles for select
  using (
    (is_listed = true and public.is_active(user_id))
    or user_id = auth.uid()
    or public.is_manager()
  );
