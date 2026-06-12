import type { Database } from "../../../supabase/types/database.types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export type AuthProfile = Pick<ProfileRow, "id" | "phone_number" | "role" | "name">;

export type OtpRequestResult = {
  nextStep: "enter_otp";
};

export interface OtpProvider {
  requestOtp(phoneNumber: string): Promise<OtpRequestResult>;
  verifyOtp(phoneNumber: string, otp: string): Promise<AuthProfile>;
  restoreSession(): Promise<AuthProfile | null>;
  signOut(): Promise<void>;
}
