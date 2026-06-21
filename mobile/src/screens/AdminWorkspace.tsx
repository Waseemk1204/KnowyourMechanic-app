import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import {
  addEmployee,
  defaultAdminFilters,
  filterGarages,
  getAdminEmployeeState,
  offboardEmployee,
  reassignGarage,
  recordWarningPenalty,
  statusLabel,
  statusOptions,
  updateEmployee
} from "../adminEmployee/adminEmployeeRepository";
import type {
  AdminEmployeeFilters,
  AdminEmployeeState,
  AdminGarage,
  EmployeeInput,
  EmployeeSummary,
  GarageActivityFilter,
  GarageStatusTag
} from "../adminEmployee/adminEmployeeTypes";
import { useAuth } from "../auth/AuthContext";
import type { AuthProfile } from "../auth/authTypes";

type AdminTab = "overview" | "employees" | "garages";

const emptyEmployeeForm: EmployeeInput = {
  name: "",
  email: "",
  phone: "",
  role: "employee"
};

function money(value: number) {
  return `Rs ${value.toFixed(2)}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function tagStyle(tag: GarageStatusTag) {
  if (tag === "red") return styles.redTag;
  if (tag === "yellow") return styles.yellowTag;
  return styles.greenTag;
}

function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = "primary"
}: {
  label: string;
  onPress(): void;
  disabled?: boolean;
  variant?: "primary" | "outline" | "danger" | "dark";
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        variant === "outline" ? styles.outlineButton : null,
        variant === "danger" ? styles.dangerButton : null,
        variant === "dark" ? styles.darkButton : null,
        disabled ? styles.disabledButton : null
      ]}
    >
      <Text style={[styles.buttonText, variant === "outline" ? styles.outlineButtonText : null]}>{label}</Text>
    </Pressable>
  );
}

function TabButton({
  active,
  label,
  onPress
}: {
  active: boolean;
  label: string;
  onPress(): void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active ? styles.activeTab : null]}>
      <Text style={[styles.tabText, active ? styles.activeTabText : null]}>{label}</Text>
    </Pressable>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType
}: {
  label: string;
  value: string;
  onChangeText(value: string): void;
  keyboardType?: "default" | "email-address" | "phone-pad";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholderTextColor="#94a3b8"
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function EmployeeCard({
  employee,
  onEdit,
  onOffboard,
  onWarning,
  onPenalty
}: {
  employee: EmployeeSummary;
  onEdit(employee: EmployeeSummary): void;
  onOffboard(employee: EmployeeSummary): void;
  onWarning(employee: EmployeeSummary): void;
  onPenalty(employee: EmployeeSummary): void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{employee.name}</Text>
          <Text style={styles.muted}>{employee.phone} | {employee.email || "No email"}</Text>
        </View>
        <Text style={employee.isActive ? styles.activePill : styles.inactivePill}>
          {employee.isActive ? "Active" : "Offboarded"}
        </Text>
      </View>
      <View style={styles.badgeRow}>
        <Text style={styles.badge}>{employee.referralCode}</Text>
        <Text style={styles.badge}>{employee.garageCount} garages</Text>
        <Text style={styles.badge}>{employee.warnings} warnings</Text>
        <Text style={styles.badge}>{employee.penalties} penalties</Text>
      </View>
      <View style={styles.inlineActions}>
        <PrimaryButton label="Edit" onPress={() => onEdit(employee)} variant="outline" />
        <PrimaryButton label="Warn" onPress={() => onWarning(employee)} variant="outline" />
        <PrimaryButton label="Penalty" onPress={() => onPenalty(employee)} variant="outline" />
        <PrimaryButton
          disabled={!employee.isActive}
          label="Offboard"
          onPress={() => onOffboard(employee)}
          variant="danger"
        />
      </View>
    </View>
  );
}

function GarageCard({
  garage,
  employees,
  onAssign
}: {
  garage: AdminGarage;
  employees: EmployeeSummary[];
  onAssign(garage: AdminGarage, employeeId: string | null): void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{garage.name}</Text>
          <Text style={styles.muted}>{garage.address}</Text>
        </View>
        <Text style={[styles.statusTag, tagStyle(garage.statusTag)]}>{statusLabel(garage.statusTag)}</Text>
      </View>
      <View style={styles.badgeRow}>
        <Text style={styles.badge}>{garage.dailyTransactions}/day</Text>
        <Text style={styles.badge}>{garage.isVerified ? "Verified" : "Pending"}</Text>
        <Text style={styles.badge}>{garage.assignedEmployeeName ?? "Unassigned"}</Text>
      </View>
      <Text style={styles.infoLine}>
        Rating {garage.rating.toFixed(1)} | Reviews {garage.totalReviews} | Added {formatDate(garage.createdAt)}
      </Text>
      <View style={styles.assignGrid}>
        <PrimaryButton label="Unassign" onPress={() => onAssign(garage, null)} variant="outline" />
        {employees.filter((employee) => employee.isActive).slice(0, 4).map((employee) => (
          <PrimaryButton
            key={employee.id}
            label={employee.name.replace("Field Executive ", "FE ")}
            onPress={() => onAssign(garage, employee.id)}
            variant={garage.assignedEmployeeId === employee.id ? "dark" : "outline"}
          />
        ))}
      </View>
    </View>
  );
}

export function AdminWorkspace({ profile }: { profile: AuthProfile }) {
  const { signOut } = useAuth();
  const [state, setState] = useState<AdminEmployeeState | null>(null);
  const [tab, setTab] = useState<AdminTab>("overview");
  const [filters, setFilters] = useState<AdminEmployeeFilters>(defaultAdminFilters());
  const [form, setForm] = useState<EmployeeInput>(emptyEmployeeForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    setError("");
    try {
      setState(await getAdminEmployeeState(profile));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin workspace.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const filteredGarages = useMemo(() => filterGarages(state?.garages ?? [], filters), [filters, state]);

  function setFilter<Key extends keyof AdminEmployeeFilters>(key: Key, value: AdminEmployeeFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function setFormField<Key extends keyof EmployeeInput>(key: Key, value: EmployeeInput[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startEdit(employee: EmployeeSummary) {
    setEditingId(employee.id);
    setForm({
      name: employee.name,
      email: employee.email ?? "",
      phone: employee.phone,
      role: employee.role
    });
    setTab("employees");
  }

  async function saveEmployee() {
    if (!form.name.trim() || form.phone.replace(/\D/g, "").slice(-10).length !== 10) {
      setError("Employee name and valid phone are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const next = editingId ? await updateEmployee(profile, editingId, form) : await addEmployee(profile, form);
      setState(next);
      setForm(emptyEmployeeForm);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save employee.");
    } finally {
      setSaving(false);
    }
  }

  async function handleOffboard(employee: EmployeeSummary) {
    Alert.alert("Offboard employee", "Their garages will become unassigned.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Offboard",
        style: "destructive",
        onPress: async () => setState(await offboardEmployee(profile, employee.id))
      }
    ]);
  }

  async function handleAssign(garage: AdminGarage, employeeId: string | null) {
    setState(await reassignGarage(profile, garage.id, employeeId));
  }

  async function handleWarningPenalty(employee: EmployeeSummary, type: "warning" | "penalty") {
    setState(await recordWarningPenalty(profile, { employeeId: employee.id, type }));
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  const metrics = state?.metrics;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Admin</Text>
          <Text style={styles.title}>Platform Control</Text>
          <Text style={styles.subtitle}>Employees, garages, analytics, reassignment</Text>
        </View>
        <PrimaryButton label="Logout" onPress={signOut} variant="outline" />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.tabs}>
        <TabButton active={tab === "overview"} label="Overview" onPress={() => setTab("overview")} />
        <TabButton active={tab === "employees"} label="Employees" onPress={() => setTab("employees")} />
        <TabButton active={tab === "garages"} label="Garages" onPress={() => setTab("garages")} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {tab === "overview" && metrics ? (
          <>
            <View style={styles.statsGrid}>
              <StatBox label="Garages" value={String(metrics.totalGarages)} />
              <StatBox label="Active garages" value={String(metrics.activeGarages)} />
              <StatBox label="Employees" value={String(metrics.activeEmployees)} />
              <StatBox label="Platform revenue" value={money(metrics.platformRevenue)} />
            </View>
            <Text style={styles.sectionTitle}>Activity Tags</Text>
            <View style={styles.card}>
              <Text style={styles.infoLine}>Red: no transactions</Text>
              <Text style={styles.infoLine}>Yellow: fewer than 4 transactions/day</Text>
              <Text style={styles.infoLine}>Green: 4 or more transactions/day</Text>
            </View>
          </>
        ) : null}

        {tab === "employees" ? (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{editingId ? "Edit employee" : "Add employee"}</Text>
              <Field label="Name" value={form.name} onChangeText={(value) => setFormField("name", value)} />
              <Field
                keyboardType="email-address"
                label="Email"
                value={form.email}
                onChangeText={(value) => setFormField("email", value)}
              />
              <Field
                keyboardType="phone-pad"
                label="Phone"
                value={form.phone}
                onChangeText={(value) => setFormField("phone", value)}
              />
              <View style={styles.inlineActions}>
                <PrimaryButton disabled={saving} label={editingId ? "Update" : "Create"} onPress={saveEmployee} />
                {editingId ? (
                  <PrimaryButton
                    label="Cancel"
                    onPress={() => {
                      setEditingId(null);
                      setForm(emptyEmployeeForm);
                    }}
                    variant="outline"
                  />
                ) : null}
              </View>
            </View>
            {(state?.employees ?? []).map((employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                onEdit={startEdit}
                onOffboard={handleOffboard}
                onPenalty={(item) => handleWarningPenalty(item, "penalty")}
                onWarning={(item) => handleWarningPenalty(item, "warning")}
              />
            ))}
          </>
        ) : null}

        {tab === "garages" ? (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Garage filters</Text>
              <Field label="Search" value={filters.search} onChangeText={(value) => setFilter("search", value)} />
              <Field label="Location" value={filters.location} onChangeText={(value) => setFilter("location", value)} />
              <View style={styles.optionRow}>
                {statusOptions().map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => setFilter("status", option.value)}
                    style={[styles.option, filters.status === option.value ? styles.activeOption : null]}
                  >
                    <Text style={[styles.optionText, filters.status === option.value ? styles.activeOptionText : null]}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.optionRow}>
                <Pressable
                  onPress={() => setFilter("employeeId", "all")}
                  style={[styles.option, filters.employeeId === "all" ? styles.activeOption : null]}
                >
                  <Text style={[styles.optionText, filters.employeeId === "all" ? styles.activeOptionText : null]}>All</Text>
                </Pressable>
                <Pressable
                  onPress={() => setFilter("employeeId", "unassigned")}
                  style={[styles.option, filters.employeeId === "unassigned" ? styles.activeOption : null]}
                >
                  <Text style={[styles.optionText, filters.employeeId === "unassigned" ? styles.activeOptionText : null]}>
                    Unassigned
                  </Text>
                </Pressable>
                {(state?.employees ?? []).slice(0, 4).map((employee) => (
                  <Pressable
                    key={employee.id}
                    onPress={() => setFilter("employeeId", employee.id)}
                    style={[styles.option, filters.employeeId === employee.id ? styles.activeOption : null]}
                  >
                    <Text style={[styles.optionText, filters.employeeId === employee.id ? styles.activeOptionText : null]}>
                      {employee.name.replace("Field Executive ", "FE ")}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {filteredGarages.map((garage) => (
              <GarageCard key={garage.id} garage={garage} employees={state?.employees ?? []} onAssign={handleAssign} />
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  activeOption: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a"
  },
  activeOptionText: {
    color: "#ffffff"
  },
  activePill: {
    backgroundColor: "#dcfce7",
    borderRadius: 8,
    color: "#166534",
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  activeTab: {
    backgroundColor: "#2563eb"
  },
  activeTabText: {
    color: "#ffffff"
  },
  assignGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  badge: {
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  button: {
    alignItems: "center",
    backgroundColor: "#2563eb",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 14
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800"
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16
  },
  cardTitle: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "800"
  },
  center: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  },
  container: {
    backgroundColor: "#f8fafc",
    flex: 1
  },
  content: {
    padding: 16,
    paddingBottom: 40
  },
  dangerButton: {
    backgroundColor: "#ef4444"
  },
  darkButton: {
    backgroundColor: "#0f172a"
  },
  disabledButton: {
    opacity: 0.5
  },
  error: {
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "700",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    textAlign: "center"
  },
  field: {
    marginTop: 12
  },
  flex: {
    flex: 1
  },
  greenTag: {
    backgroundColor: "#dcfce7",
    color: "#166534"
  },
  header: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderBottomColor: "#e2e8f0",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16
  },
  inactivePill: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    color: "#991b1b",
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  infoLine: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 8
  },
  inlineActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14
  },
  input: {
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0f172a",
    fontSize: 15,
    minHeight: 44,
    paddingHorizontal: 12
  },
  kicker: {
    color: "#2563eb",
    fontSize: 13,
    fontWeight: "800"
  },
  label: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 6
  },
  muted: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 4
  },
  option: {
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  optionText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "800"
  },
  outlineButton: {
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
    borderWidth: 1
  },
  outlineButtonText: {
    color: "#0f172a"
  },
  redTag: {
    backgroundColor: "#fee2e2",
    color: "#991b1b"
  },
  rowBetween: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "800"
  },
  statBox: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: "48%",
    flexGrow: 1,
    padding: 16
  },
  statLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 5
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16
  },
  statValue: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: "900"
  },
  statusTag: {
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  subtitle: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 3
  },
  tab: {
    alignItems: "center",
    borderRadius: 8,
    flex: 1,
    minHeight: 42,
    justifyContent: "center"
  },
  tabs: {
    backgroundColor: "#e2e8f0",
    borderRadius: 8,
    flexDirection: "row",
    gap: 4,
    margin: 16,
    marginBottom: 0,
    padding: 4
  },
  tabText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "800"
  },
  title: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: "900"
  },
  yellowTag: {
    backgroundColor: "#fef3c7",
    color: "#92400e"
  }
});
