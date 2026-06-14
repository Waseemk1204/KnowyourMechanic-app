import { platformStorage } from "../lib/platformStorage";
import { supabase } from "../lib/supabase";
import type { AuthProfile } from "../auth/authTypes";
import type {
  CreateServiceRecordInput,
  CreateServiceRecordResult,
  GarageDashboardState,
  GarageOnboardingInput,
  GaragePaymentMethod,
  GarageProfile,
  GarageProfileInput,
  GarageServiceRecord,
  PaymentResult
} from "./garageTypes";

const STORAGE_KEY = "kym.phase3.garageState";
const PLATFORM_FEE = 1.9;
const defaultWorkingDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DEMO_GARAGE_ID = "20000000-0000-0000-0000-000000000000";

function nowIso() {
  return new Date().toISOString();
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "").slice(-10);
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function createDefaultGarage(profile: AuthProfile): GarageProfile {
  return {
    id: DEMO_GARAGE_ID,
    ownerProfileId: profile.id,
    name: profile.name === "Demo Garage Owner" ? "KYM Demo Garage" : profile.name ?? "Your Garage",
    email: "garage0@knowyourmechanic.local",
    phone: profile.phone_number,
    address: "Kothrud, Pune, Maharashtra",
    serviceHours: "09:00 - 20:00",
    workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    rating: 4.6,
    totalReviews: 42,
    onboardingStatus: "completed",
    isVerified: true,
    businessType: "proprietorship",
    legalBusinessName: "KYM Demo Garage",
    bankAccountHolderName: "Demo Garage Owner",
    bankName: "Demo Bank",
    bankIfscCode: "SBIN0001234",
    bankAccountNumber: "123456789012"
  };
}

async function loadRemoteVisibleGarage(profile: AuthProfile): Promise<GarageProfile | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("garages")
    .select(
      "id, owner_profile_id, name, email, phone, address, service_hours, working_days, photo_url, rating, total_reviews, onboarding_status, is_verified, business_type, legal_business_name, bank_account_holder_name, bank_name, bank_ifsc_code, bank_account_number"
    )
    .eq("owner_profile_id", profile.id)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    ownerProfileId: data.owner_profile_id,
    name: data.name,
    email: data.email ?? "",
    phone: data.phone ?? profile.phone_number,
    address: data.address ?? "",
    serviceHours: data.service_hours ?? "09:00 - 20:00",
    workingDays: data.working_days ?? defaultWorkingDays,
    photoUrl: data.photo_url ?? undefined,
    rating: Number(data.rating ?? 0),
    totalReviews: data.total_reviews ?? 0,
    onboardingStatus: data.onboarding_status === "completed" ? "completed" : "pending",
    isVerified: data.is_verified,
    businessType: data.business_type,
    legalBusinessName: data.legal_business_name ?? data.name,
    bankAccountHolderName: data.bank_account_holder_name ?? undefined,
    bankName: data.bank_name ?? undefined,
    bankIfscCode: data.bank_ifsc_code ?? undefined,
    bankAccountNumber: data.bank_account_number ?? undefined
  };
}

function createSeedRecords(garage: GarageProfile): GarageServiceRecord[] {
  return [
    {
      id: "seed_record_1",
      garageId: garage.id,
      garageName: garage.name,
      customerPhone: "9876543210",
      customerHasApp: true,
      vehicleNumber: "MH12AB1234",
      vehicleInfo: "Maruti Swift 2020",
      description: "Oil change and brake inspection",
      amount: 2200,
      platformFee: PLATFORM_FEE,
      garageEarnings: 2200,
      status: "completed",
      verificationMethod: "in_app",
      approvedByCustomer: true,
      paymentMethod: "qr",
      isReliable: true,
      invoiceNumber: "KYM-INV-1001",
      invoiceDeliveryChannel: "push",
      invoiceNotificationStatus: "sent",
      createdAt: nowIso()
    },
    {
      id: "seed_record_2",
      garageId: garage.id,
      garageName: garage.name,
      customerPhone: "9988776655",
      customerHasApp: false,
      vehicleNumber: "MH14CD4567",
      vehicleInfo: "Hyundai i20",
      description: "General service and washing",
      amount: 1800,
      platformFee: 0,
      garageEarnings: 1800,
      status: "completed",
      verificationMethod: "whatsapp",
      approvedByCustomer: true,
      paymentMethod: "cash",
      isReliable: false,
      invoiceNumber: "KYM-INV-1002",
      invoiceDeliveryChannel: "whatsapp",
      invoiceNotificationStatus: "sent",
      createdAt: nowIso()
    }
  ];
}

async function readState(profile: AuthProfile): Promise<GarageDashboardState> {
  const stored = await platformStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored) as GarageDashboardState;
  }

  const garage = (await loadRemoteVisibleGarage(profile)) ?? createDefaultGarage(profile);
  const initialState = {
    garage,
    serviceRecords: createSeedRecords(garage)
  };
  await writeState(initialState);
  return initialState;
}

async function writeState(state: GarageDashboardState) {
  await platformStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function assertGarage(profile: AuthProfile) {
  if (profile.role !== "garage") {
    throw new Error("Only garage owners can use this flow.");
  }
}

export async function getGarageDashboard(profile: AuthProfile): Promise<GarageDashboardState> {
  assertGarage(profile);
  return readState(profile);
}

export async function saveGarageOnboarding(
  profile: AuthProfile,
  input: GarageOnboardingInput
): Promise<GarageProfile> {
  assertGarage(profile);
  const state = await readState(profile);
  const garage: GarageProfile = {
    ...(state.garage ?? createDefaultGarage(profile)),
    name: input.name.trim(),
    email: input.email.trim(),
    phone: normalizePhone(input.phone),
    address: input.address.trim(),
    serviceHours: input.serviceHours.trim(),
    workingDays: input.workingDays,
    onboardingStatus: "completed",
    businessType: input.businessType,
    legalBusinessName: input.legalBusinessName.trim() || input.name.trim(),
    bankAccountHolderName: input.bankAccountHolderName.trim(),
    bankName: input.bankName.trim(),
    bankIfscCode: input.bankIfscCode.trim().toUpperCase(),
    bankAccountNumber: input.bankAccountNumber.trim()
  };
  const nextState = { ...state, garage };
  await writeState(nextState);
  return garage;
}

export async function saveGarageProfile(
  profile: AuthProfile,
  input: GarageProfileInput
): Promise<GarageProfile> {
  assertGarage(profile);
  const state = await readState(profile);
  if (!state.garage) {
    throw new Error("Garage profile not found.");
  }

  const garage: GarageProfile = {
    ...state.garage,
    ...input,
    phone: normalizePhone(input.phone),
    legalBusinessName: input.legalBusinessName.trim() || input.name.trim()
  };
  await writeState({ ...state, garage });
  return garage;
}

export async function createGarageServiceRecord(
  profile: AuthProfile,
  input: CreateServiceRecordInput
): Promise<CreateServiceRecordResult> {
  assertGarage(profile);
  const state = await readState(profile);
  if (!state.garage || state.garage.onboardingStatus !== "completed") {
    throw new Error("Complete garage onboarding first.");
  }

  const otp = generateOtp();
  const record: GarageServiceRecord = {
    id: generateId("service"),
    garageId: state.garage.id,
    garageName: state.garage.name,
    customerPhone: normalizePhone(input.customerPhone),
    customerHasApp: input.customerHasApp,
    vehicleNumber: input.vehicleNumber.trim().toUpperCase(),
    vehicleInfo: input.vehicleInfo.trim(),
    description: input.description.trim(),
    amount: input.amount,
    platformFee: 0,
    garageEarnings: input.amount,
    status: "pending_otp",
    verificationMethod: input.customerHasApp ? "in_app" : "whatsapp",
    approvedByCustomer: false,
    isReliable: false,
    invoiceDeliveryChannel: "none",
    invoiceNotificationStatus: "not_required",
    createdAt: nowIso()
  };

  await writeState({ ...state, serviceRecords: [record, ...state.serviceRecords] });
  await platformStorage.setItem(`kym.phase3.otp.${record.id}`, otp);
  return { record, otp };
}

export async function verifyGarageServiceOtp(
  profile: AuthProfile,
  serviceRecordId: string,
  otp: string
): Promise<GarageServiceRecord> {
  assertGarage(profile);
  const state = await readState(profile);
  const expectedOtp = await platformStorage.getItem(`kym.phase3.otp.${serviceRecordId}`);
  if (!expectedOtp || expectedOtp !== otp.trim()) {
    throw new Error("Invalid OTP.");
  }

  const records = state.serviceRecords.map((record) =>
    record.id === serviceRecordId
      ? { ...record, status: "otp_verified" as const, approvedByCustomer: true }
      : record
  );
  const updated = records.find((record) => record.id === serviceRecordId);
  if (!updated) {
    throw new Error("Service record not found.");
  }

  await platformStorage.removeItem(`kym.phase3.otp.${serviceRecordId}`);
  await writeState({ ...state, serviceRecords: records });
  return updated;
}

export async function completeGaragePayment(
  profile: AuthProfile,
  serviceRecordId: string,
  paymentMethod: GaragePaymentMethod
): Promise<PaymentResult> {
  assertGarage(profile);
  const state = await readState(profile);
  const target = state.serviceRecords.find((record) => record.id === serviceRecordId);
  if (!target) {
    throw new Error("Service record not found.");
  }
  if (target.status !== "otp_verified") {
    throw new Error("Customer OTP must be verified first.");
  }

  const isQr = paymentMethod === "qr";
  const platformFee = isQr ? PLATFORM_FEE : 0;
  const invoiceNumber = `KYM-INV-${Math.floor(100000 + Math.random() * 900000)}`;
  const updated: GarageServiceRecord = {
    ...target,
    status: "completed",
    paymentMethod,
    platformFee,
    garageEarnings: target.amount,
    isReliable: isQr,
    invoiceNumber,
    invoiceDeliveryChannel: target.customerHasApp ? "push" : "whatsapp",
    invoiceNotificationStatus: "pending"
  };

  const records = state.serviceRecords.map((record) => (record.id === serviceRecordId ? updated : record));
  await writeState({ ...state, serviceRecords: records });

  return {
    record: updated,
    paymentSummary: {
      customerPays: target.amount + platformFee,
      platformFee,
      garageReceives: target.amount,
      verified: isQr
    }
  };
}
