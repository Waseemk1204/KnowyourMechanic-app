-- Multi-role: one identity (one profile per phone) can hold several roles.
--
-- Roles move OUT of the single profiles.role column and INTO profile_roles, so a
-- number can be e.g. both 'admin' and 'customer'. profiles.role is KEPT as the
-- "primary" role for backward compatibility and is mirrored into profile_roles
-- by a trigger, so existing code that inserts a profile with a role keeps working
-- unchanged. All row security still keys off current_profile_id() (still exactly
-- one profile per person) — only role *membership* becomes a list.
--
-- Idempotent: safe to run more than once.

-- 1. Role membership table ---------------------------------------------------
create table if not exists public.profile_roles (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, role)
);

alter table public.profile_roles enable row level security;

-- You can read your own roles; admins can read everyone's.
drop policy if exists profile_roles_select_self on public.profile_roles;
create policy profile_roles_select_self on public.profile_roles
  for select using (profile_id = public.current_profile_id() or public.is_admin());

-- 2. Backfill from the existing single-role profiles -------------------------
insert into public.profile_roles (profile_id, role)
select id, role from public.profiles
on conflict do nothing;

-- Retroactive 'customer' role for anyone who ever received a service (their
-- profile may have been created with a different primary role, e.g. admin).
insert into public.profile_roles (profile_id, role)
select distinct customer_profile_id, 'customer'::public.app_role
from public.service_records
where customer_profile_id is not null
on conflict do nothing;

-- 3. Keep profile_roles in sync with profiles.role --------------------------
-- Whenever a profile is created (new signup / auto-account) or its primary role
-- changes, mirror that role into profile_roles. This means the app's existing
-- "insert into profiles(...role...)" automatically grants the role — no app
-- change needed for role creation.
create or replace function public.sync_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profile_roles (profile_id, role)
  values (new.id, new.role)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_sync_profile_role on public.profiles;
create trigger trg_sync_profile_role
  after insert or update of role on public.profiles
  for each row execute function public.sync_profile_role();

-- 4. Multi-role-aware helpers ------------------------------------------------
create or replace function public.current_profile_has_role(target public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profile_roles pr
    join public.profiles p on p.id = pr.profile_id
    where p.auth_user_id = auth.uid()
      and pr.role = target
  );
$$;

-- Redefine the two role gates that previously read the single profiles.role.
-- Everything else (owns_garage, employee_assigned_to_garage, current_profile_id)
-- keys off the profile id and is unaffected.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_has_role('admin');
$$;

create or replace function public.is_support()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_has_role('support');
$$;

-- Roles held by the currently authenticated user — drives the login picker.
create or replace function public.my_roles()
returns public.app_role[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(pr.role order by pr.role), '{}')
  from public.profile_roles pr
  join public.profiles p on p.id = pr.profile_id
  where p.auth_user_id = auth.uid();
$$;

grant execute on function public.current_profile_has_role(public.app_role) to authenticated;
grant execute on function public.my_roles() to authenticated;

-- 5. Service-add grants the 'customer' role ---------------------------------
-- When a garage adds a service for a phone that already has another role (e.g.
-- admin/garage), the auto-account step reuses the existing profile and does NOT
-- create a new one — so the sync trigger above never fires for it. This trigger
-- ensures any profile that receives a service always holds the 'customer' role,
-- so it appears in that person's login picker and owns its service history.
create or replace function public.grant_customer_role_on_service()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.customer_profile_id is not null then
    insert into public.profile_roles (profile_id, role)
    values (new.customer_profile_id, 'customer'::public.app_role)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_grant_customer_role on public.service_records;
create trigger trg_grant_customer_role
  after insert on public.service_records
  for each row execute function public.grant_customer_role_on_service();

