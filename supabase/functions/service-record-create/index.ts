import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

import { normalizeIndianPhone } from "../_shared/smsProvider.ts";
import { routeDelivery } from "../_shared/deliver.ts";
import { generateOtp, hashServiceOtp, randomOtpSalt } from "../_shared/otpHash.ts";

const OTP_TTL_MINUTES = 10;

const corsHeaders: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS"
};

type CreateBody = {
  garageId?: string;
  customerPhone?: string;
  vehicleType?: string;
  vehicleMakeCode?: string | null;
  vehicleModelCode?: string | null;
  vehicleMakeOther?: string | null;
  vehicleModelOther?: string | null;
  vehicleNumber?: string | null;
  modelYear?: number | null;
  odometerKm?: number | null;
  serviceCategoryCodes?: string[];
  failureCategoryCodes?: string[];
  serviceNotes?: string | null;
  amount?: number;
  customerHasApp?: boolean;
};

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" }
  });
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json(401, { error: "Missing Authorization header." });
  }

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }

  if (!body.garageId || !body.customerPhone || !body.vehicleType || typeof body.amount !== "number") {
    return json(400, { error: "Missing required fields." });
  }

  let nationalPhone: string;
  try {
    nationalPhone = normalizeIndianPhone(body.customerPhone);
  } catch {
    return json(400, { error: "Invalid customer phone." });
  }

  const supabaseUrl = requireEnv("SUPABASE_URL");
  const anonKey = requireEnv("SUPABASE_ANON_KEY");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const pepper = requireEnv("SERVICE_OTP_PEPPER");

  // Caller-scoped client: the RPC runs SECURITY DEFINER but still checks
  // owns_garage() against this caller's auth.uid().
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false }
  });

  const { data: created, error: rpcError } = await callerClient
    .rpc("create_service_record_with_taxonomy", {
      p_garage_id: body.garageId,
      p_customer_phone: body.customerPhone,
      p_vehicle_type: body.vehicleType,
      p_vehicle_make_code: body.vehicleMakeCode ?? null,
      p_vehicle_model_code: body.vehicleModelCode ?? null,
      p_vehicle_make_other: body.vehicleMakeOther ?? null,
      p_vehicle_model_other: body.vehicleModelOther ?? null,
      p_vehicle_number: body.vehicleNumber ?? null,
      p_model_year: body.modelYear ?? null,
      p_odometer_km: body.odometerKm ?? null,
      p_service_codes: body.serviceCategoryCodes ?? [],
      p_failure_codes: body.failureCategoryCodes ?? [],
      p_service_notes: body.serviceNotes ?? null,
      p_amount: body.amount,
      p_customer_has_app: body.customerHasApp ?? false
    })
    .single();

  if (rpcError || !created) {
    const message = rpcError?.message ?? "Failed to create service record.";
    // 42501 = insufficient privilege (ownership check failed).
    const status = rpcError?.code === "42501" ? 403 : 400;
    return json(status, { error: message });
  }

  const serviceRecordId = (created as { service_record_id: string }).service_record_id;

  // OTP is generated, stored (hashed), and sent entirely server-side.
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const otp = generateOtp();
  const salt = randomOtpSalt();
  const otpHash = await hashServiceOtp(otp, salt, pepper);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

  // Route the OTP: push if the customer has the app, else WhatsApp (queued for
  // the Phase-4 sender). Delivery failures never block record creation.
  let deliveryChannel = "none";
  let deliveryId: string | null = null;
  let otpNotice: string | null = null;
  try {
    const { data: rec } = await admin
      .from("service_records")
      .select("customer_profile_id, garage_name")
      .eq("id", serviceRecordId)
      .single();
    const recRow = rec as { customer_profile_id: string | null; garage_name: string | null } | null;
    // Customer verifies the service details, THEN shares the code with the garage.
    const vehicle = body.vehicleNumber ? body.vehicleNumber.toUpperCase() : "your vehicle";
    const service = (body.serviceNotes && body.serviceNotes.trim()) || "service";
    const amountStr = String(body.amount);
    const garageName = recRow?.garage_name ?? "The garage";
    const routed = await routeDelivery(admin, {
      serviceRecordId,
      recipientProfileId: recRow?.customer_profile_id ?? null,
      recipientPhone: nationalPhone,
      kind: "otp",
      title: "Confirm your service",
      body: `${garageName}: ${service} on ${vehicle} for Rs ${amountStr}. If correct, share OTP ${otp} with the garage. Don't share if you didn't get this service.`,
      data: { otp, vehicle, service, amount: amountStr }
    });
    deliveryChannel = routed.channel;
    deliveryId = routed.deliveryId;
  } catch (error) {
    otpNotice = error instanceof Error ? error.message : "OTP delivery failed.";
  }

  const { error: otpError } = await admin.from("service_otps").insert({
    service_record_id: serviceRecordId,
    phone: nationalPhone,
    otp_hash: otpHash,
    otp_salt: salt,
    expires_at: expiresAt,
    sent_provider: deliveryChannel,
    provider_message_id: deliveryId
  });

  if (otpError) {
    return json(500, { error: "Service record created but OTP could not be stored." });
  }

  const allowDevOtp = Deno.env.get("ALLOW_DEV_OTP") === "true";
  return json(200, {
    serviceRecordId,
    status: "pending_otp",
    otpExpiresAt: expiresAt,
    otpDelivery: deliveryChannel,
    otpDeliveryError: otpNotice,
    ...(allowDevOtp ? { devOtp: otp } : {})
  });
});
