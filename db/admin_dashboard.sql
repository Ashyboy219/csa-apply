-- Admin dashboard DB layer (already applied to the live Supabase project
-- `obsidian-codex-console` / xfyijkztkhfkuffmjqwq). Checked in for reproducibility.
--
-- Design: this project is SHARED with an unrelated app, so the dashboard never
-- uses the service_role key. A server-only secret gates a tiny set of
-- SECURITY DEFINER RPCs scoped to ONLY public.camp_application, called with the
-- public publishable key — so the worst-case leak is bounded to this one table.
-- See ADMIN.md.

begin;

-- ── 1. Admin-support columns on the applications table ──────────────────────
alter table public.camp_application
  add column if not exists ai_summary          text,
  add column if not exists ai_summary_at        timestamptz,
  add column if not exists admin_notes          text,
  add column if not exists reviewed_by          text,
  add column if not exists reviewed_at          timestamptz,
  add column if not exists scholarship          boolean not null default false,
  add column if not exists last_emailed_at       timestamptz,
  add column if not exists last_email_template   text;

-- ── 2. Gate secret: single row, unreadable by anon (RLS on, zero policies).
--    SECURITY DEFINER functions (owned by the superuser) bypass RLS to read it.
create table if not exists public.camp_admin_config (
  id     boolean primary key default true check (id),
  secret text not null
);
alter table public.camp_admin_config enable row level security;

-- Seed a strong random secret once (256 bits from two UUIDs; no pgcrypto needed).
-- Set the SAME value as ADMIN_DB_SECRET in Vercel. To rotate, see ADMIN.md.
insert into public.camp_admin_config (id, secret)
values (true, replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
on conflict (id) do nothing;

-- ── 3. RPCs. Each verifies the gate secret first; all reference fully-qualified
--    objects and pin search_path to block hijacking. ────────────────────────
create or replace function public.admin_list_applications(p_secret text)
returns setof public.camp_application
language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if p_secret is null or p_secret <> (select secret from public.camp_admin_config where id) then
    raise exception 'unauthorized' using errcode = '28000';
  end if;
  return query select * from public.camp_application
               order by (status = 'applied') desc, created_at desc;
end;
$$;

create or replace function public.admin_update_application(
  p_secret text, p_id uuid, p_status text default null,
  p_scholarship boolean default null, p_note text default null, p_reviewer text default null
)
returns public.camp_application
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_row public.camp_application;
begin
  if p_secret is null or p_secret <> (select secret from public.camp_admin_config where id) then
    raise exception 'unauthorized' using errcode = '28000';
  end if;
  if p_status is not null and p_status not in ('applied','enrolled','declined','waitlist','withdrawn') then
    raise exception 'invalid status';
  end if;
  update public.camp_application
     set status      = coalesce(p_status, status),
         scholarship = coalesce(p_scholarship, scholarship),
         admin_notes = coalesce(p_note, admin_notes),
         reviewed_by = coalesce(p_reviewer, reviewed_by),
         reviewed_at = case when p_status is not null then now() else reviewed_at end
   where id = p_id
   returning * into v_row;
  if not found then raise exception 'not found'; end if;
  return v_row;
end;
$$;

create or replace function public.admin_set_summary(p_secret text, p_id uuid, p_summary text)
returns public.camp_application
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_row public.camp_application;
begin
  if p_secret is null or p_secret <> (select secret from public.camp_admin_config where id) then
    raise exception 'unauthorized' using errcode = '28000';
  end if;
  update public.camp_application set ai_summary = p_summary, ai_summary_at = now()
   where id = p_id returning * into v_row;
  if not found then raise exception 'not found'; end if;
  return v_row;
end;
$$;

create or replace function public.admin_mark_emailed(p_secret text, p_id uuid, p_template text)
returns public.camp_application
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_row public.camp_application;
begin
  if p_secret is null or p_secret <> (select secret from public.camp_admin_config where id) then
    raise exception 'unauthorized' using errcode = '28000';
  end if;
  update public.camp_application set last_emailed_at = now(), last_email_template = p_template
   where id = p_id returning * into v_row;
  if not found then raise exception 'not found'; end if;
  return v_row;
end;
$$;

-- ── 4. Grants: callable by the backend via the public (anon) key, but useless
--    without the gate secret. ──────────────────────────────────────────────
revoke all on function public.admin_list_applications(text)                                  from public;
revoke all on function public.admin_update_application(text, uuid, text, boolean, text, text) from public;
revoke all on function public.admin_set_summary(text, uuid, text)                            from public;
revoke all on function public.admin_mark_emailed(text, uuid, text)                           from public;

grant execute on function public.admin_list_applications(text)                                  to anon, authenticated;
grant execute on function public.admin_update_application(text, uuid, text, boolean, text, text) to anon, authenticated;
grant execute on function public.admin_set_summary(text, uuid, text)                            to anon, authenticated;
grant execute on function public.admin_mark_emailed(text, uuid, text)                           to anon, authenticated;

-- ── 5. Per-instructor identity + AI accept/reject verdict ───────────────────
-- AI verdict on each application (advisory; humans still decide).
alter table public.camp_application
  add column if not exists ai_verdict text
    check (ai_verdict is null or ai_verdict in ('accept','reject','maybe'));

-- Admin identity + their connected Gmail (Composio connected_account_id).
create table if not exists public.camp_admin (
  name             text primary key,
  gmail_account_id text,
  gmail_label      text,
  created_at       timestamptz not null default now(),
  last_seen_at     timestamptz
);
alter table public.camp_admin enable row level security;

create or replace function public.admin_upsert_self(p_secret text, p_name text)
returns void language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if p_secret is null or p_secret <> (select secret from public.camp_admin_config where id) then
    raise exception 'unauthorized' using errcode = '28000';
  end if;
  insert into public.camp_admin (name, last_seen_at) values (trim(p_name), now())
  on conflict (name) do update set last_seen_at = now();
end;
$$;

create or replace function public.admin_list_admins(p_secret text)
returns table (name text, gmail_account_id text, gmail_label text)
language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if p_secret is null or p_secret <> (select secret from public.camp_admin_config where id) then
    raise exception 'unauthorized' using errcode = '28000';
  end if;
  return query select a.name, a.gmail_account_id, a.gmail_label from public.camp_admin a order by a.name;
end;
$$;

create or replace function public.admin_set_gmail(p_secret text, p_name text, p_account_id text, p_label text)
returns void language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if p_secret is null or p_secret <> (select secret from public.camp_admin_config where id) then
    raise exception 'unauthorized' using errcode = '28000';
  end if;
  insert into public.camp_admin (name, gmail_account_id, gmail_label, last_seen_at)
  values (trim(p_name), p_account_id, p_label, now())
  on conflict (name) do update
    set gmail_account_id = excluded.gmail_account_id, gmail_label = excluded.gmail_label, last_seen_at = now();
end;
$$;

-- Extend admin_set_summary to also store the AI verdict.
drop function if exists public.admin_set_summary(text, uuid, text);
create function public.admin_set_summary(p_secret text, p_id uuid, p_summary text, p_verdict text default null)
returns public.camp_application
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_row public.camp_application;
begin
  if p_secret is null or p_secret <> (select secret from public.camp_admin_config where id) then
    raise exception 'unauthorized' using errcode = '28000';
  end if;
  if p_verdict is not null and p_verdict not in ('accept','reject','maybe') then p_verdict := null; end if;
  update public.camp_application
     set ai_summary = p_summary, ai_summary_at = now(), ai_verdict = coalesce(p_verdict, ai_verdict)
   where id = p_id returning * into v_row;
  if not found then raise exception 'not found'; end if;
  return v_row;
end;
$$;

revoke all on function public.admin_upsert_self(text, text)             from public;
revoke all on function public.admin_list_admins(text)                   from public;
revoke all on function public.admin_set_gmail(text, text, text, text)   from public;
revoke all on function public.admin_set_summary(text, uuid, text, text) from public;
grant execute on function public.admin_upsert_self(text, text)             to anon, authenticated;
grant execute on function public.admin_list_admins(text)                   to anon, authenticated;
grant execute on function public.admin_set_gmail(text, text, text, text)   to anon, authenticated;
grant execute on function public.admin_set_summary(text, uuid, text, text) to anon, authenticated;

commit;
