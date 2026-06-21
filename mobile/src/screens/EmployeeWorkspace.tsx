import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import {
  defaultEmployeeFilters,
  filterGarages,
  getEmployeeWorkspaceState,
  statusLabel,
  statusOptions
} from "../adminEmployee/adminEmployeeRepository";
import type {
  AdminGarage,
  EmployeeGarageFilters,
  EmployeeWorkspaceState,
  GarageStatusTag
} from "../adminEmployee/adminEmployeeTypes";
import { useAuth } from "../auth/AuthContext";
import type { AuthProfile } from "../auth/authTypes";

type EmployeeTab = "overview" | "garages" | "map" | "followups";

function tagStyle(tag: GarageStatusTag) {
  if (tag === "red") return styles.redTag;
  if (tag === "yellow") return styles.yellowTag;
  return styles.greenTag;
}

function PrimaryButton({
  label,
  onPress,
  variant = "primary"
}: {
  label: string;
  onPress(): void;
  variant?: "primary" | "outline";
}) {
  return (
    <Pressable onPress={onPress} style={[styles.button, variant === "outline" ? styles.outlineButton : null]}>
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

function Field({ label, value, onChangeText }: { label: string; value: string; onChangeText(value: string): void }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        onChangeText={onChangeText}
        placeholderTextColor="#94a3b8"
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function GarageCard({ garage }: { garage: AdminGarage }) {
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
        <Text style={styles.badge}>Rating {garage.rating.toFixed(1)}</Text>
      </View>
    </View>
  );
}

function MapDot({ garage, mine }: { garage: AdminGarage; mine: boolean }) {
  return (
    <View style={styles.mapRow}>
      <View style={[styles.mapDot, mine ? styles.mineDot : styles.otherDot]} />
      <View style={styles.flex}>
        <Text style={styles.mapTitle}>{garage.name}</Text>
        <Text style={styles.muted}>{garage.address}</Text>
      </View>
      <Text style={[styles.statusTag, tagStyle(garage.statusTag)]}>{statusLabel(garage.statusTag)}</Text>
    </View>
  );
}

export function EmployeeWorkspace({ profile }: { profile: AuthProfile }) {
  const { signOut } = useAuth();
  const [state, setState] = useState<EmployeeWorkspaceState | null>(null);
  const [tab, setTab] = useState<EmployeeTab>("overview");
  const [filters, setFilters] = useState<EmployeeGarageFilters>(defaultEmployeeFilters());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    setError("");
    try {
      setState(await getEmployeeWorkspaceState(profile));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employee workspace.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const filteredGarages = useMemo(() => filterGarages(state?.myGarages ?? [], filters), [filters, state]);

  function setFilter<Key extends keyof EmployeeGarageFilters>(key: Key, value: EmployeeGarageFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
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
        <View style={styles.flex}>
          <Text style={styles.kicker}>Employee</Text>
          <Text style={styles.title}>{state?.employee.name ?? "Field Executive"}</Text>
          <Text style={styles.subtitle}>Code {state?.employee.referralCode ?? "..."}</Text>
        </View>
        <PrimaryButton label="Logout" onPress={signOut} variant="outline" />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.tabs}>
        <TabButton active={tab === "overview"} label="Stats" onPress={() => setTab("overview")} />
        <TabButton active={tab === "garages"} label="Garages" onPress={() => setTab("garages")} />
        <TabButton active={tab === "map"} label="Map" onPress={() => setTab("map")} />
        <TabButton active={tab === "followups"} label="Follow-ups" onPress={() => setTab("followups")} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {tab === "overview" && metrics ? (
          <>
            <View style={styles.statsGrid}>
              <StatBox label="Total garages" value={String(metrics.totalGarages)} />
              <StatBox label="Active" value={String(metrics.activeGarages)} />
              <StatBox label="Inactive" value={String(metrics.inactiveGarages)} />
              <StatBox label="Avg txn/day" value={metrics.averageDailyTransactions.toFixed(1)} />
              <StatBox label="Retention" value={`${metrics.retentionRate}%`} />
              <StatBox label="Reactivation" value={`${metrics.reactivationRate}%`} />
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Financial data hidden</Text>
              <Text style={styles.muted}>Employees can see activity and retention, not revenue or payment amounts.</Text>
            </View>
          </>
        ) : null}

        {tab === "garages" ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Filters</Text>
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
            </View>
            {filteredGarages.map((garage) => (
              <GarageCard key={garage.id} garage={garage} />
            ))}
          </>
        ) : null}

        {tab === "map" ? (
          <View style={styles.card}>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.mapDot, styles.mineDot]} />
                <Text style={styles.muted}>Your garages</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.mapDot, styles.otherDot]} />
                <Text style={styles.muted}>Other garages</Text>
              </View>
            </View>
            {(state?.myGarages ?? []).slice(0, 12).map((garage) => (
              <MapDot key={garage.id} garage={garage} mine />
            ))}
            {(state?.otherGarages ?? []).slice(0, 8).map((garage) => (
              <MapDot key={garage.id} garage={garage} mine={false} />
            ))}
          </View>
        ) : null}

        {tab === "followups" ? (
          <>
            {(state?.followUps ?? []).length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>No follow-ups</Text>
                <Text style={styles.muted}>All assigned garages are recently active.</Text>
              </View>
            ) : null}
            {(state?.followUps ?? []).map((task) => (
              <View key={task.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={styles.flex}>
                    <Text style={styles.cardTitle}>{task.garageName}</Text>
                    <Text style={styles.muted}>Inactive for {task.inactiveDays}+ days</Text>
                  </View>
                  <Text style={styles.priority}>{task.priority}</Text>
                </View>
              </View>
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
  activeTab: {
    backgroundColor: "#2563eb"
  },
  activeTabText: {
    color: "#ffffff"
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
    gap: 12,
    justifyContent: "space-between",
    padding: 16
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
  legend: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 14
  },
  legendItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7
  },
  mapDot: {
    borderRadius: 8,
    height: 14,
    width: 14
  },
  mapRow: {
    alignItems: "center",
    borderTopColor: "#e2e8f0",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingVertical: 12
  },
  mapTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "800"
  },
  mineDot: {
    backgroundColor: "#2563eb"
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
  otherDot: {
    backgroundColor: "#94a3b8"
  },
  outlineButton: {
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
    borderWidth: 1
  },
  outlineButtonText: {
    color: "#0f172a"
  },
  priority: {
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    color: "#92400e",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
    textTransform: "uppercase"
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
    gap: 10
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
    fontSize: 12,
    fontWeight: "800"
  },
  title: {
    color: "#0f172a",
    fontSize: 23,
    fontWeight: "900"
  },
  yellowTag: {
    backgroundColor: "#fef3c7",
    color: "#92400e"
  }
});
