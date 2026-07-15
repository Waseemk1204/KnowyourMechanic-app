import { supabase } from "../lib/supabase";
import type { CreateServiceRecordInput, GaragePaymentMethod } from "./garageTypes";

// Response from the `service-record-create` Edge Function.
// The plain OTP is only present in dev (ALLOW_DEV_OTP=true); in production the
// OTP is delivered to the customer by SMS and never returned to the garage app.
export type RemoteCreateServiceRecordResult = {
  serviceRecordId: string;
  status: "pending_otp";
  otpExpiresAt: string;
  otpDelivery: string;
  otpDeliveryError: string | null;
  devOtp?: string;
};

/**
 * Creates a service record + taxonomy join rows and triggers the customer OTP
 * through the trusted Edge Function. Requires Supabase to be configured and the
 * caller to be signed in as the owning garage.
 */
export async function createServiceRecordViaSupabase(
  garageId: string,
  input: CreateServiceRecordInput
): Promise<RemoteCreateServiceRecordResult> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.functions.invoke<RemoteCreateServiceRecordResult>(
    "service-record-create",
    {
      body: {
        garageId,
        customerPhone: input.customerPhone,
        vehicleType: input.vehicleType,
        vehicleMakeCode: input.vehicleMakeCode,
        vehicleModelCode: input.vehicleModelCode,
        vehicleMakeOther: input.vehicleMakeOther,
        vehicleModelOther: input.vehicleModelOther,
        vehicleNumber: input.vehicleNumber,
        modelYear: input.modelYear,
        odometerKm: input.odometerKm,
        serviceCategoryCodes: input.serviceCategoryCodes,
        failureCategoryCodes: input.failureCategoryCodes,
        serviceNotes: input.serviceNotes,
        amount: input.amount,
        customerHasApp: input.customerHasApp
      }
    }
  );

  if (error) {
    throw new Error(error.message ?? "Failed to create service record.");
  }
  if (!data) {
    throw new Error("Empty response from service-record-create.");
  }
  return data;
}

export type VerifyServiceOtpResult = {
  ok: boolean;
  status?: "otp_verified";
  error?: string;
  reason?: "invalid" | "expired" | "locked";
  remainingAttempts?: number;
};

/**
 * Verifies the OTP the customer shared with the garage. On success the service
 * record advances to `otp_verified`. Returns `ok: false` with a reason for a
 * wrong/expired/locked OTP (the Edge Function returns HTTP 400 in those cases).
 */
export async function verifyServiceOtpViaSupabase(
  serviceRecordId: string,
  otp: string
): Promise<VerifyServiceOtpResult> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.functions.invoke<VerifyServiceOtpResult>(
    "service-otp-verify",
    { body: { serviceRecordId, otp } }
  );

  // supabase-js surfaces non-2xx as an error, but the body still carries our
  // structured reason/remainingAttempts; prefer that when present.
  if (error) {
    const context = (error as { context?: { body?: VerifyServiceOtpResult } }).context;
    if (context?.body && typeof context.body.ok === "boolean") {
      return context.body;
    }
    throw new Error(error.message ?? "Failed to verify OTP.");
  }
  if (!data) {
    throw new Error("Empty response from service-otp-verify.");
  }
  return data;
}

export type CompletePaymentResult = {
  invoiceNumber: string;
  status: "completed";
  customerPays: number;
  platformFee: number;
  garageReceives: number;
  verified: boolean;
};

/**
 * Completes payment for a verified service record. QR = verified + platform fee,
 * cash = unverified + no fee. Pure DB RPC (ownership enforced server-side); no
 * Edge Function since there is no provider call at this step.
 */
export async function completeServicePaymentViaSupabase(
  serviceRecordId: string,
  paymentMethod: GaragePaymentMethod
): Promise<CompletePaymentResult> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  // complete_service_payment is not in the generated Database types yet
  // (regenerate after applying the migration). Call it through a narrow shim.
  const rpcClient = supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>
    ) => {
      single: () => Promise<{ data: unknown; error: { message?: string } | null }>;
    };
  };

  const { data, error } = await rpcClient
    .rpc("complete_service_payment", {
      p_service_record_id: serviceRecordId,
      p_payment_method: paymentMethod
    })
    .single();

  if (error) {
    throw new Error(error.message ?? "Failed to complete payment.");
  }
  const row = data as {
    invoice_number: string;
    status: "completed";
    customer_pays: number;
    platform_fee: number;
    garage_receives: number;
    verified: boolean;
  };
  return {
    invoiceNumber: row.invoice_number,
    status: row.status,
    customerPays: Number(row.customer_pays),
    platformFee: Number(row.platform_fee),
    garageReceives: Number(row.garage_receives),
    verified: row.verified
  };
}
