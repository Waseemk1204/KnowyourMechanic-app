-- Phase 0 — Auto-account by phone.
-- When a garage successfully adds a service, ensure a customer account exists
-- for that phone number (created with no auth yet). When the customer later
-- logs in, link_current_auth_profile finds it by phone and attaches their auth
-- user — no manual signup / role-selection step. Service history is already
-- keyed by phone; we now also link the record to the profile via
-- customer_profile_id. Supersedes 20260718000300 (same signature).
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
  v_customer_profile_id uuid;
begin
  if not (public.owns_garage(p_garage_id) or public.is_admin()) then
    raise exception 'Not authorized for this garage' using errcode = '42501';
  end if;

  select name into v_garage_name from public.garages where id = p_garage_id;
  if v_garage_name is null then
    raise exception 'Garage not found' using errcode = 'P0002';
  end if;

  v_phone := public.normalize_indian_phone(p_customer_phone);

  -- Auto-account: ensure a customer profile exists for this phone. Never
  -- overwrites an existing profile (any role) — just reuses it if present.
  insert into public.profiles (phone_number, role)
  values (v_phone, 'customer')
  on conflict (phone_number) do nothing;

  select id into v_customer_profile_id
  from public.profiles
  where phone_number = v_phone
  limit 1;

  -- Taxonomy is OPTIONAL (structured data is enriched later). De-dupe input.
  v_service_codes := (select array_agg(distinct c) from unnest(coalesce(p_service_codes, '{}')) as c where nullif(btrim(c), '') is not null);
  v_failure_codes := (select array_agg(distinct c) from unnest(coalesce(p_failure_codes, '{}')) as c where nullif(btrim(c), '') is not null);

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

  select string_agg(display_name, ', ' order by sort_order)
    into v_description
  from public.service_categories
  where code = any(v_service_codes);

  insert into public.service_records (
    garage_id, customer_phone, customer_profile_id, garage_name, vehicle_number, description, amount,
    platform_fee, garage_earnings, status, is_reliable, verification_method,
    approved_by_customer, vehicle_type, vehicle_make_code, vehicle_model_code,
    vehicle_make_other, vehicle_model_other, model_year, odometer_km, service_notes,
    invoice_delivery_channel, invoice_notification_status
  ) values (
    p_garage_id,
    v_phone,
    v_customer_profile_id,
    v_garage_name,
    nullif(btrim(upper(coalesce(p_vehicle_number, ''))), ''),
    coalesce(v_description, nullif(btrim(coalesce(p_service_notes, '')), ''), 'Service'),
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
