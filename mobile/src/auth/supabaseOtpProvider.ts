import { supabase } from "../lib/supabase";
import { normalizeIndianPhone } from "./phone";
import type { AuthProfile, OtpProvider, OtpRequestResult, ProfileRow } from "./authTypes";

function getSupabaseClient() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Set Expo public Supabase env values.");
  }

  return supabase;
}

function toAuthProfile(profile: ProfileRow): AuthProfile {
  return {
    id: profile.id,
    phone_number: profile.phone_number,
    role: profile.role,
    name: profile.name
  };
}

async function linkAndLoadProfile(): Promise<AuthProfile> {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc("link_current_auth_profile");

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Profile not found for authenticated phone.");
  }

  return toAuthProfile(data);
}

export const supabaseOtpProvider: OtpProvider = {
  async requestOtp(phoneNumber: string): Promise<OtpRequestResult> {
    const client = getSupabaseClient();
    const normalizedPhone = normalizeIndianPhone(phoneNumber);
    const { error } = await client.auth.signInWithOtp({
      phone: `+91${normalizedPhone}`
    });

    if (error) {
      throw new Error(error.message);
    }

    return { nextStep: "enter_otp" };
  },

  async verifyOtp(phoneNumber: string, otp: string): Promise<AuthProfile> {
    const client = getSupabaseClient();
    const normalizedPhone = normalizeIndianPhone(phoneNumber);
    const { error } = await client.auth.verifyOtp({
      phone: `+91${normalizedPhone}`,
      token: otp,
      type: "sms"
    });

    if (error) {
      throw new Error(error.message);
    }

    return linkAndLoadProfile();
  },

  async restoreSession(): Promise<AuthProfile | null> {
    const client = getSupabaseClient();
    const { data } = await client.auth.getSession();
    return data.session ? linkAndLoadProfile() : null;
  },

  async signOut() {
    const client = getSupabaseClient();
    await client.auth.signOut();
  }
};
