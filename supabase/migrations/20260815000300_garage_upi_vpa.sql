-- Garage UPI ID (VPA) for post-cap direct collection: when the daily float cap
-- is hit, the garage shows its own static UPI QR and the customer pays it
-- directly (garage taps "Received"; the OTP step already verified the service).
-- Optional — a garage without a VPA falls back to true cash post-cap. Stored in
-- the private payout table (owner/admin RLS). Idempotent.
alter table public.garage_payout_details
  add column if not exists upi_vpa text;
