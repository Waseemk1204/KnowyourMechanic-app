import type { AuthProfile } from "../auth/authTypes";
import { platformStorage } from "../lib/platformStorage";
import { supabase } from "../lib/supabase";
import type {
  AdminEmployeeFilters,
  AdminEmployeeState,
  AdminGarage,
  AdminMetrics,
  EmployeeGarageFilters,
  EmployeeInput,
  EmployeeMetrics,
  EmployeeRow,
  EmployeeSummary,
  EmployeeWorkspaceState,
  FollowUpTask,
  GarageActivityFilter,
  GarageStatusTag,
  WarningPenaltyInput
} from "./adminEmployeeTypes";

const STORAGE_KEY = "kym.phase5.adminEmployeeState";
const PUNE_AREAS = [
  "Shivajinagar",
  "Kothrud",
  "Baner",
  "Wakad",
  "Hinjewadi",
  "Viman Nagar",
  "Kharadi",
  "Hadapsar"
];

function nowIso() {
  return new Date().toISOString();
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "").slice(-10);
}

function seededEmployeeId(index: number) {
  return `10000000-0000-0000-0000-${String(index).padStart(12, "0")}`;
}

function seededGarageId(index: number) {
  return `20000000-0000-0000-0000-${String(index).padStart(12, "0")}`;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function statusTag(dailyTransactions: number): GarageStatusTag {
  if (dailyTransactions <= 0) return "red";
  if (dailyTransactions < 4) return "yellow";
  return "green";
}

function generateReferralCode(name: string, existing: EmployeeSummary[]) {
  const prefix = name
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, "X");
  let counter = existing.length + 1001;
  let code = `${prefix}${counter}`;
  const used = new Set(existing.map((employee) => employee.referralCode));
  while (used.has(code)) {
    counter += 1;
    code = `${prefix}${counter}`;
  }
  return code;
}

function fallbackEmployees(): EmployeeSummary[] {
  return Array.from({ length: 8 }, (_, i) => {
    const index = i + 1;
    return {
      id: seededEmployeeId(index),
      name: `Field Executive ${index}`,
      email: `employee${index}@knowyourmechanic.local`,
      phone: `90000000${String(index).padStart(2, "0")}`,
      referralCode: `KYM${1000 + index}`,
      role: "employee",
      isActive: true,
      garageCount: 0,
      warnings: 0,
      penalties: 0,
      createdAt: daysAgo(60 - index)
    };
  });
}

function fallbackGarages(employees: EmployeeSummary[]): AdminGarage[] {
  return Array.from({ length: 32 }, (_, i) => {
    const index = i + 1;
    const employee = employees[i % employees.length];
    const dailyTransactions = index % 6 === 0 ? 0 : index % 5;
    const inactiveDays = dailyTransactions === 0 ? [3, 7, 14, 30][i % 4] : index % 3;
    const area = PUNE_AREAS[i % PUNE_AREAS.length];
    return {
      id: seededGarageId(index),
      name: `${area} Auto Care ${index}`,
      phone: `98${String(index).padStart(8, "0")}`,
      address: `${area}, Pune, Maharashtra`,
      latitude: 18.5 + (i % 8) * 0.01,
      longitude: 73.8 + (i % 8) * 0.01,
      rating: 3.8 + (i % 12) / 10,
      totalReviews: 5 + (i % 95),
      assignedEmployeeId: employee.id,
      assignedEmployeeName: employee.name,
      referralCode: employee.referralCode,
      onboardingStatus: "completed",
      isVerified: index % 5 !== 0,
      isOffboarded: false,
      createdAt: daysAgo(index),
      dailyTransactions,
      lastTransactionAt: dailyTransactions > 0 ? daysAgo(inactiveDays) : daysAgo(inactiveDays),
      statusTag: statusTag(dailyTransactions)
    };
  });
}

function mapEmployee(row: EmployeeRow): EmployeeSummary {
  return {
    id: row.id,
    profileId: row.profile_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    referralCode: row.referral_code,
    role: row.role === "admin" ? "admin" : "employee",
    isActive: row.is_active,
    garageCount: 0,
    warnings: 0,
    penalties: 0,
    createdAt: row.created_at
  };
}

type GarageListRow = {
  id: string;
  assigned_employee_id: string | null;
  name: string;
  phone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number;
  total_reviews: number;
  onboarding_status: string;
  is_verified: boolean;
  is_offboarded: boolean;
  referral_code: string | null;
  created_at: string;
};

function mapGarage(row: GarageListRow, employees: EmployeeSummary[], index: number): AdminGarage {
  const dailyTransactions = index % 7 === 0 ? 0 : (index % 6) + 1;
  const employee = employees.find((item) => item.id === row.assigned_employee_id);
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address ?? "Address not available",
    latitude: row.latitude,
    longitude: row.longitude,
    rating: Number(row.rating ?? 0),
    totalReviews: row.total_reviews,
    assignedEmployeeId: row.assigned_employee_id,
    assignedEmployeeName: employee?.name ?? null,
    referralCode: row.referral_code,
    onboardingStatus: row.onboarding_status,
    isVerified: row.is_verified,
    isOffboarded: row.is_offboarded,
    createdAt: row.created_at,
    dailyTransactions,
    lastTransactionAt: dailyTransactions > 0 ? daysAgo(index % 3) : daysAgo([3, 7, 14, 30][index % 4]),
    statusTag: statusTag(dailyTransactions)
  };
}

async function loadRemoteEmployees(): Promise<EmployeeSummary[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("employees")
    .select("id, profile_id, name, email, phone, referral_code, role, is_active, created_at, updated_at")
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map(mapEmployee);
}

async function loadRemoteGarages(employees: EmployeeSummary[]): Promise<AdminGarage[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("garages")
    .select(
      "id, assigned_employee_id, name, phone, address, latitude, longitude, rating, total_reviews, onboarding_status, is_verified, is_offboarded, referral_code, created_at"
    )
    .eq("is_offboarded", false)
    .order("created_at", { ascending: false })
    .limit(80);
  if (error || !data) return [];
  return data.map((garage, index) => mapGarage(garage, employees, index));
}

async function readJson<T>(key: string): Promise<T | null> {
  const stored = await platformStorage.getItem(key);
  return stored ? (JSON.parse(stored) as T) : null;
}

async function writeState(state: AdminEmployeeState) {
  await platformStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function attachGarageCounts(employees: EmployeeSummary[], garages: AdminGarage[]) {
  return employees.map((employee) => ({
    ...employee,
    garageCount: garages.filter((garage) => garage.assignedEmployeeId === employee.id && !garage.isOffboarded).length
  }));
}

function buildAdminMetrics(employees: EmployeeSummary[], garages: AdminGarage[]): AdminMetrics {
  const activeGarages = garages.filter((garage) => garage.dailyTransactions > 0).length;
  const platformTransactions = garages.reduce((sum, garage) => sum + garage.dailyTransactions, 0);
  return {
    totalGarages: garages.length,
    activeGarages,
    inactiveGarages: garages.length - activeGarages,
    totalEmployees: employees.length,
    activeEmployees: employees.filter((employee) => employee.isActive).length,
    platformTransactions,
    platformRevenue: platformTransactions * 1.9
  };
}

async function buildInitialState(): Promise<AdminEmployeeState> {
  const remoteEmployees = await loadRemoteEmployees();
  const employees = remoteEmployees.length > 0 ? remoteEmployees : fallbackEmployees();
  const remoteGarages = await loadRemoteGarages(employees);
  const garages = remoteGarages.length > 0 ? remoteGarages : fallbackGarages(employees);
  const countedEmployees = attachGarageCounts(employees, garages);
  return {
    employees: countedEmployees,
    garages: garages.map((garage) => ({
      ...garage,
      assignedEmployeeName: countedEmployees.find((employee) => employee.id === garage.assignedEmployeeId)?.name ?? null
    })),
    metrics: buildAdminMetrics(countedEmployees, garages)
  };
}

async function readState(): Promise<AdminEmployeeState> {
  const stored = await readJson<AdminEmployeeState>(STORAGE_KEY);
  if (stored) return stored;
  const initial = await buildInitialState();
  await writeState(initial);
  return initial;
}

function rebuildState(state: AdminEmployeeState): AdminEmployeeState {
  const employees = attachGarageCounts(state.employees, state.garages);
  const garages = state.garages.map((garage) => ({
    ...garage,
    assignedEmployeeName: employees.find((employee) => employee.id === garage.assignedEmployeeId)?.name ?? null
  }));
  return {
    employees,
    garages,
    metrics: buildAdminMetrics(employees, garages)
  };
}

function assertRole(profile: AuthProfile, roles: AuthProfile["role"][]) {
  if (!roles.includes(profile.role)) {
    throw new Error("You do not have access to this workspace.");
  }
}

function calculateEmployeeMetrics(garages: AdminGarage[]): EmployeeMetrics {
  const activeGarages = garages.filter((garage) => garage.dailyTransactions > 0).length;
  const totalDailyTransactions = garages.reduce((sum, garage) => sum + garage.dailyTransactions, 0);
  return {
    totalGarages: garages.length,
    activeGarages,
    inactiveGarages: garages.length - activeGarages,
    averageDailyTransactions: garages.length ? totalDailyTransactions / garages.length : 0,
    retentionRate: garages.length ? Math.round((activeGarages / garages.length) * 100) : 0,
    reactivationRate: garages.length ? Math.round((garages.filter((garage) => garage.statusTag === "yellow").length / garages.length) * 100) : 0
  };
}

function inactiveDays(garage: AdminGarage) {
  if (!garage.lastTransactionAt) return 30;
  const diff = Date.now() - new Date(garage.lastTransactionAt).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function buildFollowUps(garages: AdminGarage[]): FollowUpTask[] {
  return garages
    .map((garage) => {
      const days = inactiveDays(garage);
      const bucket = days >= 30 ? 30 : days >= 14 ? 14 : days >= 7 ? 7 : days >= 3 ? 3 : null;
      if (!bucket) return null;
      return {
        id: `follow_${garage.id}_${bucket}`,
        garageId: garage.id,
        garageName: garage.name,
        inactiveDays: bucket,
        priority: bucket === 30 ? "urgent" : bucket === 14 ? "high" : bucket === 7 ? "medium" : "low"
      } satisfies FollowUpTask;
    })
    .filter((task): task is FollowUpTask => task !== null);
}

export function filterGarages(garages: AdminGarage[], filters: AdminEmployeeFilters | EmployeeGarageFilters) {
  const search = filters.search.trim().toLowerCase();
  return garages.filter((garage) => {
    const matchesSearch =
      !search ||
      garage.name.toLowerCase().includes(search) ||
      garage.address.toLowerCase().includes(search) ||
      garage.phone?.includes(search);
    const matchesLocation = !filters.location || garage.address.toLowerCase().includes(filters.location.toLowerCase());
    const matchesStatus = filters.status === "all" || garage.statusTag === filters.status;
    const employeeFilter = "employeeId" in filters ? filters.employeeId : "all";
    const matchesEmployee =
      employeeFilter === "all" ||
      (employeeFilter === "unassigned" ? !garage.assignedEmployeeId : garage.assignedEmployeeId === employeeFilter);
    return matchesSearch && matchesLocation && matchesStatus && matchesEmployee;
  });
}

export function statusLabel(tag: GarageStatusTag) {
  if (tag === "red") return "Red";
  if (tag === "yellow") return "Yellow";
  return "Green";
}

export function defaultAdminFilters(): AdminEmployeeFilters {
  return {
    search: "",
    employeeId: "all",
    location: "",
    status: "all"
  };
}

export function defaultEmployeeFilters(): EmployeeGarageFilters {
  return {
    search: "",
    location: "",
    status: "all"
  };
}

export async function getAdminEmployeeState(profile: AuthProfile): Promise<AdminEmployeeState> {
  assertRole(profile, ["admin"]);
  return readState();
}

export async function getEmployeeWorkspaceState(profile: AuthProfile): Promise<EmployeeWorkspaceState> {
  assertRole(profile, ["employee"]);
  const state = await readState();
  const employee =
    state.employees.find((item) => item.profileId === profile.id || item.phone === profile.phone_number) ??
    state.employees[0];
  const myGarages = state.garages.filter((garage) => garage.assignedEmployeeId === employee.id && !garage.isOffboarded);
  const otherGarages = state.garages.filter((garage) => garage.assignedEmployeeId !== employee.id && !garage.isOffboarded);
  return {
    employee,
    myGarages,
    otherGarages,
    metrics: calculateEmployeeMetrics(myGarages),
    followUps: buildFollowUps(myGarages)
  };
}

export async function addEmployee(profile: AuthProfile, input: EmployeeInput): Promise<AdminEmployeeState> {
  assertRole(profile, ["admin"]);
  const state = await readState();
  const employee: EmployeeSummary = {
    id: `employee_${Date.now()}`,
    name: input.name.trim(),
    email: input.email.trim(),
    phone: normalizePhone(input.phone),
    referralCode: generateReferralCode(input.name, state.employees),
    role: input.role,
    isActive: true,
    garageCount: 0,
    warnings: 0,
    penalties: 0,
    createdAt: nowIso()
  };
  const next = rebuildState({ ...state, employees: [employee, ...state.employees] });
  await writeState(next);
  return next;
}

export async function updateEmployee(profile: AuthProfile, employeeId: string, input: EmployeeInput): Promise<AdminEmployeeState> {
  assertRole(profile, ["admin"]);
  const state = await readState();
  const nextEmployees = state.employees.map((employee) =>
    employee.id === employeeId
      ? { ...employee, name: input.name.trim(), email: input.email.trim(), phone: normalizePhone(input.phone), role: input.role }
      : employee
  );
  const next = rebuildState({ ...state, employees: nextEmployees });
  await writeState(next);
  return next;
}

export async function offboardEmployee(profile: AuthProfile, employeeId: string): Promise<AdminEmployeeState> {
  assertRole(profile, ["admin"]);
  const state = await readState();
  const nextEmployees = state.employees.map((employee) =>
    employee.id === employeeId ? { ...employee, isActive: false } : employee
  );
  const nextGarages = state.garages.map((garage) =>
    garage.assignedEmployeeId === employeeId
      ? { ...garage, assignedEmployeeId: null, assignedEmployeeName: null }
      : garage
  );
  const next = rebuildState({ ...state, employees: nextEmployees, garages: nextGarages });
  await writeState(next);
  return next;
}

export async function reassignGarage(profile: AuthProfile, garageId: string, employeeId: string | null): Promise<AdminEmployeeState> {
  assertRole(profile, ["admin"]);
  const state = await readState();
  const employee = state.employees.find((item) => item.id === employeeId);
  const nextGarages = state.garages.map((garage) =>
    garage.id === garageId
      ? {
          ...garage,
          assignedEmployeeId: employee?.id ?? null,
          assignedEmployeeName: employee?.name ?? null,
          referralCode: employee?.referralCode ?? null
        }
      : garage
  );
  const next = rebuildState({ ...state, garages: nextGarages });
  await writeState(next);
  return next;
}

export async function recordWarningPenalty(profile: AuthProfile, input: WarningPenaltyInput): Promise<AdminEmployeeState> {
  assertRole(profile, ["admin"]);
  const state = await readState();
  const nextEmployees = state.employees.map((employee) =>
    employee.id === input.employeeId
      ? {
          ...employee,
          warnings: input.type === "warning" ? employee.warnings + 1 : employee.warnings,
          penalties: input.type === "penalty" ? employee.penalties + 1 : employee.penalties
        }
      : employee
  );
  const next = rebuildState({ ...state, employees: nextEmployees });
  await writeState(next);
  return next;
}

export function statusOptions(): Array<{ label: string; value: GarageActivityFilter }> {
  return [
    { label: "All", value: "all" },
    { label: "Red", value: "red" },
    { label: "Yellow", value: "yellow" },
    { label: "Green", value: "green" }
  ];
}
