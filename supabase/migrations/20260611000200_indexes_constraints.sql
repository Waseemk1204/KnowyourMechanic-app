-- KnowYourMechanic Phase 1 indexes, constraints, and timestamp triggers

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create index if not exists idx_profiles_auth_user_id on public.profiles(auth_user_id);
create index if not exists idx_profiles_phone_number on public.profiles(phone_number);
create index if not exists idx_profiles_role on public.profiles(role);

create index if not exists idx_user_devices_profile_id on public.user_devices(profile_id);
create index if not exists idx_user_devices_active on public.user_devices(is_active) where is_active = true;

create index if not exists idx_employees_profile_id on public.employees(profile_id);
create index if not exists idx_employees_referral_code on public.employees(referral_code);
create index if not exists idx_employees_active on public.employees(is_active);

create index if not exists idx_garages_owner_profile_id on public.garages(owner_profile_id);
create index if not exists idx_garages_assigned_employee_id on public.garages(assigned_employee_id);
create index if not exists idx_garages_onboarding_status on public.garages(onboarding_status);
create index if not exists idx_garages_is_verified on public.garages(is_verified);
create index if not exists idx_garages_referral_code on public.garages(referral_code);
create index if not exists idx_garages_location on public.garages(latitude, longitude);
create index if not exists idx_garages_offboarded on public.garages(is_offboarded);

create index if not exists idx_garage_services_garage_id on public.garage_services(garage_id);
create index if not exists idx_garage_services_active on public.garage_services(is_active);

create index if not exists idx_bookings_customer_profile_id on public.bookings(customer_profile_id);
create index if not exists idx_bookings_garage_id on public.bookings(garage_id);
create index if not exists idx_bookings_status on public.bookings(status);
create index if not exists idx_bookings_scheduled_at on public.bookings(scheduled_at);

create index if not exists idx_service_records_garage_id on public.service_records(garage_id);
create index if not exists idx_service_records_customer_profile_id on public.service_records(customer_profile_id);
create index if not exists idx_service_records_customer_phone on public.service_records(customer_phone);
create index if not exists idx_service_records_status on public.service_records(status);
create index if not exists idx_service_records_created_at on public.service_records(created_at desc);
create index if not exists idx_service_records_invoice_number on public.service_records(invoice_number);

create index if not exists idx_reviews_customer_profile_id on public.reviews(customer_profile_id);
create index if not exists idx_reviews_garage_id on public.reviews(garage_id);

create index if not exists idx_reports_reporter_profile_id on public.reports(reporter_profile_id);
create index if not exists idx_reports_garage_id on public.reports(garage_id);
create index if not exists idx_reports_service_record_id on public.reports(service_record_id);
create index if not exists idx_reports_status on public.reports(status);

create index if not exists idx_payments_booking_id on public.payments(booking_id);
create index if not exists idx_payments_service_record_id on public.payments(service_record_id);
create index if not exists idx_payments_customer_profile_id on public.payments(customer_profile_id);
create index if not exists idx_payments_garage_id on public.payments(garage_id);
create index if not exists idx_payments_status on public.payments(status);

create index if not exists idx_notifications_profile_id on public.notifications(profile_id);
create index if not exists idx_notifications_service_record_id on public.notifications(service_record_id);
create index if not exists idx_notifications_type on public.notifications(type);
create index if not exists idx_notifications_status on public.notifications(status);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_user_devices_updated_at on public.user_devices;
create trigger set_user_devices_updated_at before update on public.user_devices
for each row execute function public.set_updated_at();

drop trigger if exists set_employees_updated_at on public.employees;
create trigger set_employees_updated_at before update on public.employees
for each row execute function public.set_updated_at();

drop trigger if exists set_garages_updated_at on public.garages;
create trigger set_garages_updated_at before update on public.garages
for each row execute function public.set_updated_at();

drop trigger if exists set_garage_services_updated_at on public.garage_services;
create trigger set_garage_services_updated_at before update on public.garage_services
for each row execute function public.set_updated_at();

drop trigger if exists set_bookings_updated_at on public.bookings;
create trigger set_bookings_updated_at before update on public.bookings
for each row execute function public.set_updated_at();

drop trigger if exists set_service_records_updated_at on public.service_records;
create trigger set_service_records_updated_at before update on public.service_records
for each row execute function public.set_updated_at();

drop trigger if exists set_reviews_updated_at on public.reviews;
create trigger set_reviews_updated_at before update on public.reviews
for each row execute function public.set_updated_at();

drop trigger if exists set_reports_updated_at on public.reports;
create trigger set_reports_updated_at before update on public.reports
for each row execute function public.set_updated_at();

drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at before update on public.payments
for each row execute function public.set_updated_at();

drop trigger if exists set_notifications_updated_at on public.notifications;
create trigger set_notifications_updated_at before update on public.notifications
for each row execute function public.set_updated_at();
