import type { GarageServiceRecord } from "../garage/garageTypes";

export type CustomerProfile = {
  id: string;
  phoneNumber: string;
  name: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleNumber: string;
};

export type CustomerGarage = {
  id: string;
  name: string;
  phone: string;
  address: string;
  serviceHours: string;
  rating: number;
  totalReviews: number;
  isVerified: boolean;
};

export type CustomerReview = {
  id: string;
  garageId: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type CustomerReport = {
  id: string;
  garageId: string;
  garageName: string;
  serviceRecordId: string;
  reason: "overcharging" | "poor_service" | "fraud" | "harassment" | "other";
  description: string;
  evidenceNote: string;
  status: "pending" | "reviewing" | "resolved" | "dismissed";
  createdAt: string;
};

export type CustomerNotificationInfo = {
  id: string;
  title: string;
  body: string;
  channel: "push" | "whatsapp" | "none";
  createdAt: string;
};

export type CustomerWorkspaceState = {
  profile: CustomerProfile;
  garages: CustomerGarage[];
  serviceHistory: GarageServiceRecord[];
  pendingOtpRecords: GarageServiceRecord[];
  reviews: CustomerReview[];
  reports: CustomerReport[];
  notifications: CustomerNotificationInfo[];
};

export type CustomerProfileInput = Omit<CustomerProfile, "id" | "phoneNumber">;

export type CustomerReviewInput = {
  garageId: string;
  rating: number;
  comment: string;
};

export type CustomerReportInput = {
  garageId: string;
  serviceRecordId: string;
  reason: CustomerReport["reason"];
  description: string;
  evidenceNote: string;
};
