import { supabase } from "../lib/supabase";
import type { CreateServiceRecordInput } from "./garageTypes";

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
