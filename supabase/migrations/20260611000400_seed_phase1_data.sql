-- KnowYourMechanic Phase 1 seed data

insert into public.profiles (id, phone_number, role, name, vehicle_make, vehicle_model, vehicle_year, vehicle_number)
values
  ('00000000-0000-0000-0000-000000000001', '9321495344', 'admin', 'KYM Admin', null, null, null, null),
  ('00000000-0000-0000-0000-000000000002', '1234567890', 'garage', 'Demo Garage Owner', null, null, null, null),
  ('00000000-0000-0000-0000-000000000003', '9876543210', 'customer', 'Demo Customer', 'Maruti', 'Swift', '2020', 'MH12AB1234')
on conflict (phone_number) do update
set role = excluded.role,
    name = excluded.name,
    vehicle_make = excluded.vehicle_make,
    vehicle_model = excluded.vehicle_model,
    vehicle_year = excluded.vehicle_year,
    vehicle_number = excluded.vehicle_number;

insert into public.employees (id, name, email, phone, referral_code, role, is_active)
select
  ('10000000-0000-0000-0000-' || lpad(gs::text, 12, '0'))::uuid,
  'Field Executive ' || gs,
  'employee' || gs || '@knowyourmechanic.local',
  '90000000' || lpad(gs::text, 2, '0'),
  'KYM' || (1000 + gs),
  'employee',
  true
from generate_series(1, 8) as gs
on conflict (phone) do nothing;

insert into public.garages (
  id,
  owner_profile_id,
  assigned_employee_id,
  name,
  email,
  phone,
  address,
  latitude,
  longitude,
  service_hours,
  rating,
  total_reviews,
  business_type,
  legal_business_name,
  onboarding_status,
  is_verified,
  referral_code
)
values (
  '20000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001',
  'KYM Demo Garage',
  'garage0@knowyourmechanic.local',
  '1234567890',
  'Kothrud, Pune, Maharashtra',
  18.5074000,
  73.8077000,
  '09:00 - 20:00',
  4.6,
  42,
  'proprietorship',
  'KYM Demo Garage',
  'completed',
  true,
  'GAR1000'
)
on conflict (referral_code) do nothing;

with areas(area, lat, lng) as (
  values
    ('Shivajinagar', 18.5308, 73.8567),
    ('Kothrud', 18.5074, 73.8077),
    ('Baner', 18.5590, 73.7898),
    ('Wakad', 18.5975, 73.7633),
    ('Hinjewadi', 18.5913, 73.7389),
    ('Viman Nagar', 18.5679, 73.9143),
    ('Kharadi', 18.5515, 73.9446),
    ('Hadapsar', 18.5089, 73.9272),
    ('Koregaon Park', 18.5362, 73.8958),
    ('Aundh', 18.5593, 73.8073),
    ('Pimpri', 18.6298, 73.8037),
    ('Chinchwad', 18.6290, 73.7997),
    ('Swargate', 18.5018, 73.8636),
    ('Camp', 18.5122, 73.8797),
    ('Katraj', 18.4529, 73.8586),
    ('Bavdhan', 18.5183, 73.7790),
    ('Magarpatta', 18.5158, 73.9325),
    ('Kondhwa', 18.4775, 73.8914),
    ('Sinhagad Road', 18.4807, 73.8194),
    ('Warje', 18.4867, 73.7984)
),
numbered as (
  select gs, area, lat, lng
  from generate_series(1, 200) as gs
  join lateral (
    select * from areas
    offset ((gs - 1) % 20)
    limit 1
  ) a on true
)
insert into public.garages (
  id,
  owner_profile_id,
  assigned_employee_id,
  name,
  email,
  phone,
  address,
  latitude,
  longitude,
  service_hours,
  rating,
  total_reviews,
  business_type,
  legal_business_name,
  onboarding_status,
  is_verified,
  referral_code
)
select
  ('20000000-0000-0000-0000-' || lpad(gs::text, 12, '0'))::uuid,
  '00000000-0000-0000-0000-000000000002',
  ('10000000-0000-0000-0000-' || lpad((((gs - 1) % 8) + 1)::text, 12, '0'))::uuid,
  area || ' Auto Care ' || gs,
  'garage' || gs || '@knowyourmechanic.local',
  '98' || lpad(gs::text, 8, '0'),
  area || ', Pune, Maharashtra',
  lat + (((gs % 7) - 3) * 0.003),
  lng + (((gs % 9) - 4) * 0.003),
  '09:00 - 20:00',
  round((3.8 + ((gs % 12)::numeric / 10))::numeric, 2),
  5 + (gs % 95),
  'proprietorship',
  area || ' Auto Care ' || gs,
  'completed',
  (gs % 5) <> 0,
  'GAR' || (1000 + gs)
from numbered
on conflict (referral_code) do nothing;

insert into public.garage_services (garage_id, name, description, price, duration_minutes, is_active)
select
  g.id,
  service_name,
  service_name || ' for petrol and diesel vehicles',
  500 + (service_index * 350) + ((row_number() over (partition by service_name order by g.created_at, g.id)) % 5) * 100,
  30 + (service_index * 20),
  true
from public.garages g
cross join (
  values
    (0, 'Oil Change'),
    (1, 'Brake Repair'),
    (2, 'AC Service'),
    (3, 'Battery Check'),
    (4, 'Wheel Alignment'),
    (5, 'Full Service')
) services(service_index, service_name)
where g.referral_code like 'GAR%'
  and not exists (
    select 1 from public.garage_services s
    where s.garage_id = g.id and s.name = services.service_name
  );

insert into public.bookings (
  id,
  customer_profile_id,
  garage_id,
  customer_phone,
  vehicle_number,
  description,
  scheduled_at,
  status
)
select
  ('30000000-0000-0000-0000-' || lpad(gs::text, 12, '0'))::uuid,
  '00000000-0000-0000-0000-000000000003',
  ('20000000-0000-0000-0000-' || lpad(((gs % 200) + 1)::text, 12, '0'))::uuid,
  '9876543210',
  'MH12KY' || lpad(gs::text, 4, '0'),
  'Seed booking ' || gs,
  now() + (gs || ' days')::interval,
  case when gs % 4 = 0 then 'completed'::public.booking_status else 'pending'::public.booking_status end
from generate_series(1, 40) as gs
on conflict (id) do nothing;

insert into public.service_records (
  id,
  garage_id,
  customer_profile_id,
  customer_phone,
  garage_name,
  vehicle_number,
  description,
  amount,
  platform_fee,
  garage_earnings,
  payment_method,
  status,
  is_reliable,
  verification_method,
  approved_by_customer,
  invoice_number,
  invoice_delivery_channel,
  invoice_notification_status
)
select
  ('40000000-0000-0000-0000-' || lpad(gs::text, 12, '0'))::uuid,
  g.id,
  '00000000-0000-0000-0000-000000000003',
  '9876543210',
  g.name,
  'MH12KY' || lpad(gs::text, 4, '0'),
  'Seed service record ' || gs,
  700 + (gs % 12) * 250,
  1.90,
  700 + (gs % 12) * 250,
  case when gs % 3 = 0 then 'razorpay'::public.payment_method else 'cash'::public.payment_method end,
  'completed',
  (gs % 3 = 0),
  case when gs % 2 = 0 then 'in_app'::public.verification_method else 'whatsapp_otp'::public.verification_method end,
  true,
  'KYM-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(gs::text, 5, '0'),
  case when gs % 2 = 0 then 'push'::public.invoice_delivery_channel else 'whatsapp'::public.invoice_delivery_channel end,
  'sent'
from generate_series(1, 120) as gs
join public.garages g on g.id = ('20000000-0000-0000-0000-' || lpad(((gs % 200) + 1)::text, 12, '0'))::uuid
on conflict (id) do nothing;

insert into public.reviews (customer_profile_id, garage_id, rating, comment)
select
  '00000000-0000-0000-0000-000000000003',
  ('20000000-0000-0000-0000-' || lpad(gs::text, 12, '0'))::uuid,
  4 + (gs % 2),
  'Good service and quick response.'
from generate_series(1, 60) as gs
on conflict (customer_profile_id, garage_id) do nothing;

insert into public.reports (
  id,
  reporter_profile_id,
  garage_id,
  service_record_id,
  reason,
  description,
  evidence_urls,
  status,
  admin_notes
)
select
  ('50000000-0000-0000-0000-' || lpad(gs::text, 12, '0'))::uuid,
  '00000000-0000-0000-0000-000000000003',
  ('20000000-0000-0000-0000-' || lpad(gs::text, 12, '0'))::uuid,
  ('40000000-0000-0000-0000-' || lpad(gs::text, 12, '0'))::uuid,
  case when gs % 3 = 0 then 'pricing' else 'service_quality' end,
  'Seed report ' || gs,
  array['https://example.com/evidence/' || gs || '.jpg'],
  case
    when gs % 4 = 0 then 'resolved'::public.report_status
    when gs % 3 = 0 then 'reviewing'::public.report_status
    else 'pending'::public.report_status
  end,
  'Seed admin note'
from generate_series(1, 30) as gs
on conflict (id) do nothing;

insert into public.payments (
  service_record_id,
  customer_profile_id,
  garage_id,
  amount,
  platform_fee,
  method,
  provider,
  status
)
select
  sr.id,
  sr.customer_profile_id,
  sr.garage_id,
  sr.amount,
  sr.platform_fee,
  sr.payment_method,
  case when sr.payment_method = 'razorpay' then 'razorpay' else 'cash' end,
  'completed'
from public.service_records sr
where sr.status = 'completed'
  and not exists (select 1 from public.payments p where p.service_record_id = sr.id);

insert into public.notifications (
  profile_id,
  service_record_id,
  type,
  title,
  body,
  payload,
  channel,
  status
)
select
  sr.customer_profile_id,
  sr.id,
  'invoice_ready',
  'Invoice ready',
  'Your KnowYourMechanic invoice is ready to download.',
  jsonb_build_object('serviceRecordId', sr.id, 'invoiceNumber', sr.invoice_number),
  sr.invoice_delivery_channel,
  'sent'
from public.service_records sr
where sr.customer_profile_id is not null
  and sr.invoice_number is not null
  and not exists (select 1 from public.notifications n where n.service_record_id = sr.id and n.type = 'invoice_ready');
