import type { Database } from "../../../supabase/types/database.types";

export type EmployeeRole = "employee" | "admin";
export type GarageStatusTag = "red" | "yellow" | "green";
export type GarageActivityFilter = "all" | GarageStatusTag;

export type EmployeeSummary = {
  id: string;
  profileId?: string | null;
  name: string;
  email?: string | null;
  phone: string;
  referralCode: string;
  role: EmployeeRole;
  isActive: boolean;
  garageCount: number;
  warnings: number;
  penalties: number;
  createdAt: string;
};

export type AdminGarage = {
  id: string;
  name: string;
  phone?: string | null;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  rating: number;
  totalReviews: number;
  assignedEmployeeId?: string | null;
  assignedEmployeeName?: string | null;
  referralCode?: string | null;
  onboardingStatus: string;
  isVerified: boolean;
  isOffboarded: boolean;
  createdAt: string;
  dailyTransactions: number;
  lastTransactionAt?: string | null;
  statusTag: GarageStatusTag;
};

export type EmployeeMetrics = {
  totalGarages: number;
  activeGarages: number;
  inactiveGarages: number;
  averageDailyTransactions: number;
  retentionRate: number;
  reactivationRate: number;
};

export type AdminMetrics = {
  totalGarages: number;
  activeGarages: number;
  inactiveGarages: number;
  totalEmployees: number;
  activeEmployees: number;
  platformTransactions: number;
  platformRevenue: number;
};

export type FollowUpTask = {
  id: string;
  garageId: string;
  garageName: string;
  inactiveDays: 3 | 7 | 14 | 30;
  priority: "low" | "medium" | "high" | "urgent";
};

export type AdminEmployeeFilters = {
  search: string;
  employeeId: string | "all" | "unassigned";
  location: string;
  status: GarageActivityFilter;
};

export type EmployeeGarageFilters = {
  search: string;
  location: string;
  status: GarageActivityFilter;
};

export type AdminEmployeeState = {
  employees: EmployeeSummary[];
  garages: AdminGarage[];
  metrics: AdminMetrics;
};

export type EmployeeWorkspaceState = {
  employee: EmployeeSummary;
  myGarages: AdminGarage[];
  otherGarages: AdminGarage[];
  metrics: EmployeeMetrics;
  followUps: FollowUpTask[];
};

export type EmployeeInput = {
  name: string;
  email: string;
  phone: string;
  role: EmployeeRole;
};

export type WarningPenaltyInput = {
  employeeId: string;
  type: "warning" | "penalty";
};

export type EmployeeRow = Database["public"]["Tables"]["employees"]["Row"];
export type GarageRow = Database["public"]["Tables"]["garages"]["Row"];
