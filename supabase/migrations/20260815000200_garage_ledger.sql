-- Garage ledger: an append-only record of amounts a garage OWES KnowYourMechanic
-- and the recoveries that net them down. Serves two flows:
--   * accrued platform fees KYM couldn't collect at source (e.g. post-cap
--     garage-UPI transactions), and
--   * charged-back / refunded payments KYM had already paid out (decision #3).
-- Recovery entries (negative) are added when KYM deducts the owed amount from a
-- future online payout. Current balance = sum(amount): positive means the garage
-- still owes KYM. Idempotent.

create table if not exists public.garage_ledger (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  entry_type text not null,                 -- fee_accrued | chargeback | recovery | adjustment
  amount numeric not null,                  -- +ve: garage owes KYM; -ve: recovered / credited
  service_record_id uuid references public.service_records(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.garage_ledger
  drop constraint if exists garage_ledger_entry_type_chk;
alter table public.garage_ledger
  add constraint garage_ledger_entry_type_chk
  check (entry_type in ('fee_accrued', 'chargeback', 'recovery', 'adjustment'));

create index if not exists idx_garage_ledger_garage on public.garage_ledger(garage_id);

-- Read-only for the garage (its own) + admins; all writes are server-side
-- (the payout/webhook edge functions use the service role, bypassing RLS).
alter table public.garage_ledger enable row level security;
drop policy if exists "ledger owner or admin read" on public.garage_ledger;
create policy "ledger owner or admin read" on public.garage_ledger
  for select using (public.owns_garage(garage_id) or public.is_admin());

grant select on public.garage_ledger to authenticated;

-- Current outstanding balance a garage owes KYM (0 when settled).
create or replace function public.garage_owed_balance(p_garage_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(amount), 0) from public.garage_ledger where garage_id = p_garage_id;
$$;

grant execute on function public.garage_owed_balance(uuid) to authenticated;
