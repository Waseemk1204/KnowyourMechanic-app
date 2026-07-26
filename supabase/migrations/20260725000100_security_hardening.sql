-- Security hardening. Idempotent; safe to run more than once.
--
-- 1. Garage bank / Razorpay details were columns on the publicly-readable
--    `garages` table (anon has SELECT, and any verified garage row is world-
--    readable) — so the public key could read every garage's bank account.
--    Move them to a private table that only the owning garage + admins can read.
-- 2. Clients could directly INSERT/UPDATE service_records and payments, which
--    bypasses the OTP + payment state machine (a garage could self-complete a
--    service or fabricate a payment). Force all state changes through the
--    SECURITY DEFINER RPCs; leave clients only the customer's approve toggle.
-- 3. Resolved reports were readable by every authenticated user, leaking the
--    reporter's identity. Restrict to the people actually involved (+ support).

-- 1. Private payout details -------------------------------------------------
create table if not exists public.garage_payout_details (
  garage_id uuid primary key references public.garages(id) on delete cascade,
  bank_account_number text,
  bank_ifsc_code text,
  bank_account_holder_name text,
  bank_name text,
  razorpay_account_id text,
  updated_at timestamptz not null default now()
);

alter table public.garage_payout_details enable row level security;

drop policy if exists "payout owner or admin read" on public.garage_payout_details;
create policy "payout owner or admin read" on public.garage_payout_details
  for select using (public.owns_garage(garage_id) or public.is_admin());

drop policy if exists "payout owner or admin write" on public.garage_payout_details;
create policy "payout owner or admin write" on public.garage_payout_details
  for all using (public.owns_garage(garage_id) or public.is_admin())
  with check (public.owns_garage(garage_id) or public.is_admin());

grant select, insert, update, delete on public.garage_payout_details to authenticated;

-- Move any existing data across before dropping the columns.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'garages'
      and column_name = 'bank_account_number'
  ) then
    insert into public.garage_payout_details
      (garage_id, bank_account_number, bank_ifsc_code, bank_account_holder_name, bank_name, razorpay_account_id)
    select id, bank_account_number, bank_ifsc_code, bank_account_holder_name, bank_name, razorpay_account_id
    from public.garages
    where bank_account_number is not null or bank_ifsc_code is not null
       or bank_account_holder_name is not null or bank_name is not null
       or razorpay_account_id is not null
    on conflict (garage_id) do nothing;
  end if;
end $$;

alter table public.garages
  drop column if exists bank_account_number,
  drop column if exists bank_ifsc_code,
  drop column if exists bank_account_holder_name,
  drop column if exists bank_name,
  drop column if exists razorpay_account_id;

-- 2a. service_records: clients may only toggle approved_by_customer. Creation,
--     OTP verification and payment all run through SECURITY DEFINER RPCs (which
--     execute as the table owner and are unaffected by these grants).
revoke insert, update, delete on public.service_records from authenticated;
grant update (approved_by_customer) on public.service_records to authenticated;

-- 2b. payments: read-only for involved parties. Only the payment RPC writes.
drop policy if exists "payments involved parties write" on public.payments;
revoke insert, update, delete on public.payments from authenticated;

-- 3. reports: remove the blanket "resolved is public" read.
drop policy if exists "reports select allowed" on public.reports;
create policy "reports select allowed" on public.reports
  for select using (
    public.is_admin()
    or reporter_profile_id = public.current_profile_id()
    or public.owns_garage(garage_id)
  );
