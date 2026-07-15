import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { useAuth } from "../auth/AuthContext";
import type { AuthProfile } from "../auth/authTypes";
import {
  getCustomerWorkspace,
  saveCustomerProfile,
  saveCustomerReview,
  submitCustomerReport
} from "../customer/customerRepository";
import type {
  CustomerGarage,
  CustomerProfileInput,
  CustomerReportInput,
  CustomerWorkspaceState
} from "../customer/customerTypes";
import type { GarageServiceRecord } from "../garage/garageTypes";

type CustomerTab = "home" | "activity" | "profile" | "reports" | "support";

const reportReasons: Array<{ label: string; value: CustomerReportInput["reason"] }> = [
  { label: "Overcharging", value: "overcharging" },
  { label: "Poor service", value: "poor_service" },
  { label: "Fraud / scam", value: "fraud" },
  { label: "Harassment", value: "harassment" },
  { label: "Other", value: "other" }
];

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

function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = "primary"
}: {
  label: string;
  onPress(): void;
  disabled?: boolean;
  variant?: "primary" | "dark" | "outline" | "danger";
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        variant === "dark" ? styles.darkButton : null,
        variant === "outline" ? styles.outlineButton : null,
        variant === "danger" ? styles.dangerButton : null,
        disabled ? styles.disabledButton : null
      ]}
    >
      <Text style={[styles.buttonText, variant === "outline" ? styles.outlineButtonText : null]}>{label}</Text>
    </Pressable>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  keyboardType,
  multiline
}: {
  label: string;
  value: string;
  onChangeText(value: string): void;
  keyboardType?: "default" | "numeric" | "phone-pad";
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholderTextColor="#94a3b8"
        style={[styles.input, multiline ? styles.textArea : null]}
        value={value}
      />
    </View>
  );
}

function GarageCard({ garage }: { garage: CustomerGarage }) {
  const initial = garage.name.trim().charAt(0).toUpperCase() || "G";
  return (
    <View style={styles.garageCard}>
      <View style={styles.garageThumb}>
        <Text style={styles.garageThumbText}>{initial}</Text>
      </View>
      <View style={styles.flex}>
        <Text style={styles.garageName} numberOfLines={1}>{garage.name}</Text>
        <View style={styles.garageMetaRow}>
          <Text style={styles.ratingChip}>★ {garage.rating.toFixed(1)}</Text>
          <Text style={styles.muted}>({garage.totalReviews} reviews)</Text>
        </View>
        <Text style={styles.garageSub}>
          <Text style={styles.dotBlue}>● </Text>
          {garage.totalReviews} services
          <Text style={styles.dotGreen}>   ● </Text>
          <Text style={styles.openText}>Open Now</Text>
        </Text>
      </View>
      <View style={styles.garageActions}>
        <View style={styles.roundBtnBlue}><Text style={styles.roundBtnBlueIcon}>➤</Text></View>
        <View style={styles.roundBtnGreen}><Text style={styles.roundBtnGreenIcon}>✆</Text></View>
      </View>
    </View>
  );
}

function NotificationCard({ title, body, channel }: { title: string; body: string; channel: string }) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.muted}>{body}</Text>
      <Text style={styles.infoLine}>Delivery: {channel}</Text>
    </View>
  );
}

function ServiceCard({
  record,
  reviewRating,
  onReview,
  onReport
}: {
  record: GarageServiceRecord;
  reviewRating?: number;
  onReview(record: GarageServiceRecord): void;
  onReport(record: GarageServiceRecord): void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{record.garageName}</Text>
          <Text style={styles.muted}>{record.description}</Text>
          <Text style={styles.muted}>{record.vehicleNumber || record.vehicleInfo}</Text>
        </View>
        <Text style={styles.amount}>{money(record.amount)}</Text>
      </View>
      <View style={styles.badgeRow}>
        <Text style={record.isReliable ? styles.greenBadge : styles.amberBadge}>
          {record.isReliable ? "QR verified" : "Cash unverified"}
        </Text>
        <Text style={styles.badge}>{record.invoiceNumber ?? "Invoice pending"}</Text>
      </View>
      <Text style={styles.infoLine}>
        Date {formatDate(record.createdAt)} | Platform fee {money(record.platformFee)}
      </Text>
      <View style={styles.inlineActions}>
        <PrimaryButton
          label={reviewRating ? `Review ${reviewRating}/5` : "Rate service"}
          onPress={() => onReview(record)}
          variant="outline"
        />
        <PrimaryButton label="Report issue" onPress={() => onReport(record)} variant="danger" />
      </View>
    </View>
  );
}

function buildProfileForm(state: CustomerWorkspaceState | null): CustomerProfileInput {
  return {
    name: state?.profile.name ?? "",
    vehicleMake: state?.profile.vehicleMake ?? "",
    vehicleModel: state?.profile.vehicleModel ?? "",
    vehicleYear: state?.profile.vehicleYear ?? "",
    vehicleNumber: state?.profile.vehicleNumber ?? ""
  };
}

export function CustomerWorkspace({ profile }: { profile: AuthProfile }) {
  const { signOut } = useAuth();
  const [state, setState] = useState<CustomerWorkspaceState | null>(null);
  const [activeTab, setActiveTab] = useState<CustomerTab>("home");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [profileForm, setProfileForm] = useState<CustomerProfileInput>(buildProfileForm(null));
  const [reviewRecord, setReviewRecord] = useState<GarageServiceRecord | null>(null);
  const [reviewRating, setReviewRating] = useState("5");
  const [reviewComment, setReviewComment] = useState("");
  const [reportRecord, setReportRecord] = useState<GarageServiceRecord | null>(null);
  const [reportReason, setReportReason] = useState<CustomerReportInput["reason"]>("fraud");
  const [reportDescription, setReportDescription] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");

  async function refresh() {
    setError("");
    try {
      const nextState = await getCustomerWorkspace(profile);
      setState(nextState);
      setProfileForm(buildProfileForm(nextState));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customer workspace.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const filteredGarages = useMemo(() => {
    const query = search.trim().toLowerCase();
    const garages = state?.garages ?? [];
    if (!query) return garages;
    return garages.filter(
      (garage) => garage.name.toLowerCase().includes(query) || garage.address.toLowerCase().includes(query)
    );
  }, [search, state]);

  function setProfileField<Key extends keyof CustomerProfileInput>(key: Key, value: CustomerProfileInput[Key]) {
    setProfileForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSaveProfile() {
    if (!profileForm.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!profileForm.vehicleNumber.trim()) {
      setError("Vehicle number is required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await saveCustomerProfile(profile, profileForm);
      await refresh();
      Alert.alert("Saved", "Customer profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveReview() {
    if (!reviewRecord) return;
    const rating = Number(reviewRating);
    setSaving(true);
    setError("");
    try {
      await saveCustomerReview(profile, {
        garageId: reviewRecord.garageId,
        rating,
        comment: reviewComment
      });
      setReviewRecord(null);
      setReviewComment("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save review.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitReport() {
    if (!reportRecord) return;
    setSaving(true);
    setError("");
    try {
      await submitCustomerReport(profile, {
        garageId: reportRecord.garageId,
        serviceRecordId: reportRecord.id,
        reason: reportReason,
        description: reportDescription,
        evidenceNote
      });
      setReportRecord(null);
      setReportDescription("");
      setEvidenceNote("");
      setActiveTab("reports");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit report.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !state) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#2563eb" size="large" />
        <Text style={styles.loadingText}>Loading customer workspace</Text>
      </View>
    );
  }

  const reviewForRecord = (record: GarageServiceRecord) =>
    state?.reviews.find((review) => review.garageId === record.garageId);

  return (
    <View style={styles.shell}>
      <ScrollView style={{ backgroundColor: "#F8FAFC" }} contentContainerStyle={styles.container}>
        <View style={styles.header}>
          {activeTab === "home" ? (
            <>
              <Text style={styles.bigTitle}>Find a Mechanic</Text>
              <Text style={styles.locationLine}>➤ Pune City Center</Text>
            </>
          ) : (
            <>
              <Text style={styles.kicker}>Customer</Text>
              <Text style={styles.title}>
                {activeTab === "activity"
                  ? "Activity"
                  : activeTab === "profile"
                    ? "My Profile"
                    : activeTab === "reports"
                      ? "Reports"
                      : "Support"}
              </Text>
            </>
          )}
        </View>

        <View style={styles.tabs}>
          <TabButton active={activeTab === "home"} label="Home" onPress={() => setActiveTab("home")} />
          <TabButton active={activeTab === "activity"} label="Activity" onPress={() => setActiveTab("activity")} />
          <TabButton active={activeTab === "profile"} label="Profile" onPress={() => setActiveTab("profile")} />
          <TabButton active={activeTab === "reports"} label="Reports" onPress={() => setActiveTab("reports")} />
          <TabButton active={activeTab === "support"} label="Support" onPress={() => setActiveTab("support")} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {activeTab === "home" ? (
          <>
            {state?.notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                title={notification.title}
                body={notification.body}
                channel={notification.channel}
              />
            ))}

            {state?.pendingOtpRecords.map((record) => (
              <View key={record.id} style={styles.warningCard}>
                <Text style={styles.cardTitle}>OTP sent for service record</Text>
                <Text style={styles.muted}>
                  {record.garageName} created a service record. Read OTP from message and tell it to garage.
                </Text>
                <Text style={styles.infoLine}>No in-app approve/reject action.</Text>
              </View>
            ))}

            <View style={styles.searchRow}>
              <TextInput
                onChangeText={setSearch}
                placeholder="Search mechanics or garages"
                placeholderTextColor="#94a3b8"
                style={styles.searchInput}
                value={search}
              />
              <View style={styles.filterButton}>
                <Text style={styles.filterIcon}>⚙</Text>
              </View>
            </View>

            <View style={styles.mapCard}>
              <Text style={styles.mapPlaceholderText}>🗺  Map view</Text>
              <Text style={styles.mapPlaceholderSub}>Nearby garages appear here</Text>
            </View>

            <View style={styles.nearbyHeader}>
              <Text style={styles.nearbyTitle}>Nearby Garages</Text>
              <Text style={styles.nearbyCount}>{filteredGarages.length} found</Text>
            </View>

            {filteredGarages.map((garage) => (
              <GarageCard key={garage.id} garage={garage} />
            ))}
          </>
        ) : null}

        {activeTab === "activity" ? (
          <>
            {(state?.serviceHistory.length ?? 0) === 0 ? (
              <Text style={styles.empty}>No completed service history yet.</Text>
            ) : (
              state?.serviceHistory.map((record) => (
                <ServiceCard
                  key={record.id}
                  record={record}
                  reviewRating={reviewForRecord(record)?.rating}
                  onReview={(selected) => {
                    const existing = reviewForRecord(selected);
                    setReviewRecord(selected);
                    setReviewRating(String(existing?.rating ?? 5));
                    setReviewComment(existing?.comment ?? "");
                  }}
                  onReport={(selected) => {
                    setReportRecord(selected);
                    setReportReason("fraud");
                    setReportDescription("");
                    setEvidenceNote("");
                  }}
                />
              ))
            )}
          </>
        ) : null}

        {activeTab === "profile" ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Customer Profile</Text>
            <Text style={styles.muted}>Phone {state?.profile.phoneNumber}</Text>
            <LabeledInput label="Name" value={profileForm.name} onChangeText={(value) => setProfileField("name", value)} />
            <LabeledInput
              label="Vehicle make"
              value={profileForm.vehicleMake}
              onChangeText={(value) => setProfileField("vehicleMake", value)}
            />
            <LabeledInput
              label="Vehicle model"
              value={profileForm.vehicleModel}
              onChangeText={(value) => setProfileField("vehicleModel", value)}
            />
            <LabeledInput
              label="Vehicle year"
              value={profileForm.vehicleYear}
              onChangeText={(value) => setProfileField("vehicleYear", value)}
              keyboardType="numeric"
            />
            <LabeledInput
              label="Vehicle number"
              value={profileForm.vehicleNumber}
              onChangeText={(value) => setProfileField("vehicleNumber", value.toUpperCase())}
            />
            <PrimaryButton label={saving ? "Saving..." : "Save profile"} onPress={handleSaveProfile} disabled={saving} />
          </View>
        ) : null}

        {activeTab === "reports" ? (
          <>
            {(state?.reports.length ?? 0) === 0 ? (
              <Text style={styles.empty}>No reports submitted.</Text>
            ) : (
              state?.reports.map((report) => (
                <View key={report.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{report.garageName}</Text>
                  <Text style={styles.muted}>{report.reason} | {report.status}</Text>
                  <Text style={styles.infoLine}>{report.description}</Text>
                  {report.evidenceNote ? <Text style={styles.infoLine}>Evidence: {report.evidenceNote}</Text> : null}
                </View>
              ))
            )}
          </>
        ) : null}

        {activeTab === "support" ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Support</Text>
            <Text style={styles.muted}>Need help with service, invoice, payment, or report?</Text>
            <PrimaryButton label="Call support" onPress={() => Linking.openURL("tel:+918070604004")} />
            <PrimaryButton
              label="Email support"
              onPress={() => Linking.openURL("mailto:knowyourmechanic@gmail.com")}
              variant="outline"
            />
            <View style={styles.faqBox}>
              <Text style={styles.cardTitle}>Verified vs Cash</Text>
              <Text style={styles.muted}>QR payment is verified. Cash is unverified and has no platform fee.</Text>
            </View>
            <View style={styles.faqBox}>
              <Text style={styles.cardTitle}>OTP flow</Text>
              <Text style={styles.muted}>Garage creates record. You receive OTP. Tell OTP to garage.</Text>
            </View>
          </View>
        ) : null}

        {reviewRecord ? (
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>Rate {reviewRecord.garageName}</Text>
            <LabeledInput label="Rating 1-5" value={reviewRating} onChangeText={setReviewRating} keyboardType="numeric" />
            <LabeledInput label="Comment" value={reviewComment} onChangeText={setReviewComment} multiline />
            <PrimaryButton label={saving ? "Saving..." : "Save review"} onPress={handleSaveReview} disabled={saving} />
            <PrimaryButton label="Cancel" onPress={() => setReviewRecord(null)} variant="outline" />
          </View>
        ) : null}

        {reportRecord ? (
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>Report {reportRecord.garageName}</Text>
            <View style={styles.reasonGrid}>
              {reportReasons.map((reason) => (
                <Pressable
                  key={reason.value}
                  onPress={() => setReportReason(reason.value)}
                  style={[styles.reasonButton, reportReason === reason.value ? styles.reasonButtonActive : null]}
                >
                  <Text style={[styles.reasonText, reportReason === reason.value ? styles.reasonTextActive : null]}>
                    {reason.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <LabeledInput label="Description" value={reportDescription} onChangeText={setReportDescription} multiline />
            <LabeledInput
              label="Evidence note / file reference"
              value={evidenceNote}
              onChangeText={setEvidenceNote}
              multiline
            />
            <PrimaryButton label={saving ? "Submitting..." : "Submit report"} onPress={handleSubmitReport} disabled={saving} variant="danger" />
            <PrimaryButton label="Cancel" onPress={() => setReportRecord(null)} variant="outline" />
          </View>
        ) : null}

        <PrimaryButton
          label="Logout"
          onPress={() => {
            Alert.alert("Logout", "Leave customer workspace?", [
              { text: "Cancel", style: "cancel" },
              { text: "Logout", style: "destructive", onPress: signOut }
            ]);
          }}
          variant="dark"
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#f8fafc"
  },
  container: {
    padding: 18,
    paddingBottom: 34
  },
  center: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 20
  },
  loadingText: {
    color: "#64748b",
    marginTop: 10
  },
  header: {
    marginBottom: 16
  },
  kicker: {
    color: "#2563eb",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  title: {
    color: "#0f172a",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 4
  },
  subtitle: {
    color: "#64748b",
    fontSize: 15,
    lineHeight: 21,
    marginTop: 6
  },
  tabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14
  },
  tab: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(15, 23, 42, 0.05)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9
  },
  activeTab: {
    backgroundColor: "#0A58CA",
    borderColor: "#2563eb"
  },
  tabText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "900"
  },
  activeTabText: {
    color: "#ffffff"
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(15, 23, 42, 0.05)",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    padding: 15
  },
  infoCard: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    padding: 15
  },
  warningCard: {
    backgroundColor: "#fff7ed",
    borderColor: "#fed7aa",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    padding: 15
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderColor: "#94a3b8",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    padding: 15
  },
  rowBetween: {
    flexDirection: "row",
    gap: 10
  },
  flex: {
    flex: 1
  },
  cardTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900"
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8
  },
  muted: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4
  },
  amount: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900"
  },
  rating: {
    backgroundColor: "#fef3c7",
    borderRadius: 16,
    color: "#92400e",
    fontSize: 16,
    fontWeight: "900",
    minWidth: 44,
    padding: 8,
    textAlign: "center"
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10
  },
  badge: {
    backgroundColor: "#eff6ff",
    borderRadius: 999,
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  greenBadge: {
    backgroundColor: "#ecfdf5",
    borderRadius: 999,
    color: "#047857",
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  amberBadge: {
    backgroundColor: "#fff7ed",
    borderRadius: 999,
    color: "#c2410c",
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  infoLine: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 9
  },
  inlineActions: {
    gap: 8,
    marginTop: 10
  },
  bigTitle: {
    color: "#0F172A",
    fontSize: 34,
    fontWeight: "900"
  },
  locationLine: {
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14
  },
  searchInput: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(15, 23, 42, 0.05)",
    borderRadius: 16,
    borderWidth: 1,
    color: "#0f172a",
    flex: 1,
    fontSize: 16,
    minHeight: 56,
    paddingHorizontal: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10
  },
  filterButton: {
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
    width: 56
  },
  filterIcon: {
    color: "#FFFFFF",
    fontSize: 22
  },
  mapCard: {
    alignItems: "center",
    backgroundColor: "#E8EEF7",
    borderRadius: 20,
    height: 180,
    justifyContent: "center",
    marginBottom: 18
  },
  mapPlaceholderText: {
    color: "#475569",
    fontSize: 17,
    fontWeight: "800"
  },
  mapPlaceholderSub: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 4
  },
  nearbyHeader: {
    alignItems: "baseline",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },
  nearbyTitle: {
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "900"
  },
  nearbyCount: {
    color: "#94A3B8",
    fontSize: 15,
    fontWeight: "600"
  },
  garageCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(15, 23, 42, 0.05)",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    padding: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14
  },
  garageThumb: {
    alignItems: "center",
    backgroundColor: "#EFF3FF",
    borderRadius: 16,
    height: 64,
    justifyContent: "center",
    width: 64
  },
  garageThumbText: {
    color: "#2563EB",
    fontSize: 26,
    fontWeight: "900"
  },
  garageName: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "800"
  },
  garageMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 4
  },
  ratingChip: {
    backgroundColor: "#FFF7E6",
    borderRadius: 999,
    color: "#D97706",
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  garageSub: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 6
  },
  dotBlue: { color: "#2563EB" },
  dotGreen: { color: "#22C55E" },
  openText: { color: "#16A34A", fontWeight: "700" },
  garageActions: {
    flexDirection: "row",
    gap: 8
  },
  roundBtnBlue: {
    alignItems: "center",
    backgroundColor: "#EFF3FF",
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  roundBtnBlueIcon: { color: "#2563EB", fontSize: 18 },
  roundBtnGreen: {
    alignItems: "center",
    backgroundColor: "#E9F9EF",
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  roundBtnGreenIcon: { color: "#16A34A", fontSize: 18 },
  field: {
    marginTop: 10
  },
  label: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 6
  },
  input: {
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
    borderRadius: 16,
    borderWidth: 1,
    color: "#0f172a",
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  textArea: {
    minHeight: 82,
    textAlignVertical: "top"
  },
  button: {
    alignItems: "center",
    backgroundColor: "#0A58CA",
    borderRadius: 16,
    justifyContent: "center",
    marginTop: 10,
    minHeight: 48,
    paddingHorizontal: 12
  },
  darkButton: {
    backgroundColor: "#0f172a"
  },
  outlineButton: {
    backgroundColor: "#ffffff",
    borderColor: "#2563eb",
    borderWidth: 1
  },
  dangerButton: {
    backgroundColor: "#dc2626"
  },
  disabledButton: {
    opacity: 0.6
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900"
  },
  outlineButtonText: {
    color: "#2563eb"
  },
  reasonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8
  },
  reasonButton: {
    borderColor: "#cbd5e1",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  reasonButtonActive: {
    backgroundColor: "#fee2e2",
    borderColor: "#dc2626"
  },
  reasonText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "800"
  },
  reasonTextActive: {
    color: "#b91c1c"
  },
  error: {
    backgroundColor: "#fef2f2",
    borderRadius: 16,
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 12,
    padding: 12
  },
  empty: {
    color: "#64748b",
    fontSize: 15,
    marginBottom: 16
  },
  faqBox: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    padding: 12
  }
});
