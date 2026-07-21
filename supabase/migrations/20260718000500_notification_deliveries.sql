-- Phase 2 — Delivery tracking + ack (channel-agnostic backbone).
-- Every OTP/invoice delivery attempt is recorded here. The app calls
-- ack_notification_delivery() when it actually receives a push, which is the
-- signal that a live app got it. The Phase-4 fallback worker scans this table
-- for push deliveries that passed their deadline without an ack and routes them
-- to WhatsApp. No FCM/WhatsApp dependency yet — this is pure state.

do $$ begin
  create type public.delivery_kind as enum ('otp', 'invoice');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.delivery_channel as enum ('push', 'whatsapp');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.delivery_state as enum ('sent', 'acked', 'fallback', 'failed');
exception when duplicate_object then null; end $$;

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  service_record_id uuid not null references public.service_records(id) on delete cascade,
  recipient_profile_id uuid references public.profiles(id) on delete set null,
  recipient_phone text not null,
  kind public.delivery_kind not null,
  channel public.delivery_channel not null,
  state public.delivery_state not null default 'sent',
  push_deadline_at timestamptz,          -- give up waiting for ack after this (push only)
  sent_at timestamptz not null default now(),
  acked_at timestamptz,
  fell_back_at timestamptz,
  provider_message_id text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The fallback worker scans (channel, state, push_deadline_at); recipients read their own.
create index if not exists notification_deliveries_worker_idx
  on public.notification_deliveries (channel, state, push_deadline_at);
create index if not exists notification_deliveries_record_idx
  on public.notification_deliveries (service_record_id);
create index if not exists notification_deliveries_recipient_idx
  on public.notification_deliveries (recipient_phone);

drop trigger if exists set_notification_deliveries_updated_at on public.notification_deliveries;
create trigger set_notification_deliveries_updated_at
  before update on public.notification_deliveries
  for each row execute function public.set_updated_at();

-- ---- RLS ----
alter table public.notification_deliveries enable row level security;

-- Recipients see their own deliveries; support/admin see all. All writes go
-- through the SECURITY DEFINER functions below (no direct client insert/update).
create policy "notification deliveries visible" on public.notification_deliveries
for select using (
  recipient_profile_id = public.current_profile_id()
  or recipient_phone = public.current_phone_number()
  or public.is_support()
  or public.is_admin()
);

-- ---- functions ----

-- Record a delivery attempt for a service record. Guarded to the owning garage
-- or an admin (Edge Functions using the service role bypass RLS regardless).
create or replace function public.create_notification_delivery(
  p_service_record_id uuid,
  p_kind public.delivery_kind,
  p_channel public.delivery_channel,
  p_ack_window_seconds integer default 45
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec public.service_records;
  v_id uuid;
begin
  select * into v_rec from public.service_records where id = p_service_record_id;
  if v_rec.id is null then
    raise exception 'service record not found' using errcode = 'P0002';
  end if;
  if not (public.owns_garage(v_rec.garage_id) or public.is_admin()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  insert into public.notification_deliveries (
    service_record_id, recipient_profile_id, recipient_phone, kind, channel, state,
    push_deadline_at
  ) values (
    v_rec.id, v_rec.customer_profile_id, v_rec.customer_phone, p_kind, p_channel, 'sent',
    case when p_channel = 'push' then now() + make_interval(secs => greatest(p_ack_window_seconds, 5)) else null end
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- The recipient app calls this when it receives a push (delivery id is in the
-- push payload). Marks the delivery acknowledged so the fallback worker skips it.
create or replace function public.ack_notification_delivery(p_delivery_id uuid)
returns public.notification_deliveries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.notification_deliveries;
begin
  update public.notification_deliveries
  set state = 'acked', acked_at = now(), updated_at = now()
  where id = p_delivery_id
    and state = 'sent'
    and (
      recipient_profile_id = public.current_profile_id()
      or recipient_phone = public.current_phone_number()
    )
  returning * into v_row;

  if v_row.id is null then
    -- Either not the recipient, or not in an ackable state; surface a clear error.
    raise exception 'delivery not found or not ackable' using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

grant execute on function public.create_notification_delivery(uuid, public.delivery_kind, public.delivery_channel, integer) to authenticated;
grant execute on function public.ack_notification_delivery(uuid) to authenticated;
