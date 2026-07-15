-- Structured vehicle, service, and failure taxonomy.
-- Codes are stable analytics keys. Display names may change without rewriting history.

do $$ begin
  create type public.vehicle_type as enum ('2w', '3w', '4w', 'other');
exception when duplicate_object then null; end $$;

create table if not exists public.vehicle_makes (
  code text primary key check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  display_name text not null check (btrim(display_name) <> ''),
  vehicle_types public.vehicle_type[] not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicle_models (
  code text primary key check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  make_code text not null references public.vehicle_makes(code),
  vehicle_type public.vehicle_type not null,
  display_name text not null check (btrim(display_name) <> ''),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (code, make_code, vehicle_type)
);

create or replace function public.validate_vehicle_model_taxonomy()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.vehicle_makes vm
    where vm.code = new.make_code
      and new.vehicle_type = any(vm.vehicle_types)
  ) then
    raise exception 'vehicle model type is not supported by its make';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_vehicle_model_taxonomy on public.vehicle_models;
create trigger validate_vehicle_model_taxonomy
before insert or update of make_code, vehicle_type on public.vehicle_models
for each row execute function public.validate_vehicle_model_taxonomy();

create table if not exists public.service_categories (
  code text primary key check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  display_name text not null check (btrim(display_name) <> ''),
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.failure_categories (
  code text primary key check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  display_name text not null check (btrim(display_name) <> ''),
  recommended_service_code text references public.service_categories(code),
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.vehicle_makes (code, display_name, vehicle_types, sort_order)
values
  ('bajaj', 'Bajaj', array['2w', '3w']::public.vehicle_type[], 10),
  ('hero', 'Hero', array['2w']::public.vehicle_type[], 20),
  ('honda', 'Honda', array['2w', '4w']::public.vehicle_type[], 30),
  ('mahindra', 'Mahindra', array['3w', '4w']::public.vehicle_type[], 40),
  ('maruti-suzuki', 'Maruti Suzuki', array['4w']::public.vehicle_type[], 50),
  ('hyundai', 'Hyundai', array['4w']::public.vehicle_type[], 60),
  ('tata', 'Tata', array['4w']::public.vehicle_type[], 70),
  ('toyota', 'Toyota', array['4w']::public.vehicle_type[], 80),
  ('kia', 'Kia', array['4w']::public.vehicle_type[], 90),
  ('royal-enfield', 'Royal Enfield', array['2w']::public.vehicle_type[], 100),
  ('tvs', 'TVS', array['2w', '3w']::public.vehicle_type[], 110),
  ('suzuki', 'Suzuki', array['2w']::public.vehicle_type[], 120),
  ('piaggio', 'Piaggio', array['3w']::public.vehicle_type[], 130),
  ('renault', 'Renault', array['4w']::public.vehicle_type[], 140),
  ('volkswagen', 'Volkswagen', array['4w']::public.vehicle_type[], 150),
  ('skoda', 'Skoda', array['4w']::public.vehicle_type[], 160)
on conflict (code) do update set
  display_name = excluded.display_name,
  vehicle_types = excluded.vehicle_types,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.vehicle_models (code, make_code, vehicle_type, display_name, sort_order)
values
  ('bajaj-platina-100', 'bajaj', '2w', 'Platina 100', 10),
  ('bajaj-pulsar-125', 'bajaj', '2w', 'Pulsar 125', 20),
  ('bajaj-pulsar-150', 'bajaj', '2w', 'Pulsar 150', 30),
  ('bajaj-re', 'bajaj', '3w', 'RE', 40),
  ('bajaj-maxima-z', 'bajaj', '3w', 'Maxima Z', 50),
  ('hero-splendor-plus', 'hero', '2w', 'Splendor Plus', 60),
  ('hero-hf-deluxe', 'hero', '2w', 'HF Deluxe', 70),
  ('hero-passion-plus', 'hero', '2w', 'Passion Plus', 80),
  ('honda-activa-6g', 'honda', '2w', 'Activa 6G', 90),
  ('honda-shine-125', 'honda', '2w', 'Shine 125', 100),
  ('honda-unicorn', 'honda', '2w', 'Unicorn', 110),
  ('honda-city', 'honda', '4w', 'City', 120),
  ('honda-amaze', 'honda', '4w', 'Amaze', 130),
  ('honda-elevate', 'honda', '4w', 'Elevate', 140),
  ('mahindra-alfa-plus', 'mahindra', '3w', 'Alfa Plus', 150),
  ('mahindra-treo', 'mahindra', '3w', 'Treo', 160),
  ('mahindra-bolero', 'mahindra', '4w', 'Bolero', 170),
  ('mahindra-scorpio-n', 'mahindra', '4w', 'Scorpio-N', 180),
  ('mahindra-thar', 'mahindra', '4w', 'Thar', 190),
  ('mahindra-xuv700', 'mahindra', '4w', 'XUV700', 200),
  ('maruti-suzuki-alto-k10', 'maruti-suzuki', '4w', 'Alto K10', 210),
  ('maruti-suzuki-baleno', 'maruti-suzuki', '4w', 'Baleno', 220),
  ('maruti-suzuki-brezza', 'maruti-suzuki', '4w', 'Brezza', 230),
  ('maruti-suzuki-dzire', 'maruti-suzuki', '4w', 'Dzire', 240),
  ('maruti-suzuki-swift', 'maruti-suzuki', '4w', 'Swift', 250),
  ('maruti-suzuki-wagon-r', 'maruti-suzuki', '4w', 'Wagon R', 260),
  ('hyundai-creta', 'hyundai', '4w', 'Creta', 270),
  ('hyundai-grand-i10-nios', 'hyundai', '4w', 'Grand i10 Nios', 280),
  ('hyundai-i20', 'hyundai', '4w', 'i20', 290),
  ('hyundai-venue', 'hyundai', '4w', 'Venue', 300),
  ('hyundai-verna', 'hyundai', '4w', 'Verna', 310),
  ('tata-altroz', 'tata', '4w', 'Altroz', 320),
  ('tata-nexon', 'tata', '4w', 'Nexon', 330),
  ('tata-punch', 'tata', '4w', 'Punch', 340),
  ('tata-tiago', 'tata', '4w', 'Tiago', 350),
  ('toyota-fortuner', 'toyota', '4w', 'Fortuner', 360),
  ('toyota-glanza', 'toyota', '4w', 'Glanza', 370),
  ('toyota-innova-crysta', 'toyota', '4w', 'Innova Crysta', 380),
  ('kia-carens', 'kia', '4w', 'Carens', 390),
  ('kia-seltos', 'kia', '4w', 'Seltos', 400),
  ('kia-sonet', 'kia', '4w', 'Sonet', 410),
  ('royal-enfield-bullet-350', 'royal-enfield', '2w', 'Bullet 350', 420),
  ('royal-enfield-classic-350', 'royal-enfield', '2w', 'Classic 350', 430),
  ('royal-enfield-hunter-350', 'royal-enfield', '2w', 'Hunter 350', 440),
  ('tvs-apache-rtr-160', 'tvs', '2w', 'Apache RTR 160', 450),
  ('tvs-jupiter', 'tvs', '2w', 'Jupiter', 460),
  ('tvs-xl100', 'tvs', '2w', 'XL100', 470),
  ('tvs-king-duramax', 'tvs', '3w', 'King Duramax', 480),
  ('suzuki-access-125', 'suzuki', '2w', 'Access 125', 490),
  ('suzuki-gixxer', 'suzuki', '2w', 'Gixxer', 500),
  ('piaggio-ape-auto', 'piaggio', '3w', 'Ape Auto', 510),
  ('piaggio-ape-e-city', 'piaggio', '3w', 'Ape E-City', 520),
  ('renault-kiger', 'renault', '4w', 'Kiger', 530),
  ('renault-kwid', 'renault', '4w', 'Kwid', 540),
  ('renault-triber', 'renault', '4w', 'Triber', 550),
  ('volkswagen-polo', 'volkswagen', '4w', 'Polo', 560),
  ('volkswagen-taigun', 'volkswagen', '4w', 'Taigun', 570),
  ('skoda-kushaq', 'skoda', '4w', 'Kushaq', 580),
  ('skoda-slavia', 'skoda', '4w', 'Slavia', 590)
on conflict (code) do update set
  make_code = excluded.make_code,
  vehicle_type = excluded.vehicle_type,
  display_name = excluded.display_name,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.service_categories (code, display_name, description, sort_order)
values
  ('periodic-maintenance', 'Periodic Maintenance', 'Scheduled inspection, fluids, and filters.', 10),
  ('engine', 'Engine', 'Engine diagnosis and mechanical work.', 20),
  ('transmission-clutch', 'Transmission & Clutch', 'Gearbox, transmission, and clutch work.', 30),
  ('brakes', 'Brakes', 'Brake inspection and repair.', 40),
  ('electrical-battery', 'Electrical & Battery', 'Battery, charging, starting, wiring, and lights.', 50),
  ('tyres-wheels', 'Tyres & Wheels', 'Tyres, punctures, balancing, and alignment.', 60),
  ('suspension-steering', 'Suspension & Steering', 'Ride, suspension, and steering work.', 70),
  ('ac-cooling', 'AC & Cooling', 'Cabin AC and engine cooling systems.', 80),
  ('body-paint', 'Body & Paint', 'Collision, dent, paint, and corrosion work.', 90),
  ('washing-detailing', 'Washing & Detailing', 'Exterior and interior cleaning.', 100),
  ('emission-exhaust', 'Emission & Exhaust', 'Emission control and exhaust work.', 110),
  ('inspection-diagnostics', 'Inspection & Diagnostics', 'Inspection, scanning, and fault diagnosis.', 120),
  ('roadside-repair', 'Roadside Repair', 'Breakdown and roadside work.', 130),
  ('other', 'Other Service', 'Service not covered by the current taxonomy.', 999)
on conflict (code) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.failure_categories (code, display_name, recommended_service_code, sort_order)
values
  ('routine-no-fault', 'Routine service / no fault', 'periodic-maintenance', 10),
  ('engine-noise', 'Engine noise', 'engine', 20),
  ('engine-overheating', 'Engine overheating', 'engine', 30),
  ('engine-oil-leak', 'Engine oil leak', 'engine', 40),
  ('low-power', 'Low power / pickup', 'engine', 50),
  ('poor-mileage', 'Poor mileage', 'engine', 60),
  ('starting-issue', 'Starting issue', 'electrical-battery', 70),
  ('clutch-slip', 'Clutch slipping', 'transmission-clutch', 80),
  ('gear-shift-issue', 'Gear shifting issue', 'transmission-clutch', 90),
  ('brake-noise', 'Brake noise', 'brakes', 100),
  ('weak-braking', 'Weak braking', 'brakes', 110),
  ('battery-discharge', 'Battery discharge', 'electrical-battery', 120),
  ('charging-issue', 'Charging / alternator issue', 'electrical-battery', 130),
  ('electrical-fault', 'Electrical fault', 'electrical-battery', 140),
  ('warning-light', 'Dashboard warning light', 'inspection-diagnostics', 150),
  ('tyre-puncture', 'Tyre puncture', 'tyres-wheels', 160),
  ('uneven-tyre-wear', 'Uneven tyre wear', 'tyres-wheels', 170),
  ('wheel-alignment', 'Wheel alignment issue', 'tyres-wheels', 180),
  ('suspension-noise', 'Suspension noise', 'suspension-steering', 190),
  ('steering-issue', 'Steering issue', 'suspension-steering', 200),
  ('ac-not-cooling', 'AC not cooling', 'ac-cooling', 210),
  ('coolant-leak', 'Coolant leak', 'ac-cooling', 220),
  ('accident-damage', 'Accident damage', 'body-paint', 230),
  ('rust-corrosion', 'Rust / corrosion', 'body-paint', 240),
  ('exhaust-noise', 'Exhaust noise', 'emission-exhaust', 250),
  ('emission-failure', 'Emission test failure', 'emission-exhaust', 260),
  ('breakdown', 'Vehicle breakdown', 'roadside-repair', 270),
  ('other', 'Other / not classified', 'other', 999)
on conflict (code) do update set
  display_name = excluded.display_name,
  recommended_service_code = excluded.recommended_service_code,
  sort_order = excluded.sort_order,
  updated_at = now();

alter table public.service_records
  add column if not exists vehicle_type public.vehicle_type,
  add column if not exists vehicle_make_code text references public.vehicle_makes(code),
  add column if not exists vehicle_model_code text,
  add column if not exists vehicle_make_other text,
  add column if not exists vehicle_model_other text,
  add column if not exists model_year smallint,
  add column if not exists odometer_km integer,
  add column if not exists service_notes text,
  add column if not exists taxonomy_version smallint not null default 1;

update public.service_records
set vehicle_type = coalesce(vehicle_type, '4w'::public.vehicle_type),
    vehicle_make_other = coalesce(nullif(btrim(vehicle_make_other), ''), 'Unknown'),
    vehicle_model_other = coalesce(nullif(btrim(vehicle_model_other), ''), 'Unknown')
where vehicle_type is null
   or (vehicle_make_code is null and nullif(btrim(vehicle_make_other), '') is null)
   or (vehicle_model_code is null and nullif(btrim(vehicle_model_other), '') is null);

alter table public.service_records
  alter column vehicle_type set not null,
  add constraint service_records_vehicle_model_taxonomy_fkey
    foreign key (vehicle_model_code, vehicle_make_code, vehicle_type)
    references public.vehicle_models(code, make_code, vehicle_type),
  add constraint service_records_vehicle_make_required
    check (vehicle_make_code is not null or nullif(btrim(vehicle_make_other), '') is not null),
  add constraint service_records_vehicle_model_required
    check (vehicle_model_code is not null or nullif(btrim(vehicle_model_other), '') is not null),
  add constraint service_records_model_year_valid
    check (model_year is null or model_year between 1950 and 2100),
  add constraint service_records_odometer_valid
    check (odometer_km is null or odometer_km between 0 and 5000000),
  add constraint service_records_taxonomy_version_valid
    check (taxonomy_version > 0);

create table if not exists public.service_record_services (
  service_record_id uuid not null references public.service_records(id) on delete cascade,
  service_category_code text not null references public.service_categories(code),
  created_at timestamptz not null default now(),
  primary key (service_record_id, service_category_code)
);

create table if not exists public.service_record_failures (
  service_record_id uuid not null references public.service_records(id) on delete cascade,
  failure_category_code text not null references public.failure_categories(code),
  created_at timestamptz not null default now(),
  primary key (service_record_id, failure_category_code)
);

insert into public.service_record_services (service_record_id, service_category_code)
select id, 'periodic-maintenance'
from public.service_records
on conflict do nothing;

insert into public.service_record_failures (service_record_id, failure_category_code)
select id, 'routine-no-fault'
from public.service_records
on conflict do nothing;

create index if not exists idx_vehicle_models_make_type on public.vehicle_models(make_code, vehicle_type) where is_active = true;
create index if not exists idx_service_record_vehicle_taxonomy on public.service_records(vehicle_type, vehicle_make_code, vehicle_model_code);
create index if not exists idx_service_record_model_year on public.service_records(model_year);
create index if not exists idx_service_record_services_category on public.service_record_services(service_category_code);
create index if not exists idx_service_record_failures_category on public.service_record_failures(failure_category_code);

drop trigger if exists set_vehicle_makes_updated_at on public.vehicle_makes;
create trigger set_vehicle_makes_updated_at before update on public.vehicle_makes
for each row execute function public.set_updated_at();

drop trigger if exists set_vehicle_models_updated_at on public.vehicle_models;
create trigger set_vehicle_models_updated_at before update on public.vehicle_models
for each row execute function public.set_updated_at();

drop trigger if exists set_service_categories_updated_at on public.service_categories;
create trigger set_service_categories_updated_at before update on public.service_categories
for each row execute function public.set_updated_at();

drop trigger if exists set_failure_categories_updated_at on public.failure_categories;
create trigger set_failure_categories_updated_at before update on public.failure_categories
for each row execute function public.set_updated_at();

alter table public.vehicle_makes enable row level security;
alter table public.vehicle_models enable row level security;
alter table public.service_categories enable row level security;
alter table public.failure_categories enable row level security;
alter table public.service_record_services enable row level security;
alter table public.service_record_failures enable row level security;

create policy "vehicle makes public read" on public.vehicle_makes for select using (true);
create policy "vehicle models public read" on public.vehicle_models for select using (true);
create policy "service categories public read" on public.service_categories for select using (true);
create policy "failure categories public read" on public.failure_categories for select using (true);

create policy "service record services visible with record" on public.service_record_services
for select using (
  exists (select 1 from public.service_records sr where sr.id = service_record_id)
);

create policy "service record failures visible with record" on public.service_record_failures
for select using (
  exists (select 1 from public.service_records sr where sr.id = service_record_id)
);

grant select on public.vehicle_makes, public.vehicle_models, public.service_categories, public.failure_categories to anon, authenticated;
grant select on public.service_record_services, public.service_record_failures to authenticated;
