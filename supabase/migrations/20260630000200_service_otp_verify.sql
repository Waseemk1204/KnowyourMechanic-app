-- Service OTP verification.
-- The Edge Function holds the server pepper and computes the candidate hash from
-- the stored per-row salt, then calls this RPC with the candidate. Ownership,
-- expiry, attempt limits, single-use, and the record state transition are all
-- enforced here in one transaction.
--
-- Wrong-OTP is returned (ok=false), not raised, so the incremented attempt
-- counter is persisted instead of being rolled back by the exception.

create or replace function public.verify_service_otp(
  p_service_record_id uuid,
  p_otp_hash_candidate text
)
returns table (
  ok boolean,
  reason text,
  remaining_attempts integer,
  status public.service_record_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_garage_id uuid;
  v_otp record;
begin
  select garage_id into v_garage_id
  from public.service_records
  where id = p_service_record_id;

  if v_garage_id is null then
    raise exception 'Service record not found' using errcode = 'P0002';
  end if;

  if not (public.owns_garage(v_garage_id) or public.is_admin()) then
    raise exception 'Not authorized for this service record' using errcode = '42501';
  end if;

  select *
    into v_otp
  from public.service_otps
  where service_record_id = p_service_record_id
    and consumed = false
    and verified_at is null
  order by created_at desc
  limit 1
  for update;

  if v_otp.id is null then
    raise exception 'No pending OTP for this service record' using errcode = 'P0002';
  end if;

  if v_otp.expires_at < now() then
    update public.service_otps set consumed = true where id = v_otp.id;
    return query select false, 'expired', 0, 'pending_otp'::public.service_record_status;
    return;
  end if;

  if v_otp.attempt_count >= v_otp.max_attempts then
    update public.service_otps set consumed = true where id = v_otp.id;
    return query select false, 'locked', 0, 'pending_otp'::public.service_record_status;
    return;
  end if;

  if v_otp.otp_hash <> p_otp_hash_candidate then
    update public.service_otps
      set attempt_count = attempt_count + 1
      where id = v_otp.id;
    return query
      select false, 'invalid',
             greatest(v_otp.max_attempts - (v_otp.attempt_count + 1), 0),
             'pending_otp'::public.service_record_status;
    return;
  end if;

  -- Correct OTP: single-use consume + advance the service record.
  update public.service_otps
    set verified_at = now(), consumed = true
    where id = v_otp.id;

  update public.service_records
    set status = 'otp_verified', approved_by_customer = true
    where id = p_service_record_id;

  return query select true, 'verified', 0, 'otp_verified'::public.service_record_status;
end;
$$;

revoke all on function public.verify_service_otp(uuid, text) from public;
grant execute on function public.verify_service_otp(uuid, text) to authenticated;
