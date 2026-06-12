export type AuthMode = "dev_mock_otp" | "real_otp_pending";

const configuredAuthMode = process.env.EXPO_PUBLIC_AUTH_MODE;

export const authMode: AuthMode =
  configuredAuthMode === "real_otp_pending" ? "real_otp_pending" : "dev_mock_otp";

export const isDevMockAuthAllowed = __DEV__ && authMode === "dev_mock_otp";

export const supabaseConfig = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  publishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ""
};

export const isSupabaseConfigured =
  supabaseConfig.url.length > 0 && supabaseConfig.publishableKey.length > 0;
