# KnowYourMechanic migration handover

Date: 15 July 2026  
Branch: `codex/structured-service-taxonomy`  
Base: `origin/migration_main`  
Repo: `knowyourmechanic/KnowyourMechanic-app`

## 1. Current product direction

The migration target is a new Expo React Native mobile app backed by Supabase Postgres/Auth/Edge Functions. The old React/Vite/Capacitor app stays live until parity.

Important flow correction from `Kym flow.txt`: booking is not part of the near-term garage/customer flow. The garage creates a service record directly using the customer's mobile number. The customer verifies by OTP. Then the garage completes payment by QR or cash.

Current intended flow:

1. Garage is onboarded.
2. Garage creates a service record for a customer phone number.
3. Garage captures structured vehicle/service/failure data.
4. Customer gets OTP.
5. Customer shares OTP with garage.
6. Garage selects payment mode:
   - QR payment: verified transaction, platform fee applies.
   - Cash: unverified transaction, no platform fee.
7. Service record and invoice/report entry appear in:
   - garage service dashboard
   - customer vehicle service history
8. Customer notification channel:
   - app user: push
   - no app or expired push token: WhatsApp through Meta WhatsApp Business Platform

Invoice does not need tax/legal compliance for now. It still needs a unique tracking code per transaction.

## 2. Decisions locked so far

### OTP provider

Use MSG91 SMS OTP for auth and service OTP. DLT registration will be handled by the business owner.

Do not build WhatsApp OTP through MSG91 as the main auth path.

Reasoning:

- SMS OTP is expected by Indian users and better for login reliability.
- DLT work is unavoidable for compliant Indian business SMS. Avoiding DLT by switching providers is risky because telecom rules still govern commercial/transactional messaging.
- Fast2SMS may reduce setup friction, but it should not be chosen only to avoid DLT. If DLT becomes required later or deliverability is poor, migration cost increases.
- Keep MSG91 now, but isolate provider calls behind one Edge Function/provider interface so Fast2SMS can be swapped later if business needs.

### WhatsApp

Use Meta WhatsApp Business Platform / Cloud API for service updates and invoice/report delivery, not for login OTP.

Likely WhatsApp templates:

- service record created
- OTP fallback only if explicitly approved later
- invoice/report ready
- payment completed
- service history link

### Data

Clean, structured service data is now a first-class requirement. The future sales story to manufacturers depends on low-noise data.

Free text must be supplementary only. It must not replace structured make/model/service/failure fields.

## 3. Work completed in this branch

### 3.1 Supabase structured taxonomy migration

Added:

- `supabase/migrations/20260629000100_structured_service_taxonomy.sql`
- `supabase/STRUCTURED_TAXONOMY.md`

The migration adds:

- enum `vehicle_type`: `2w`, `3w`, `4w`, `other`
- master table `vehicle_makes`
- master table `vehicle_models`
- master table `service_categories`
- master table `failure_categories`
- join table `service_record_services`
- join table `service_record_failures`
- structured columns on `service_records`

New `service_records` fields:

- `vehicle_type`
- `vehicle_make_code`
- `vehicle_model_code`
- `vehicle_make_other`
- `vehicle_model_other`
- `model_year`
- `odometer_km`
- `service_notes`
- `taxonomy_version`

Rules added:

- make/model codes use stable slugs
- model must match make and vehicle type
- make and model are required, either known code or typed other value
- model year must be between 1950 and 2100
- odometer must be between 0 and 5,000,000 km
- existing records are backfilled as `4w` / `Unknown`

Initial seed taxonomy includes common India 2W/3W/4W makes and models plus service/failure categories.

### 3.2 Mobile taxonomy loader

Added:

- `mobile/src/garage/serviceTaxonomy.ts`

It exposes:

- `VehicleType`
- `vehicleTypeOptions`
- `fallbackServiceTaxonomy`
- `loadServiceTaxonomy()`

Behavior:

- If Supabase is configured, load active taxonomy tables from Supabase.
- If Supabase is unavailable or fails, use local fallback taxonomy.

### 3.3 Mobile type model updated

Changed:

- `mobile/src/garage/garageTypes.ts`

`GarageServiceRecord` now carries structured fields:

- vehicle type
- make/model code
- make/model display name
- model year
- odometer
- selected service categories
- selected failure categories
- service notes

`CreateServiceRecordInput` now requires structured taxonomy data instead of raw `vehicleInfo` and `description`.

### 3.4 Garage service creation UI updated

Changed:

- `mobile/src/screens/GarageWorkspace.tsx`

The Add Service form now captures:

- customer phone
- vehicle type: 2W, 3W, 4W, Other
- make filtered by vehicle type
- model filtered by make and vehicle type
- other make/model fallback
- vehicle number
- optional model year
- optional odometer
- multi-select service categories
- multi-select failure/symptom categories
- optional service notes
- amount

Validation added:

- vehicle type required
- vehicle number required for 2W/3W/4W
- make required
- model required
- at least one service category required
- at least one failure category required
- model year range enforced
- odometer range enforced

### 3.5 Local prototype repository updated

Changed:

- `mobile/src/garage/garageRepository.ts`
- `mobile/src/customer/customerRepository.ts`

The current mobile app still stores prototype garage/customer data in `platformStorage`, not Supabase writes.

Added local validation function:

- `normalizeStructuredService(input)`

It enforces clean structured data before service records are created in local state.

Seed records now include structured taxonomy data.

### 3.6 Web runtime fix

Changed:

- `mobile/package.json`

Pinned:

- `react-dom`: `19.2.3`

Reason: Expo web export installed ReactDOM `19.2.7` while React was `19.2.3`, causing a blank web app with React minified error. Exact pin fixed browser render.

## 4. Current verification status

Already passed:

```bash
cd mobile
npm install --ignore-scripts --legacy-peer-deps --package-lock=false
npm run typecheck
npx expo export --platform web --output-dir /tmp/kym-taxonomy-web
git diff --check
```

Browser smoke test done:

- Expo dev server opened.
- Login worked with garage seed phone `1234567890` and OTP `123456`.
- Garage dashboard loaded.
- Add Service form opened.
- Vehicle type chips rendered.
- Selecting `4W` filtered makes.
- Selecting `Maruti Suzuki` filtered models to Swift/Wagon R.

Not fully completed:

- End-to-end form submit through browser was not finished after the last continuation.
- Native Android device/emulator test not done.
- Supabase migration was not applied to a real local/staging Supabase database in this branch.

## 5. Files changed or added

Changed:

- `mobile/package.json`
- `mobile/src/customer/customerRepository.ts`
- `mobile/src/garage/garageRepository.ts`
- `mobile/src/garage/garageTypes.ts`
- `mobile/src/screens/GarageWorkspace.tsx`
- `supabase/types/database.types.ts`

Added:

- `mobile/src/garage/serviceTaxonomy.ts`
- `supabase/STRUCTURED_TAXONOMY.md`
- `supabase/migrations/20260629000100_structured_service_taxonomy.sql`
- `HANDOVER.md`

User-provided untracked source docs:

- `KnowYourMechanic_Migration_PRD_final.pdf`
- `Kym flow.txt`

Do not delete these.

## 6. Architecture state

### Existing app layers

Current repo contains:

- old Vite/React web app under `src/`
- legacy Node API under `api/`
- new Expo app under `mobile/`
- Supabase migrations under `supabase/migrations/`
- Supabase generated types under `supabase/types/`

PRD direction says:

- Mobile should become Expo + Supabase.
- Supabase should replace MongoDB/Firebase/custom Node for v1 core flows where possible.
- React/Vite admin dashboard may remain mandatory for admin web.

### Current Expo mobile status

Expo app has role-based surfaces:

- auth
- customer workspace
- garage workspace
- admin workspace
- employee workspace

Garage/customer service record flow exists as local prototype state.

Next major work is replacing local storage with Supabase-backed transaction/RPC/Edge Function flow.

## 7. Structured taxonomy model

### Why this matters

Manufacturer-facing data cannot be built from free text like "general work" or "engine problem". We need stable codes.

Good analytics dimensions:

- vehicle type
- make code
- model code
- model year
- odometer band
- service category code
- failure category code
- city/area
- garage id
- verified vs unverified transaction
- QR vs cash

Weak data:

- unstructured notes
- `other` overuse
- unknown make/model
- missing odometer
- missing failure category

### Rules to preserve

- Never rename a code after release.
- Rename display labels only.
- Deactivate old codes; do not delete them.
- `Other` must collect typed make/model text.
- Notes are optional context only.
- Service and failure categories are many-to-many with service records.
- Track `taxonomy_version` on service records.

### Data quality metrics to add

Add admin/internal reports:

- percent records using `other` make/model
- percent records missing model year
- percent records missing odometer
- most common other make/model text
- top failure category by make/model/year
- service/failure mismatch rate
- garage-level data cleanliness score

## 8. Critical gaps and risks

### 8.1 DB constraints are not enough yet

The migration creates join tables for services/failures, but Postgres does not yet enforce "at least one service and one failure" at `service_records` insert time.

Current enforcement is in app code only.

Fix during Supabase write build:

- create one RPC/Edge Function to create service record and join rows in one transaction
- validate at least one service and one failure inside that server path
- prevent direct client insert drift

### 8.2 RLS insert policies missing for new join tables

The new join tables currently have read policies only.

This is acceptable only if writes go through a trusted Edge Function or security-definer RPC.

If client writes directly, add insert/update/delete policies for garage owners scoped to their own service records.

### 8.3 Local prototype still not production

`garageRepository.ts` and `customerRepository.ts` still use `platformStorage` for most service flow data.

This is useful for UX prototyping only.

Production needs Supabase writes for:

- service record creation
- OTP creation/verification
- payment completion
- invoice code generation
- notification dispatch
- customer service history

### 8.4 Existing schema still contains bookings

The PRD had bookings, but latest flow says no booking for current garage/customer flow.

Do not build booking screens next. Keep existing booking tables untouched for now unless removal is explicitly approved.

### 8.5 Invoice number generation is weak in local prototype

Current local invoice number:

```ts
KYM-INV-${Math.floor(100000 + Math.random() * 900000)}
```

This is not strong enough for production uniqueness.

Use DB-generated unique transaction/invoice code. Suggested format:

```text
KYM-{YYYYMMDD}-{short garage code}-{sequence or nanoid}
```

Keep unique DB constraint.

### 8.6 MSG91 and DLT must be done before OTP production

Needed:

- DLT entity registration
- sender/header approval
- OTP template approval
- template ID stored in env
- provider credentials stored in Supabase secrets
- test Indian phone deliverability before broad QA

### 8.7 WhatsApp templates need early approval

Meta WhatsApp templates can take time and may be rejected for wording/category mismatch.

Create templates early for service update and invoice/report delivery.

### 8.8 Manufacturer data claims need discipline

Do not sell analytics until:

- enough records exist
- consent/privacy terms cover aggregate analytics
- PII is excluded or anonymized
- low-quality garages are filtered or flagged
- manufacturer-facing schema is documented

## 9. Recommended next build order

### Step 1 - Finish taxonomy slice

Goal: close the current branch cleanly.

Tasks:

1. Run mobile typecheck again.
2. Run Expo web export again.
3. Apply Supabase migration to local/staging database.
4. Regenerate Supabase types from the actual DB.
5. Browser-test full Add Service submit.
6. Add a small UI display improvement so cards show structured vehicle data and selected failures.

Acceptance:

- Add Service cannot submit dirty/missing taxonomy data.
- New record shows vehicle type, make, model, service categories, failure categories.
- Typecheck passes.
- Migration applies cleanly.

### Step 2 - Supabase service record transaction

Goal: replace local service creation with real DB writes.

Build one server-side path:

- `create_service_record_with_taxonomy`

It should:

1. verify caller is garage owner
2. verify garage belongs to caller
3. normalize phone
4. validate taxonomy codes
5. require service/failure arrays
6. create service record
7. insert service category join rows
8. insert failure category join rows
9. generate service OTP
10. send SMS OTP through MSG91
11. return minimal service record response

Prefer Edge Function if SMS provider call is needed. Prefer Postgres RPC for pure DB transaction if provider call is split.

### Step 3 - Service OTP verification

Goal: customer approval before payment.

Build:

- OTP table or secure hashed OTP columns
- expiry, attempt limit, resend limit
- MSG91 delivery status logging
- verification endpoint

Rules:

- OTP must expire.
- OTP must be single-use.
- Never store plain OTP in DB.
- Do not log OTP in production.

### Step 4 - Payment completion

Goal: mark transaction verified/unverified.

Rules:

- QR = verified, platform fee applies.
- Cash = unverified, no platform fee.
- No full payment automation for v1 unless separately approved.

Build:

- complete payment endpoint
- unique invoice/report code generation
- payment summary
- service record status update

### Step 5 - Invoice/report delivery

Goal: customer receives record.

Build:

- service record report/invoice generator
- unique code on every transaction
- push path for app users
- WhatsApp Cloud API fallback for no app/expired token
- notification log table

Rules:

- avoid duplicate push + WhatsApp messages
- preserve delivery channel/status
- keep invoice/report non-compliance wording clear if needed

### Step 6 - Customer service history

Goal: customer can see records by phone/profile.

Build:

- service history screen backed by Supabase
- pending OTP records
- completed records
- invoice/report view/download/share

Privacy rule:

- phone-based lookup must be tied to verified auth phone, not arbitrary phone search.

### Step 7 - Garage dashboard and reports

Goal: garage sees clean transaction history.

Build:

- service records from Supabase
- filters by status/payment type/date
- QR/cash split
- verified/unverified counts
- data quality warning if too many `other` or missing odometer/year

### Step 8 - Admin/employee tracking

Goal: operations visibility.

Build:

- employee referred garage list
- red/yellow/green tags:
  - red: no transactions
  - yellow: fewer than 4 transactions/day
  - green: 4 or more transactions/day
- inactive garage alerts:
  - 3 days
  - 7 days
  - 14 days
  - 30 days
- admin filters by employee/location/onboarding/activity/status

## 10. Environment and secrets needed

Mobile:

- Supabase URL
- Supabase anon key

Supabase Edge Functions:

- MSG91 auth key
- MSG91 OTP template ID
- MSG91 sender/header
- MSG91 route/flow ID if used
- Meta WhatsApp permanent/system user token
- Meta WhatsApp phone number ID
- Meta WhatsApp business account ID
- WhatsApp template names
- webhook verify token

Do not put these in mobile env if they can send messages or mutate provider state.

## 11. Suggested Supabase additions next

Add tables:

```sql
service_otps
notification_events
invoice_documents
```

Possible `service_otps` fields:

- `id`
- `service_record_id`
- `phone`
- `otp_hash`
- `expires_at`
- `attempt_count`
- `max_attempts`
- `sent_provider`
- `provider_message_id`
- `verified_at`
- `created_at`

Possible `notification_events` fields:

- `id`
- `service_record_id`
- `channel`
- `template_name`
- `recipient_phone`
- `provider`
- `provider_message_id`
- `status`
- `error`
- `created_at`
- `sent_at`

Possible invoice/report fields:

- `id`
- `service_record_id`
- `transaction_code`
- `document_url`
- `payload_snapshot`
- `created_at`

## 12. Test accounts from PRD

- Admin: `9321495344`
- Garage Owner: `1234567890`
- Customer: `9876543210`

Dev mock OTP used in local testing:

- `123456`

Do not assume this works in production.

## 13. Useful commands

Mobile typecheck:

```bash
cd mobile
npm run typecheck
```

Expo web export:

```bash
cd mobile
npx expo export --platform web --output-dir /tmp/kym-taxonomy-web
```

Expo dev server:

```bash
cd mobile
npm run start -- --web --port 8082
```

Whitespace check:

```bash
git diff --check
```

Git state:

```bash
git status --short --branch
```

## 14. Handoff checklist for next engineer

Before continuing:

- Confirm branch is `codex/structured-service-taxonomy`.
- Do not delete PRD/flow docs.
- Read `Kym flow.txt`; do not build booking next.
- Read `supabase/STRUCTURED_TAXONOMY.md`.
- Apply or review migration before adding Supabase writes.
- Regenerate Supabase types from actual DB after migration.
- Keep provider credentials server-side only.

Next immediate task:

1. Finish browser form submit verification.
2. Add structured details to service record cards.
3. Apply migration to local/staging Supabase.
4. Build Supabase-backed service record creation transaction.

## 15. External reference links to re-check before provider work

- MSG91 docs: https://docs.msg91.com/
- TRAI commercial communication/DLT context: https://www.trai.gov.in/
- Meta WhatsApp Cloud API docs: https://developers.facebook.com/docs/whatsapp/cloud-api/
- Meta WhatsApp message templates: https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/
- Meta WhatsApp pricing: https://developers.facebook.com/docs/whatsapp/pricing/
