-- KnowYourMechanic Phase 1 core schema

create extension if not exists "pgcrypto";

do $$ begin
  create type public.app_role as enum ('customer', 'garage', 'admin', 'employee');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.business_type as enum ('individual', 'partnership', 'proprietorship', 'private_limited', 'public_limited');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.onboarding_status as enum ('pending', 'bank_details', 'verification', 'completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.booking_status as enum ('pending', 'accepted', 'rejected', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.service_record_status as enum ('pending_otp', 'otp_verified', 'payment_pending', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('cash', 'razorpay');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.verification_method as enum ('whatsapp_otp', 'in_app');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.report_status as enum ('pending', 'reviewing', 'resolved', 'dismissed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invoice_delivery_channel as enum ('push', 'whatsapp', 'manual', 'none');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invoice_notification_status as enum ('pending', 'sent', 'failed', 'fallback_sent', 'not_required');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_type as enum ('service_approval', 'invoice_ready', 'booking_update', 'report_update');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_status as enum ('pending', 'sent', 'failed', 'read');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  phone_number text not null unique,
  role public.app_role not null,
  name text,
  vehicle_make text,
  vehicle_model text,
  vehicle_year text,
  vehicle_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_devices (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  push_token text not null,
  platform text not null check (platform in ('android', 'ios', 'web')),
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, push_token)
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  email text,
  phone text not null unique,
  referral_code text not null unique,
  role public.app_role not null default 'employee',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.garages (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  assigned_employee_id uuid references public.employees(id) on delete set null,
  name text not null,
  email text,
  phone text,
  address text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  service_hours text,
  working_days text[] not null default array['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  photo_url text,
  rating numeric(3, 2) not null default 0,
  total_reviews integer not null default 0,
  business_type public.business_type not null default 'individual',
  legal_business_name text,
  bank_account_number text,
  bank_ifsc_code text,
  bank_account_holder_name text,
  bank_name text,
  razorpay_account_id text,
  onboarding_status public.onboarding_status not null default 'pending',
  is_verified boolean not null default false,
  referral_code text unique,
  fraud_strikes integer not null default 0,
  penalty_amount numeric(12, 2) not null default 0,
  is_offboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.garage_services (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  name text not null,
  description text,
  price numeric(12, 2) not null check (price >= 0),
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_profile_id uuid not null references public.profiles(id) on delete cascade,
  garage_id uuid not null references public.garages(id) on delete cascade,
  service_id uuid references public.garage_services(id) on delete set null,
  customer_phone text not null,
  vehicle_number text,
  description text,
  scheduled_at timestamptz,
  status public.booking_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_records (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  customer_profile_id uuid references public.profiles(id) on delete set null,
  customer_phone text not null,
  garage_name text not null,
  vehicle_number text,
  description text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  platform_fee numeric(12, 2) not null default 0,
  garage_earnings numeric(12, 2) not null default 0,
  payment_method public.payment_method,
  status public.service_record_status not null default 'pending_otp',
  is_reliable boolean not null default true,
  verification_method public.verification_method,
  approved_by_customer boolean,
  razorpay_order_id text,
  razorpay_payment_id text,
  invoice_number text unique,
  invoice_delivery_channel public.invoice_delivery_channel not null default 'none',
  invoice_notification_status public.invoice_notification_status not null default 'not_required',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  customer_profile_id uuid not null references public.profiles(id) on delete cascade,
  garage_id uuid not null references public.garages(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_profile_id, garage_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_profile_id uuid not null references public.profiles(id) on delete cascade,
  garage_id uuid not null references public.garages(id) on delete cascade,
  service_record_id uuid references public.service_records(id) on delete set null,
  reason text not null,
  description text,
  evidence_urls text[] not null default '{}',
  status public.report_status not null default 'pending',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  service_record_id uuid references public.service_records(id) on delete set null,
  customer_profile_id uuid references public.profiles(id) on delete set null,
  garage_id uuid references public.garages(id) on delete set null,
  amount numeric(12, 2) not null check (amount >= 0),
  platform_fee numeric(12, 2) not null default 0,
  method public.payment_method,
  provider text,
  provider_payment_id text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  service_record_id uuid references public.service_records(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text,
  payload jsonb not null default '{}'::jsonb,
  channel public.invoice_delivery_channel,
  status public.notification_status not null default 'pending',
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
