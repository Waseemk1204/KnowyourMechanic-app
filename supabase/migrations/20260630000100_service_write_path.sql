-- Server-side service record write path.
-- One transactional RPC creates the service record plus its taxonomy join rows,
-- enforcing garage ownership and "at least one service and one failure".
-- The service OTP is never generated or returned here: OTP creation and delivery
-- happen in a trusted Edge Function (service role) so a garage cannot read it and
-- bypass customer approval.

-- 1. Hashed, single-use, expiring service OTPs.
-- No client RLS policies: only the service-role Edge Function reads/writes this table.
create table if not exists public.service_otps (
  id uuid primary key default gen_random_uuid(),
  service_record_id uuid not null references public.service_records(id) on delete cascade,
  phone text not null,
  otp_hash text not null,
  otp_salt text not null,
  expires_at timestamptz not null,
  attempt_count integer not null default 0,
  max_attempts integer not null default 5,
  resend_count integer not null default 0,
  sent_provider text,
  provider_message_id text,
  verified_at timestamptz,
  consumed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_service_otps_record on public.service_otps(service_record_id);
create index if not exists idx_service_otps_active
  on public.service_otps(service_record_id)
  where consumed = false and verified_at is null;

drop trigger if exists set_service_otps_updated_at on public.service_otps;
create trigger set_service_otps_updated_at before update on public.service_otps
for each row execute function public.set_updated_at();

alter table public.service_otps enable row level security;
-- Intentionally no policies: reachable only via service role (Edge Function).
revoke all on public.service_otps from anon, authenticated;
grant select, insert, update, delete on public.service_otps to service_role;

-- 2. Owner-scoped insert policies on the taxonomy join tables (defense in depth).
-- Primary write path is the SECURITY DEFINER RPC below; these let a garage owner
-- manage their own join rows directly without opening the tables to everyone.
drop policy if exists "service record services owner write" on public.service_record_services;
create policy "service record services owner write" on public.service_record_services
for all using (
  public.is_admin()
  or exists (
    select 1 from public.service_records sr
    where sr.id = service_record_id and public.owns_garage(sr.garage_id)
  )
)
with check (
  public.is_admin()
  or exists (
    select 1 from public.service_records sr
    where sr.id = service_record_id and public.owns_garage(sr.garage_id)
  )
);

drop policy if exists "service record failures owner write" on public.service_record_failures;
create policy "service record failures owner write" on public.service_record_failures
for all using (
  public.is_admin()
  or exists (
    select 1 from public.service_records sr
    where sr.id = service_record_id and public.owns_garage(sr.garage_id)
  )
)
with check (
  public.is_admin()
  or exists (
    select 1 from public.service_records sr
    where sr.id = service_record_id and public.owns_garage(sr.garage_id)
  )
);

-- 3. Phone normalization: store the 10-digit national number consistently.
create or replace function public.normalize_indian_phone(raw_phone text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  digits text;
begin
  digits := regexp_replace(coalesce(raw_phone, ''), '\D', '', 'g');
  if length(digits) > 10 then
    digits := right(digits, 10);
  end if;
  if length(digits) <> 10 then
    raise exception 'Invalid phone number' using errcode = '22023';
  end if;
  return digits;
end;
$$;

-- 4. Transactional create. Runs as definer so it can write the join tables and
-- read garage details, but enforces caller ownership via auth.uid()-based helpers.
create or replace function public.create_service_record_with_taxonomy(
  p_garage_id uuid,
  p_customer_phone text,
  p_vehicle_type public.vehicle_type,
  p_vehicle_make_code text,
  p_vehicle_model_code text,
  p_vehicle_make_other text,
  p_vehicle_model_other text,
  p_vehicle_number text,
  p_model_year smallint,
  p_odometer_km integer,
  p_service_codes text[],
  p_failure_codes text[],
  p_service_notes text,
  p_amount numeric,
  p_customer_has_app boolean
)
returns table (
  service_record_id uuid,
  customer_phone text,
  status public.service_record_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_garage_name text;
  v_service_codes text[];
  v_failure_codes text[];
  v_description text;
  v_record_id uuid;
  v_phone text;
begin
  -- Ownership: only the owning garage (or an admin) may create records here.
  if not (public.owns_garage(p_garage_id) or public.is_admin()) then
    raise exception 'Not authorized for this garage' using errcode = '42501';
  end if;

  select name into v_garage_name from public.garages where id = p_garage_id;
  if v_garage_name is null then
    raise exception 'Garage not found' using errcode = 'P0002';
  end if;

  v_phone := public.normalize_indian_phone(p_customer_phone);

  -- Require clean, de-duplicated taxonomy: at least one service and one failure.
  v_service_codes := (select array_agg(distinct c) from unnest(p_service_codes) as c where nullif(btrim(c), '') is not null);
  v_failure_codes := (select array_agg(distinct c) from unnest(p_failure_codes) as c where nullif(btrim(c), '') is not null);

  if v_service_codes is null or array_length(v_service_codes, 1) is null then
    raise exception 'At least one service category is required' using errcode = '22023';
  end if;
  if v_failure_codes is null or array_length(v_failure_codes, 1) is null then
    raise exception 'At least one failure category is required' using errcode = '22023';
  end if;

  -- Reject unknown / inactive codes up front for a clear error (FKs also enforce).
  if exists (
    select 1 from unnest(v_service_codes) as c
    where not exists (select 1 from public.service_categories sc where sc.code = c and sc.is_active)
  ) then
    raise exception 'Unknown or inactive service category' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(v_failure_codes) as c
    where not exists (select 1 from public.failure_categories fc where fc.code = c and fc.is_active)
  ) then
    raise exception 'Unknown or inactive failure category' using errcode = '22023';
  end if;

  -- Description is derived from the structured service names, not free text.
  select string_agg(display_name, ', ' order by sort_order)
    into v_description
  from public.service_categories
  where code = any(v_service_codes);

  insert into public.service_records (
    garage_id,
    customer_phone,
    garage_name,
    vehicle_number,
    description,
    amount,
    platform_fee,
    garage_earnings,
    status,
    is_reliable,
    verification_method,
    approved_by_customer,
    vehicle_type,
    vehicle_make_code,
    vehicle_model_code,
    vehicle_make_other,
    vehicle_model_other,
    model_year,
    odometer_km,
    service_notes,
    invoice_delivery_channel,
    invoice_notification_status
  ) values (
    p_garage_id,
    v_phone,
    v_garage_name,
    nullif(btrim(upper(coalesce(p_vehicle_number, ''))), ''),
    coalesce(v_description, 'Service'),
    p_amount,
    0,
    p_amount,
    'pending_otp',
    false,
    case when p_customer_has_app then 'in_app'::public.verification_method else 'whatsapp_otp'::public.verification_method end,
    false,
    p_vehicle_type,
    nullif(btrim(coalesce(p_vehicle_make_code, '')), ''),
    nullif(btrim(coalesce(p_vehicle_model_code, '')), ''),
    nullif(btrim(coalesce(p_vehicle_make_other, '')), ''),
    nullif(btrim(coalesce(p_vehicle_model_other, '')), ''),
    p_model_year,
    p_odometer_km,
    nullif(btrim(coalesce(p_service_notes, '')), ''),
    'none',
    'not_required'
  )
  returning id into v_record_id;

  insert into public.service_record_services (service_record_id, service_category_code)
  select v_record_id, c from unnest(v_service_codes) as c;

  insert into public.service_record_failures (service_record_id, failure_category_code)
  select v_record_id, c from unnest(v_failure_codes) as c;

  return query select v_record_id, v_phone, 'pending_otp'::public.service_record_status;
end;
$$;

revoke all on function public.create_service_record_with_taxonomy(
  uuid, text, public.vehicle_type, text, text, text, text, text, smallint, integer, text[], text[], text, numeric, boolean
) from public;
grant execute on function public.create_service_record_with_taxonomy(
  uuid, text, public.vehicle_type, text, text, text, text, text, smallint, integer, text[], text[], text, numeric, boolean
) to authenticated;
