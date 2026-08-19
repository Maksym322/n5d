-- RLS policies (DATA-MODEL.md §5). RLS is the primary security layer (ADR-2).
-- The identity tables are the core of bilateral confidentiality (D1): a _profiles row is
-- always public and anonymous; a _identities row opens only to the owner, a MANAGER, or a
-- counterparty holding an ACCEPTED conversation. The two accepted-read policies are mirror
-- images over the same predicate (ADR-10).
--
-- Each create is preceded by drop ... if exists so a partially applied migration can be
-- re-run cleanly (db push is append-only in normal use, but this keeps the file safe to retry).

-- profiles
drop policy if exists profiles_read_self on profiles;
create policy profiles_read_self on profiles for select
  using (id = auth.uid() or public.is_manager());

drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles for update
  using (id = auth.uid() and public.is_active())
  with check (id = auth.uid() and status = 'ACTIVE');  -- cannot self-edit status/role

-- Public profile tables
drop policy if exists seller_profile_read on seller_profiles;
create policy seller_profile_read on seller_profiles for select
  using (true);

drop policy if exists seller_profile_write_own on seller_profiles;
create policy seller_profile_write_own on seller_profiles for all
  using (user_id = auth.uid() and public.is_active())
  with check (user_id = auth.uid() and public.is_active());

drop policy if exists buyer_profile_read on buyer_profiles;
create policy buyer_profile_read on buyer_profiles for select
  using (is_listed = true or user_id = auth.uid() or public.is_manager());

drop policy if exists buyer_profile_write_own on buyer_profiles;
create policy buyer_profile_write_own on buyer_profiles for all
  using (user_id = auth.uid() and public.is_active())
  with check (user_id = auth.uid() and public.is_active());

-- Identity tables — the core of D1
drop policy if exists buyer_identity_read_own on buyer_identities;
create policy buyer_identity_read_own on buyer_identities for select
  using (user_id = auth.uid() or public.is_manager());

drop policy if exists buyer_identity_read_accepted on buyer_identities;
create policy buyer_identity_read_accepted on buyer_identities for select
  using (exists (
    select 1 from conversations c
    where c.buyer_id = buyer_identities.user_id
      and c.seller_id = auth.uid()
      and c.status = 'ACCEPTED'
  ));

drop policy if exists buyer_identity_write_own on buyer_identities;
create policy buyer_identity_write_own on buyer_identities for all
  using (user_id = auth.uid() and public.is_active())
  with check (user_id = auth.uid() and public.is_active());

drop policy if exists seller_identity_read_own on seller_identities;
create policy seller_identity_read_own on seller_identities for select
  using (user_id = auth.uid() or public.is_manager());

drop policy if exists seller_identity_read_accepted on seller_identities;
create policy seller_identity_read_accepted on seller_identities for select
  using (exists (
    select 1 from conversations c
    where c.seller_id = seller_identities.user_id
      and c.buyer_id = auth.uid()
      and c.status = 'ACCEPTED'
  ));

drop policy if exists seller_identity_write_own on seller_identities;
create policy seller_identity_write_own on seller_identities for all
  using (user_id = auth.uid() and public.is_active())
  with check (user_id = auth.uid() and public.is_active());

-- assets
drop policy if exists assets_read_published on assets;
create policy assets_read_published on assets for select
  using (
    (status = 'PUBLISHED' and exists (
       select 1 from profiles p where p.id = assets.seller_id and p.status = 'ACTIVE'
    ))
    or seller_id = auth.uid()
    or public.is_manager()
  );

drop policy if exists assets_write_own on assets;
create policy assets_write_own on assets for all
  using (seller_id = auth.uid() and public.is_active())
  with check (seller_id = auth.uid() and public.is_active());

-- conversations / messages
drop policy if exists conv_read_party on conversations;
create policy conv_read_party on conversations for select
  using (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_manager());

drop policy if exists conv_insert on conversations;
create policy conv_insert on conversations for insert
  with check (initiated_by = auth.uid()
              and (buyer_id = auth.uid() or seller_id = auth.uid())
              and public.is_active());

drop policy if exists conv_respond on conversations;
create policy conv_respond on conversations for update
  using ((buyer_id = auth.uid() or seller_id = auth.uid())
         and initiated_by <> auth.uid()
         and public.is_active());

drop policy if exists msg_read_party on messages;
create policy msg_read_party on messages for select
  using (exists (
    select 1 from conversations c
    where c.id = messages.conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid() or public.is_manager())
  ));

drop policy if exists msg_insert_accepted on messages;
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

-- moderation_log — reads for managers; writes only via the service role (ADR-2).
drop policy if exists modlog_read_manager on moderation_log;
create policy modlog_read_manager on moderation_log for select
  using (public.is_manager());
