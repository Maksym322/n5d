-- Policy helper functions (DATA-MODEL.md §4).
-- Role is read from the JWT app_metadata (ADR-9); status is read from the table via a
-- security-definer helper so suspension takes effect immediately, not at next token refresh.

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
