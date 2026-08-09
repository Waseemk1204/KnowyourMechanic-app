-- Housekeeping: abandoned pending_otp service records (customer never confirmed)
-- have no cleanup path now that direct deletes are revoked from clients. Their
-- OTP expires in minutes, so anything still pending after a day is dead — remove
-- it so garages' service lists and the table stay clean. Deleting a pending_otp
-- record cascades to its OTP + delivery rows; no payment or invoice ever existed.
-- Idempotent.

create or replace function public.purge_stale_pending_service_records(
  p_older_than interval default interval '24 hours'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with del as (
    delete from public.service_records
    where status = 'pending_otp'
      and created_at < now() - p_older_than
    returning id
  )
  select count(*) into v_count from del;
  return v_count;
end;
$$;

-- Run it daily if pg_cron is available (best-effort — an admin/service role can
-- also call the function manually). Skipped cleanly if pg_cron isn't enabled.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'purge-stale-pending-services') then
      perform cron.unschedule('purge-stale-pending-services');
    end if;
    perform cron.schedule(
      'purge-stale-pending-services',
      '17 2 * * *',
      'select public.purge_stale_pending_service_records();'
    );
  end if;
end $$;
