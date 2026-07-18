-- Live chat support: tickets + messages, the support role's access, atomic
-- claim/resolve RPCs, and realtime. Depends on the 'support' enum value added
-- in 20260718000100_support_role_enum.sql.

-- ---- enums ----
do $$ begin
  create type public.support_ticket_status as enum ('open', 'claimed', 'resolved');
exception when duplicate_object then null; end $$;

-- ---- tables ----
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  opener_profile_id uuid not null references public.profiles(id) on delete cascade,
  opener_role public.app_role not null,
  opener_name text,
  opener_phone text,
  subject text,
  status public.support_ticket_status not null default 'open',
  claimed_by uuid references public.profiles(id) on delete set null,
  claimed_at timestamptz,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_tickets_status_idx on public.support_tickets (status, last_message_at desc);
create index if not exists support_tickets_opener_idx on public.support_tickets (opener_profile_id);
create index if not exists support_tickets_claimed_idx on public.support_tickets (claimed_by);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete cascade,
  sender_kind text not null check (sender_kind in ('user', 'support')),
  body text not null check (length(btrim(body)) > 0),
  created_at timestamptz not null default now()
);
create index if not exists support_messages_ticket_idx on public.support_messages (ticket_id, created_at);

-- ---- helper ----
create or replace function public.is_support()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'support', false);
$$;

-- ---- RLS ----
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

create policy "support tickets visible" on public.support_tickets
for select using (
  opener_profile_id = public.current_profile_id()
  or public.is_support()
  or public.is_admin()
);

create policy "support tickets opener insert" on public.support_tickets
for insert with check (opener_profile_id = public.current_profile_id());

create policy "support tickets staff update" on public.support_tickets
for update using (public.is_support() or public.is_admin())
with check (public.is_support() or public.is_admin());

create policy "support messages visible" on public.support_messages
for select using (
  public.is_support()
  or public.is_admin()
  or exists (
    select 1 from public.support_tickets t
    where t.id = ticket_id and t.opener_profile_id = public.current_profile_id()
  )
);

create policy "support messages insert" on public.support_messages
for insert with check (
  sender_profile_id = public.current_profile_id()
  and (
    public.is_support()
    or public.is_admin()
    or exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id and t.opener_profile_id = public.current_profile_id()
    )
  )
);

-- Share the existing garage reports with support (additive to the admin policies).
create policy "reports support select" on public.reports
for select using (public.is_support());

create policy "reports support update" on public.reports
for update using (public.is_support())
with check (public.is_support());

-- ---- RPCs ----

-- Get-or-create the caller's active (open/claimed) ticket. Returns its id.
create or replace function public.open_support_ticket(p_opener_role public.app_role)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile uuid := public.current_profile_id();
  v_ticket uuid;
begin
  if v_profile is null then
    raise exception 'not authenticated';
  end if;

  select id into v_ticket
  from public.support_tickets
  where opener_profile_id = v_profile and status in ('open', 'claimed')
  order by created_at desc
  limit 1;

  if v_ticket is null then
    insert into public.support_tickets (opener_profile_id, opener_role, opener_name, opener_phone)
    select v_profile, p_opener_role, p.name, p.phone_number
    from public.profiles p where p.id = v_profile
    returning id into v_ticket;
  end if;

  return v_ticket;
end;
$$;

-- Atomically claim an unclaimed ticket for the current support agent.
create or replace function public.claim_support_ticket(p_ticket_id uuid)
returns public.support_tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.support_tickets;
begin
  if not public.is_support() then
    raise exception 'only support can claim tickets';
  end if;

  update public.support_tickets
  set claimed_by = public.current_profile_id(),
      claimed_at = now(),
      status = 'claimed',
      updated_at = now()
  where id = p_ticket_id and claimed_by is null
  returning * into v_row;

  if v_row.id is null then
    raise exception 'ticket already claimed';
  end if;

  return v_row;
end;
$$;

-- Mark a ticket resolved (support/admin only).
create or replace function public.resolve_support_ticket(p_ticket_id uuid)
returns public.support_tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.support_tickets;
begin
  if not (public.is_support() or public.is_admin()) then
    raise exception 'only support can resolve tickets';
  end if;

  update public.support_tickets
  set status = 'resolved', updated_at = now()
  where id = p_ticket_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'ticket not found';
  end if;

  return v_row;
end;
$$;

-- Keep last_message_at fresh so the queue orders by most-recent activity.
create or replace function public.touch_support_ticket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.support_tickets
  set last_message_at = new.created_at, updated_at = now()
  where id = new.ticket_id;
  return new;
end;
$$;

drop trigger if exists trg_touch_support_ticket on public.support_messages;
create trigger trg_touch_support_ticket
after insert on public.support_messages
for each row execute function public.touch_support_ticket();

grant execute on function public.open_support_ticket(public.app_role) to authenticated;
grant execute on function public.claim_support_ticket(uuid) to authenticated;
grant execute on function public.resolve_support_ticket(uuid) to authenticated;

-- ---- realtime (idempotent) ----
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'support_tickets'
  ) then
    execute 'alter publication supabase_realtime add table public.support_tickets';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'support_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.support_messages';
  end if;
end $$;
