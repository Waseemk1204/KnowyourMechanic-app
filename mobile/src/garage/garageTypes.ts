export type GaragePaymentMethod = "cash" | "qr";

export type GarageServiceStatus = "pending_otp" | "otp_verified" | "completed";

export type GarageVerificationMethod = "in_app" | "whatsapp";

export type VehicleType = "2w" | "3w" | "4w" | "other";

export type GarageProfile = {
  id: string;
  ownerProfileId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  serviceHours: string;
  workingDays: string[];
  photoUrl?: string;
  rating: number;
  totalReviews: number;
  onboardingStatus: "pending" | "completed";
  isVerified: boolean;
  businessType: "individual" | "partnership" | "proprietorship" | "private_limited" | "public_limited";
  legalBusinessName: string;
  bankAccountHolderName?: string;
  bankName?: string;
  bankIfscCode?: string;
  bankAccountNumber?: string;
};

export type GarageServiceRecord = {
  id: string;
  garageId: string;
  garageName: string;
  customerPhone: string;
  customerHasApp: boolean;
  vehicleNumber: string;
  vehicleInfo: string;
  vehicleType: VehicleType;
  vehicleMakeCode: string | null;
  vehicleModelCode: string | null;
  vehicleMakeName: string;
  vehicleModelName: string;
  modelYear: number | null;
  odometerKm: number | null;
  serviceCategoryCodes: string[];
  serviceCategoryNames: string[];
  failureCategoryCodes: string[];
  failureCategoryNames: string[];
  serviceNotes: string;
  description: string;
  amount: number;
  platformFee: number;
  garageEarnings: number;
  status: GarageServiceStatus;
  verificationMethod: GarageVerificationMethod;
  approvedByCustomer: boolean;
  paymentMethod?: GaragePaymentMethod;
  isReliable: boolean;
  invoiceNumber?: string;
  invoiceDeliveryChannel: "push" | "whatsapp" | "none";
  invoiceNotificationStatus: "not_required" | "pending" | "sent";
  createdAt: string;
};

export type GarageDashboardState = {
  garage: GarageProfile | null;
  serviceRecords: GarageServiceRecord[];
};

export type GarageOnboardingInput = {
  name: string;
  email: string;
  phone: string;
  address: string;
  serviceHours: string;
  workingDays: string[];
  businessType: GarageProfile["businessType"];
  legalBusinessName: string;
  bankAccountHolderName: string;
  bankName: string;
  bankIfscCode: string;
  bankAccountNumber: string;
};

export type GarageProfileInput = Pick<
  GarageProfile,
  "name" | "email" | "phone" | "address" | "serviceHours" | "workingDays" | "businessType" | "legalBusinessName"
>;

export type CreateServiceRecordInput = {
  customerPhone: string;
  customerHasApp: boolean;
  vehicleNumber: string;
  vehicleType: VehicleType | null;
  vehicleMakeCode: string | null;
  vehicleModelCode: string | null;
  vehicleMakeOther: string;
  vehicleModelOther: string;
  vehicleMakeName: string;
  vehicleModelName: string;
  modelYear: number | null;
  odometerKm: number | null;
  serviceCategoryCodes: string[];
  serviceCategoryNames: string[];
  failureCategoryCodes: string[];
  failureCategoryNames: string[];
  serviceNotes: string;
  amount: number;
};

export type CreateServiceRecordResult = {
  record: GarageServiceRecord;
  otp: string;
};

export type PaymentResult = {
  record: GarageServiceRecord;
  paymentSummary: {
    customerPays: number;
    platformFee: number;
    garageReceives: number;
    verified: boolean;
  };
};
