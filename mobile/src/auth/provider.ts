import { authMode } from "../config/env";
import { devMockOtpProvider } from "./devMockOtpProvider";
import { supabaseOtpProvider } from "./supabaseOtpProvider";
import type { OtpProvider } from "./authTypes";

export function getOtpProvider(): OtpProvider {
  if (authMode === "real_otp_pending") {
    return supabaseOtpProvider;
  }

  return devMockOtpProvider;
}
