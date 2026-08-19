-- Triggers (DATA-MODEL.md §6, §7). These are data invariants, unviolatable through any
-- path including the service role — triggers are NOT bypassed by the secret key, so the
-- seed script orders its inserts accordingly.

-- §6 Contact request quota (D5): at most 5 pending outbound requests per initiator,
-- symmetric across roles. The quota frees on ACCEPTED or DECLINED.
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

drop trigger if exists contact_quota_check on conversations;
create trigger contact_quota_check
  before insert on conversations
  for each row execute function public.enforce_contact_quota();

-- §7 Publication trigger: stamp published_at on the first transition to PUBLISHED.
-- BEFORE UPDATE only — a direct insert of a PUBLISHED asset must set published_at itself.
create or replace function public.set_published_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'PUBLISHED' and old.status is distinct from 'PUBLISHED'
     and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end $$;

drop trigger if exists assets_published_at on assets;
create trigger assets_published_at
  before update on assets
  for each row execute function public.set_published_at();
