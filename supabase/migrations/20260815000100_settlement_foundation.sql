-- Settlement foundation for the "collect via Razorpay (T+1) → instant garage
-- payout via IndusInd (from float)" model. Provider-agnostic groundwork:
-- beneficiary tracking + a payouts ledger with strict idempotency and
-- reconciliation state. The Razorpay/IndusInd edge functions (created once the
-- API creds + contracts are in hand) write to these. Idempotent.

-- 1. Beneficiary registration (auto-added on onboarding via the IndusInd API) --
alter table public.garage_payout_details
  add column if not exists beneficiary_id text,
  add column if not exists beneficiary_status text not null default 'pending',
  add column if not exists beneficiary_registered_at timestamptz;

-- 'pending' (bank details saved, not yet registered), 'active' (registered and
-- payable), 'failed' (registration rejected — surfaces for retry). Kept as text
-- (not an enum) so states can evolve without a migration.
alter table public.garage_payout_details
  drop constraint if exists garage_payout_details_beneficiary_status_chk;
alter table public.garage_payout_details
  add constraint garage_payout_details_beneficiary_status_chk
  check (beneficiary_status in ('pending', 'active', 'failed'));

-- 2. Payout ledger ---------------------------------------------------------
-- One row per garage payout. UNIQUE(service_record_id) is the idempotency
-- guard: a Razorpay webhook firing twice can never double-pay a garage.
create table if not exists public.garage_payouts (
  id uuid primary key default gen_random_uuid(),
  service_record_id uuid not null references public.service_records(id) on delete cascade,
  garage_id uuid not null references public.garages(id) on delete cascade,
  amount numeric not null,                 -- garage earnings (service amount, fee excluded)
  rail text not null default 'neft',       -- 'imps' | 'neft' (chosen per banking-hours logic)
  razorpay_payment_id text,                -- the captured collection that funds this payout
  provider_reference text,                 -- our reference sent to IndusInd
  utr text,                                -- bank UTR once processed
  status text not null default 'pending',  -- pending|processing|sent|failed|reconciled
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (service_record_id)
);

alter table public.garage_payouts
  drop constraint if exists garage_payouts_rail_chk;
alter table public.garage_payouts
  add constraint garage_payouts_rail_chk check (rail in ('imps', 'neft'));
alter table public.garage_payouts
  drop constraint if exists garage_payouts_status_chk;
alter table public.garage_payouts
  add constraint garage_payouts_status_chk
  check (status in ('pending', 'processing', 'sent', 'failed', 'reconciled'));

create index if not exists idx_garage_payouts_garage on public.garage_payouts(garage_id);
create index if not exists idx_garage_payouts_status on public.garage_payouts(status);
create index if not exists idx_garage_payouts_razorpay on public.garage_payouts(razorpay_payment_id);

-- 3. Access rules ----------------------------------------------------------
alter table public.garage_payouts enable row level security;

-- A garage sees its own payouts; admins see all. Writes are server-only
-- (the webhook/payout edge functions use the service role, which bypasses RLS),
-- so there is deliberately NO client insert/update/delete policy.
drop policy if exists "payouts owner or admin read" on public.garage_payouts;
create policy "payouts owner or admin read" on public.garage_payouts
  for select using (public.owns_garage(garage_id) or public.is_admin());

grant select on public.garage_payouts to authenticated;

drop trigger if exists set_garage_payouts_updated_at on public.garage_payouts;
create trigger set_garage_payouts_updated_at
  before update on public.garage_payouts
  for each row execute function public.set_updated_at();
