import { isDevMockAuthAllowed } from "../config/env";
import { platformStorage } from "../lib/platformStorage";
import { normalizeIndianPhone } from "./phone";
import type { AuthProfile, OtpProvider, OtpRequestResult } from "./authTypes";

const DEV_OTP = "123456";
const STORAGE_KEY = "kym.devAuthProfile";

const seedProfiles: Record<string, AuthProfile> = {
  "9321495344": {
    id: "00000000-0000-0000-0000-000000000001",
    phone_number: "9321495344",
    role: "admin",
    name: "KYM Admin"
  },
  "1234567890": {
    id: "00000000-0000-0000-0000-000000000002",
    phone_number: "1234567890",
    role: "garage",
    name: "Demo Garage Owner"
  },
  "9876543210": {
    id: "00000000-0000-0000-0000-000000000003",
    phone_number: "9876543210",
    role: "customer",
    name: "Demo Customer"
  }
};

function assertDevAuthEnabled() {
  if (!isDevMockAuthAllowed) {
    throw new Error("Dev OTP is disabled outside development mode.");
  }
}

export const devMockOtpProvider: OtpProvider = {
  async requestOtp(phoneNumber: string): Promise<OtpRequestResult> {
    assertDevAuthEnabled();

    const normalizedPhone = normalizeIndianPhone(phoneNumber);
    if (!seedProfiles[normalizedPhone]) {
      throw new Error("Phone number is not available in Phase 2 dev auth.");
    }

    return { nextStep: "enter_otp" };
  },

  async verifyOtp(phoneNumber: string, otp: string): Promise<AuthProfile> {
    assertDevAuthEnabled();

    if (otp !== DEV_OTP) {
      throw new Error("Invalid OTP.");
    }

    const normalizedPhone = normalizeIndianPhone(phoneNumber);
    const profile = seedProfiles[normalizedPhone];
    if (!profile) {
      throw new Error("Profile not found for this phone number.");
    }

    await platformStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    return profile;
  },

  async restoreSession(): Promise<AuthProfile | null> {
    if (!isDevMockAuthAllowed) {
      return null;
    }

    const storedProfile = await platformStorage.getItem(STORAGE_KEY);
    return storedProfile ? (JSON.parse(storedProfile) as AuthProfile) : null;
  },

  async signOut() {
    await platformStorage.removeItem(STORAGE_KEY);
  }
};
