-- QR (UPI) is a distinct, verified payment mode from the legacy 'razorpay'
-- value. Kept in its own migration so the new enum value is committed before
-- any later migration/function uses it.
alter type public.payment_method add value if not exists 'qr';
