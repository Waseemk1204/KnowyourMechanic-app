import type { AuthProfile } from "../auth/authTypes";
import type { GarageDashboardState, GarageServiceRecord } from "../garage/garageTypes";
import { platformStorage } from "../lib/platformStorage";
import { supabase } from "../lib/supabase";
import type {
  CustomerGarage,
  CustomerNotificationInfo,
  CustomerProfile,
  CustomerProfileInput,
  CustomerReport,
  CustomerReportInput,
  CustomerReview,
  CustomerReviewInput,
  CustomerWorkspaceState
} from "./customerTypes";

const GARAGE_STATE_KEY = "kym.phase3.garageState";
const CUSTOMER_PROFILE_KEY = "kym.phase4.customerProfile";
const CUSTOMER_REVIEWS_KEY = "kym.phase4.customerReviews";
const CUSTOMER_REPORTS_KEY = "kym.phase4.customerReports";

function nowIso() {
  return new Date().toISOString();
}

function generateId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "").slice(-10);
}

function assertCustomer(profile: AuthProfile) {
  if (profile.role !== "customer") {
    throw new Error("Only customers can use this flow.");
  }
}

function defaultCustomerProfile(profile: AuthProfile): CustomerProfile {
  return {
    id: profile.id,
    phoneNumber: profile.phone_number,
    name: profile.name ?? "Demo Customer",
    vehicleMake: "Maruti",
    vehicleModel: "Swift",
    vehicleYear: "2020",
    vehicleNumber: "MH12AB1234"
  };
}

function fallbackGarage(): CustomerGarage {
  return {
    id: "20000000-0000-0000-0000-000000000000",
    name: "KYM Demo Garage",
    phone: "1234567890",
    address: "Kothrud, Pune, Maharashtra",
    serviceHours: "09:00 - 20:00",
    rating: 4.6,
    totalReviews: 42,
    isVerified: true
  };
}

function fallbackRecords(garageName = "KYM Demo Garage"): GarageServiceRecord[] {
  return [
    {
      id: "seed_record_1",
      garageId: "20000000-0000-0000-0000-000000000000",
      garageName,
      customerPhone: "9876543210",
      customerHasApp: true,
      vehicleNumber: "MH12AB1234",
      vehicleInfo: "Maruti Swift 2020",
      vehicleType: "4w",
      vehicleMakeCode: "maruti-suzuki",
      vehicleModelCode: "maruti-suzuki-swift",
      vehicleMakeName: "Maruti Suzuki",
      vehicleModelName: "Swift",
      modelYear: 2020,
      odometerKm: 48000,
      serviceCategoryCodes: ["periodic-maintenance", "brakes"],
      serviceCategoryNames: ["Periodic Maintenance", "Brakes"],
      failureCategoryCodes: ["routine-no-fault", "brake-noise"],
      failureCategoryNames: ["Routine service / no fault", "Brake noise"],
      serviceNotes: "Oil change and brake inspection",
      description: "Oil change and brake inspection",
      amount: 2200,
      platformFee: 1.9,
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
    }
  ];
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const stored = await platformStorage.getItem(key);
  return stored ? (JSON.parse(stored) as T) : fallback;
}

async function writeJson<T>(key: string, value: T) {
  await platformStorage.setItem(key, JSON.stringify(value));
}

async function readCustomerProfile(profile: AuthProfile): Promise<CustomerProfile> {
  return readJson(CUSTOMER_PROFILE_KEY, defaultCustomerProfile(profile));
}

async function readGarageState(): Promise<GarageDashboardState | null> {
  const stored = await platformStorage.getItem(GARAGE_STATE_KEY);
  return stored ? (JSON.parse(stored) as GarageDashboardState) : null;
}

async function loadRemoteGarages(): Promise<CustomerGarage[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("garages")
    .select("id, name, phone, address, service_hours, rating, total_reviews, is_verified")
    .eq("is_verified", true)
    .eq("is_offboarded", false)
    .order("rating", { ascending: false })
    .limit(20);

  if (error || !data) {
    return [];
  }

  return data.map((garage) => ({
    id: garage.id,
    name: garage.name,
    phone: garage.phone ?? "",
    address: garage.address ?? "",
    serviceHours: garage.service_hours ?? "",
    rating: Number(garage.rating ?? 0),
    totalReviews: garage.total_reviews ?? 0,
    isVerified: garage.is_verified
  }));
}

function recordsForPhone(records: GarageServiceRecord[], phone: string) {
  const normalized = normalizePhone(phone);
  return records.filter((record) => normalizePhone(record.customerPhone) === normalized);
}

function buildNotifications(records: GarageServiceRecord[]): CustomerNotificationInfo[] {
  return records.map((record) => {
    if (record.status === "pending_otp") {
      return {
        id: `otp_${record.id}`,
        title: "OTP verification needed",
        body: `${record.garageName} created a service record. Share the OTP with garage to verify.`,
        channel: record.customerHasApp ? "push" : "whatsapp",
        createdAt: record.createdAt
      };
    }

    return {
      id: `invoice_${record.id}`,
      title: "Invoice ready",
      body: `${record.invoiceNumber ?? "Invoice"} added to your service history.`,
      channel: record.invoiceDeliveryChannel,
      createdAt: record.createdAt
    };
  });
}

export async function getCustomerWorkspace(profile: AuthProfile): Promise<CustomerWorkspaceState> {
  assertCustomer(profile);
  const customerProfile = await readCustomerProfile(profile);
  const garageState = await readGarageState();
  const localGarage = garageState?.garage;
  const localRecords = garageState?.serviceRecords ?? fallbackRecords(localGarage?.name);
  const customerRecords = recordsForPhone(localRecords, customerProfile.phoneNumber);
  const remoteGarages = await loadRemoteGarages();
  const fallback = localGarage
    ? {
        id: localGarage.id,
        name: localGarage.name,
        phone: localGarage.phone,
        address: localGarage.address,
        serviceHours: localGarage.serviceHours,
        rating: localGarage.rating,
        totalReviews: localGarage.totalReviews,
        isVerified: localGarage.isVerified
      }
    : fallbackGarage();

  const reviews = await readJson<CustomerReview[]>(CUSTOMER_REVIEWS_KEY, []);
  const reports = await readJson<CustomerReport[]>(CUSTOMER_REPORTS_KEY, []);

  return {
    profile: customerProfile,
    garages: remoteGarages.length > 0 ? remoteGarages : [fallback],
    serviceHistory: customerRecords.filter((record) => record.status === "completed"),
    pendingOtpRecords: customerRecords.filter((record) => record.status === "pending_otp"),
    reviews: reviews.filter((review) => customerRecords.some((record) => record.garageId === review.garageId)),
    reports,
    notifications: buildNotifications(customerRecords)
  };
}

export async function saveCustomerProfile(
  authProfile: AuthProfile,
  input: CustomerProfileInput
): Promise<CustomerProfile> {
  assertCustomer(authProfile);
  const profile: CustomerProfile = {
    id: authProfile.id,
    phoneNumber: authProfile.phone_number,
    ...input,
    vehicleNumber: input.vehicleNumber.trim().toUpperCase()
  };
  await writeJson(CUSTOMER_PROFILE_KEY, profile);
  return profile;
}

export async function saveCustomerReview(
  authProfile: AuthProfile,
  input: CustomerReviewInput
): Promise<CustomerReview> {
  assertCustomer(authProfile);
  const state = await getCustomerWorkspace(authProfile);
  const hasCompletedService = state.serviceHistory.some((record) => record.garageId === input.garageId);
  if (!hasCompletedService) {
    throw new Error("You can review only garages where you have completed service.");
  }
  if (input.rating < 1 || input.rating > 5) {
    throw new Error("Rating must be between 1 and 5.");
  }

  const reviews = await readJson<CustomerReview[]>(CUSTOMER_REVIEWS_KEY, []);
  const existing = reviews.find((review) => review.garageId === input.garageId);
  const nextReview: CustomerReview = {
    id: existing?.id ?? generateId("review"),
    garageId: input.garageId,
    rating: input.rating,
    comment: input.comment.trim(),
    createdAt: existing?.createdAt ?? nowIso()
  };
  const nextReviews = existing
    ? reviews.map((review) => (review.id === existing.id ? nextReview : review))
    : [nextReview, ...reviews];
  await writeJson(CUSTOMER_REVIEWS_KEY, nextReviews);
  return nextReview;
}

export async function submitCustomerReport(
  authProfile: AuthProfile,
  input: CustomerReportInput
): Promise<CustomerReport> {
  assertCustomer(authProfile);
  const state = await getCustomerWorkspace(authProfile);
  const service = state.serviceHistory.find(
    (record) => record.id === input.serviceRecordId && record.garageId === input.garageId
  );
  if (!service) {
    throw new Error("You can report only a garage where you have completed service.");
  }
  if (!input.reason || input.description.trim().length < 5) {
    throw new Error("Reason and clear description are required.");
  }

  const reports = await readJson<CustomerReport[]>(CUSTOMER_REPORTS_KEY, []);
  const openDuplicate = reports.find(
    (report) =>
      report.garageId === input.garageId &&
      report.reason === input.reason &&
      (report.status === "pending" || report.status === "reviewing")
  );
  if (openDuplicate) {
    throw new Error("You already have an open report for this issue.");
  }

  const report: CustomerReport = {
    id: generateId("report"),
    garageId: input.garageId,
    garageName: service.garageName,
    serviceRecordId: input.serviceRecordId,
    reason: input.reason,
    description: input.description.trim(),
    evidenceNote: input.evidenceNote.trim(),
    status: "pending",
    createdAt: nowIso()
  };
  await writeJson(CUSTOMER_REPORTS_KEY, [report, ...reports]);
  return report;
}
