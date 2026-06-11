-- KnowYourMechanic Phase 1 RLS policies

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.current_phone_number()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select phone_number from public.profiles where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'admin', false);
$$;

create or replace function public.owns_garage(target_garage_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.garages
    where id = target_garage_id
      and owner_profile_id = public.current_profile_id()
  );
$$;

create or replace function public.employee_assigned_to_garage(target_garage_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.garages g
    join public.employees e on e.id = g.assigned_employee_id
    where g.id = target_garage_id
      and e.profile_id = public.current_profile_id()
      and e.is_active = true
  );
$$;

alter table public.profiles enable row level security;
alter table public.user_devices enable row level security;
alter table public.employees enable row level security;
alter table public.garages enable row level security;
alter table public.garage_services enable row level security;
alter table public.bookings enable row level security;
alter table public.service_records enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;

create policy "profiles select own or admin" on public.profiles
for select using (id = public.current_profile_id() or public.is_admin());

create policy "profiles insert own" on public.profiles
for insert with check (auth_user_id = auth.uid() or public.is_admin());

create policy "profiles update own or admin" on public.profiles
for update using (id = public.current_profile_id() or public.is_admin())
with check (id = public.current_profile_id() or public.is_admin());

create policy "user devices own or admin" on public.user_devices
for all using (profile_id = public.current_profile_id() or public.is_admin())
with check (profile_id = public.current_profile_id() or public.is_admin());

create policy "employees select self admin or assigned visibility" on public.employees
for select using (
  profile_id = public.current_profile_id()
  or public.is_admin()
);

create policy "employees admin write" on public.employees
for all using (public.is_admin())
with check (public.is_admin());

create policy "garages select visible" on public.garages
for select using (
  public.is_admin()
  or owner_profile_id = public.current_profile_id()
  or public.employee_assigned_to_garage(id)
  or (is_verified = true and is_offboarded = false)
);

create policy "garages insert owner or admin" on public.garages
for insert with check (owner_profile_id = public.current_profile_id() or public.is_admin());

create policy "garages update owner employee or admin" on public.garages
for update using (
  public.is_admin()
  or owner_profile_id = public.current_profile_id()
  or public.employee_assigned_to_garage(id)
)
with check (
  public.is_admin()
  or owner_profile_id = public.current_profile_id()
  or public.employee_assigned_to_garage(id)
);

create policy "garage services select visible" on public.garage_services
for select using (
  public.is_admin()
  or public.owns_garage(garage_id)
  or public.employee_assigned_to_garage(garage_id)
  or exists (
    select 1 from public.garages g
    where g.id = garage_id and g.is_verified = true and g.is_offboarded = false
  )
);

create policy "garage services owner or admin write" on public.garage_services
for all using (public.is_admin() or public.owns_garage(garage_id))
with check (public.is_admin() or public.owns_garage(garage_id));

create policy "bookings involved parties select" on public.bookings
for select using (
  public.is_admin()
  or customer_profile_id = public.current_profile_id()
  or public.owns_garage(garage_id)
  or public.employee_assigned_to_garage(garage_id)
);

create policy "bookings customer insert" on public.bookings
for insert with check (customer_profile_id = public.current_profile_id() or public.is_admin());

create policy "bookings involved parties update" on public.bookings
for update using (
  public.is_admin()
  or customer_profile_id = public.current_profile_id()
  or public.owns_garage(garage_id)
)
with check (
  public.is_admin()
  or customer_profile_id = public.current_profile_id()
  or public.owns_garage(garage_id)
);

create policy "service records involved parties select" on public.service_records
for select using (
  public.is_admin()
  or customer_profile_id = public.current_profile_id()
  or customer_phone = public.current_phone_number()
  or public.owns_garage(garage_id)
  or public.employee_assigned_to_garage(garage_id)
);

create policy "service records garage insert" on public.service_records
for insert with check (public.is_admin() or public.owns_garage(garage_id));

create policy "service records garage customer update" on public.service_records
for update using (
  public.is_admin()
  or public.owns_garage(garage_id)
  or customer_profile_id = public.current_profile_id()
  or customer_phone = public.current_phone_number()
)
with check (
  public.is_admin()
  or public.owns_garage(garage_id)
  or customer_profile_id = public.current_profile_id()
  or customer_phone = public.current_phone_number()
);

create policy "reviews visible" on public.reviews
for select using (true);

create policy "reviews customer write" on public.reviews
for all using (customer_profile_id = public.current_profile_id() or public.is_admin())
with check (customer_profile_id = public.current_profile_id() or public.is_admin());

create policy "reports select allowed" on public.reports
for select using (
  public.is_admin()
  or reporter_profile_id = public.current_profile_id()
  or public.owns_garage(garage_id)
  or status = 'resolved'
);

create policy "reports customer insert" on public.reports
for insert with check (reporter_profile_id = public.current_profile_id() or public.is_admin());

create policy "reports admin update" on public.reports
for update using (public.is_admin())
with check (public.is_admin());

create policy "payments involved parties select" on public.payments
for select using (
  public.is_admin()
  or customer_profile_id = public.current_profile_id()
  or public.owns_garage(garage_id)
);

create policy "payments involved parties write" on public.payments
for all using (
  public.is_admin()
  or customer_profile_id = public.current_profile_id()
  or public.owns_garage(garage_id)
)
with check (
  public.is_admin()
  or customer_profile_id = public.current_profile_id()
  or public.owns_garage(garage_id)
);

create policy "notifications own or admin" on public.notifications
for all using (profile_id = public.current_profile_id() or public.is_admin())
with check (profile_id = public.current_profile_id() or public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.garages, public.garage_services, public.reviews to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
