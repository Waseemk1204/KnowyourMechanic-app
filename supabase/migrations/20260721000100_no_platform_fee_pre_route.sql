-- Pre-Route policy: the garage keeps 100% and there is NO platform fee until
-- their Razorpay Route linked account is KYC-verified. Until Route is live there
-- is no way to actually collect a fee, so the old ₹1.90 customer surcharge was a
-- phantom charge — zero it. When Route ships, the fee becomes conditional on the
-- garage's linked-account being active (handled in the Route build).
create or replace function public.complete_service_payment(
  p_service_record_id uuid,
  p_payment_method text
)
returns table (
  invoice_number text,
  status public.service_record_status,
  customer_pays numeric,
  platform_fee numeric,
  garage_receives numeric,
  verified boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record record;
  v_is_qr boolean;
  v_fee numeric;
  v_garage_short text;
  v_invoice text;
  v_channel public.invoice_delivery_channel;
  v_method public.payment_method;
begin
  if p_payment_method not in ('qr', 'cash') then
    raise exception 'Payment method must be qr or cash' using errcode = '22023';
  end if;

  select * into v_record
  from public.service_records
  where id = p_service_record_id
  for update;

  if v_record.id is null then
    raise exception 'Service record not found' using errcode = 'P0002';
  end if;

  if not (public.owns_garage(v_record.garage_id) or public.is_admin()) then
    raise exception 'Not authorized for this service record' using errcode = '42501';
  end if;

  if v_record.status <> 'otp_verified' then
    raise exception 'Customer OTP must be verified before payment' using errcode = '22023';
  end if;

  v_is_qr := p_payment_method = 'qr';
  v_fee := 0;  -- no platform fee until Route/KYC; garage keeps 100%
  v_method := p_payment_method::public.payment_method;
  v_channel := case
    when v_record.verification_method = 'in_app' then 'push'::public.invoice_delivery_channel
    else 'whatsapp'::public.invoice_delivery_channel
  end;

  -- KYM-YYYYMMDD-<garage short>-<zero-padded global sequence>
  v_garage_short := upper(substr(replace(v_record.garage_id::text, '-', ''), 1, 4));
  v_invoice := 'KYM-' || to_char(now(), 'YYYYMMDD') || '-' || v_garage_short || '-'
    || lpad(nextval('public.invoice_seq')::text, 6, '0');

  update public.service_records
    set status = 'completed',
        payment_method = v_method,
        platform_fee = v_fee,
        garage_earnings = v_record.amount,
        is_reliable = v_is_qr,
        invoice_number = v_invoice,
        invoice_delivery_channel = v_channel,
        invoice_notification_status = 'pending'
    where id = p_service_record_id;

  insert into public.payments (
    service_record_id, customer_profile_id, garage_id, amount, platform_fee,
    method, provider, status
  ) values (
    p_service_record_id, v_record.customer_profile_id, v_record.garage_id,
    v_record.amount, v_fee, v_method,
    case when v_is_qr then 'upi' else 'cash' end, 'completed'
  );

  return query select
    v_invoice,
    'completed'::public.service_record_status,
    v_record.amount + v_fee,
    v_fee,
    v_record.amount,
    v_is_qr;
end;
$$;
