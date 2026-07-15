# Service record write path (Step 1)

Replaces the local prototype `createGarageServiceRecord` with a real,
transactional Supabase write plus server-side OTP delivery.

## Pieces

- **Migration** `migrations/20260630000100_service_write_path.sql`
  - `service_otps` table — hashed, salted, single-use, expiring OTPs. No client
    RLS policies; only the service-role Edge Function touches it.
  - `create_service_record_with_taxonomy(...)` — `SECURITY DEFINER` RPC. Checks
    `owns_garage()` against the caller, requires ≥1 service and ≥1 failure,
    validates codes, normalizes phone, and inserts the record + both join tables
    in one transaction. Returns only the new `service_record_id` (never the OTP).
  - Owner-scoped insert/update policies on `service_record_services` /
    `service_record_failures` (defense in depth).
  - `normalize_indian_phone(text)` helper.
- **Edge Function** `functions/service-record-create/`
  - Verifies the caller JWT, calls the RPC with the caller's identity (so the
    ownership check runs), then — using the service role — generates a 6-digit
    OTP, stores `SHA-256(pepper:salt:otp)`, and sends it via MSG91.
  - Returns `{ serviceRecordId, status, otpExpiresAt, otpDelivery }`. Includes
    `devOtp` only when `ALLOW_DEV_OTP=true`.
- **Shared provider** `functions/_shared/smsProvider.ts` — the only place that
  talks to MSG91, so Fast2SMS (or another provider) can be swapped here alone.
- **Mobile client** `mobile/src/garage/serviceRecordApi.ts` —
  `createServiceRecordViaSupabase(garageId, input)` wraps the Edge Function.
  Not yet wired into `GarageWorkspace`; the local prototype flow is unchanged.

## Why OTP generation is not in the RPC

If the RPC returned the OTP, any garage-authenticated client could read it and
approve on the customer's behalf. Keeping OTP creation/delivery in the
service-role Edge Function means the garage app only learns that an OTP was
sent, never its value (outside dev).

## Secrets (Edge Function only — never in the mobile app)

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (injected)
- `SERVICE_OTP_PEPPER` — random server secret used in the OTP hash
- `MSG91_AUTH_KEY`, `MSG91_SERVICE_OTP_FLOW_ID`, optional `MSG91_OTP_VAR`
- `ALLOW_DEV_OTP` — `"true"` only in dev/staging

## Not done yet

- Wire `GarageWorkspace` to call the Edge Function when Supabase is configured.
- Apply the migration to a real Supabase DB and regenerate `database.types.ts`.
- OTP **verify** endpoint + attempt/resend enforcement (Step 3).
- Payment completion, invoice code, notifications (Steps 4–5).
