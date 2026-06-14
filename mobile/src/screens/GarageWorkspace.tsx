import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";

import { useAuth } from "../auth/AuthContext";
import type { AuthProfile } from "../auth/authTypes";
import {
  completeGaragePayment,
  createGarageServiceRecord,
  getGarageDashboard,
  saveGarageOnboarding,
  saveGarageProfile,
  verifyGarageServiceOtp
} from "../garage/garageRepository";
import type {
  CreateServiceRecordInput,
  GarageDashboardState,
  GarageOnboardingInput,
  GaragePaymentMethod,
  GarageProfile,
  GarageServiceRecord
} from "../garage/garageTypes";

type ViewMode = "dashboard" | "onboarding" | "settings" | "addService" | "otp" | "payment";

const defaultWorkingDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function money(value: number) {
  return `Rs ${value.toFixed(2)}`;
}

function required(value: string) {
  return value.trim().length > 0;
}

function phoneValid(value: string) {
  return value.replace(/\D/g, "").slice(-10).length === 10;
}

function statusLabel(record: GarageServiceRecord) {
  if (record.status === "pending_otp") return "Waiting for OTP";
  if (record.status === "otp_verified") return "OTP verified";
  return record.isReliable ? "Completed verified" : "Completed unverified";
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
    </View>
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
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
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

function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = "primary"
}: {
  label: string;
  onPress(): void;
  disabled?: boolean;
  variant?: "primary" | "dark" | "outline";
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        variant === "dark" ? styles.darkButton : null,
        variant === "outline" ? styles.outlineButton : null,
        disabled ? styles.disabledButton : null
      ]}
    >
      <Text style={[styles.buttonText, variant === "outline" ? styles.outlineButtonText : null]}>{label}</Text>
    </Pressable>
  );
}

function ServiceRecordCard({
  record,
  onVerify,
  onComplete
}: {
  record: GarageServiceRecord;
  onVerify(record: GarageServiceRecord): void;
  onComplete(record: GarageServiceRecord): void;
}) {
  return (
    <View style={styles.recordCard}>
      <View style={styles.recordTop}>
        <View style={styles.flex}>
          <Text style={styles.recordTitle}>{record.description}</Text>
          <Text style={styles.recordMeta}>{record.customerPhone} | {record.vehicleNumber || "No vehicle number"}</Text>
        </View>
        <Text style={styles.amount}>{money(record.amount)}</Text>
      </View>

      <View style={styles.badgeRow}>
        <Text style={styles.badge}>{statusLabel(record)}</Text>
        <Text style={styles.badge}>{record.verificationMethod === "in_app" ? "App customer" : "WhatsApp fallback"}</Text>
      </View>

      {record.invoiceNumber ? (
        <Text style={styles.invoiceLine}>
          Invoice {record.invoiceNumber} | {record.invoiceDeliveryChannel} | {record.invoiceNotificationStatus}
        </Text>
      ) : null}

      {record.status === "pending_otp" ? (
        <PrimaryButton label="Enter customer OTP" onPress={() => onVerify(record)} variant="outline" />
      ) : null}

      {record.status === "otp_verified" ? (
        <PrimaryButton label="Complete payment" onPress={() => onComplete(record)} variant="outline" />
      ) : null}
    </View>
  );
}

function buildOnboardingInput(garage: GarageProfile | null): GarageOnboardingInput {
  return {
    name: garage?.name ?? "",
    email: garage?.email ?? "",
    phone: garage?.phone ?? "",
    address: garage?.address ?? "",
    serviceHours: garage?.serviceHours ?? "09:00 - 20:00",
    workingDays: garage?.workingDays ?? defaultWorkingDays,
    businessType: garage?.businessType ?? "individual",
    legalBusinessName: garage?.legalBusinessName ?? garage?.name ?? "",
    bankAccountHolderName: garage?.bankAccountHolderName ?? "",
    bankName: garage?.bankName ?? "",
    bankIfscCode: garage?.bankIfscCode ?? "",
    bankAccountNumber: garage?.bankAccountNumber ?? ""
  };
}

export function GarageWorkspace({ profile }: { profile: AuthProfile }) {
  const { signOut } = useAuth();
  const [state, setState] = useState<GarageDashboardState | null>(null);
  const [mode, setMode] = useState<ViewMode>("dashboard");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [onboardingForm, setOnboardingForm] = useState<GarageOnboardingInput>(buildOnboardingInput(null));
  const [serviceForm, setServiceForm] = useState<CreateServiceRecordInput>({
    customerPhone: "",
    customerHasApp: true,
    vehicleNumber: "",
    vehicleInfo: "",
    description: "",
    amount: 0
  });
  const [activeRecord, setActiveRecord] = useState<GarageServiceRecord | null>(null);
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [lastPaymentSummary, setLastPaymentSummary] = useState("");

  async function refresh(nextMode?: ViewMode) {
    setLoading(true);
    setError("");
    try {
      const dashboard = await getGarageDashboard(profile);
      setState(dashboard);
      setOnboardingForm(buildOnboardingInput(dashboard.garage));
      if (nextMode) {
        setMode(nextMode);
      } else if (!dashboard.garage || dashboard.garage.onboardingStatus !== "completed") {
        setMode("onboarding");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load garage.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const stats = useMemo(() => {
    const records = state?.serviceRecords ?? [];
    return {
      pending: records.filter((record) => record.status === "pending_otp").length,
      completed: records.filter((record) => record.status === "completed").length,
      verified: records.filter((record) => record.status === "completed" && record.isReliable).length,
      totalAmount: records
        .filter((record) => record.status === "completed")
        .reduce((sum, record) => sum + record.amount, 0)
    };
  }, [state]);

  function setOnboardingField<Key extends keyof GarageOnboardingInput>(key: Key, value: GarageOnboardingInput[Key]) {
    setOnboardingForm((current) => ({ ...current, [key]: value }));
  }

  function setServiceField<Key extends keyof CreateServiceRecordInput>(key: Key, value: CreateServiceRecordInput[Key]) {
    setServiceForm((current) => ({ ...current, [key]: value }));
  }

  function validateOnboarding() {
    if (!required(onboardingForm.name) || onboardingForm.name.trim().length < 3) return "Garage name must be at least 3 characters.";
    if (!required(onboardingForm.email) || !onboardingForm.email.includes("@")) return "Valid email is required.";
    if (!phoneValid(onboardingForm.phone)) return "Valid 10 digit phone is required.";
    if (!required(onboardingForm.address)) return "Garage address is required.";
    if (!required(onboardingForm.bankAccountHolderName)) return "Bank account holder name is required.";
    if (!required(onboardingForm.bankIfscCode) || onboardingForm.bankIfscCode.trim().length !== 11) return "Valid IFSC is required.";
    if (!required(onboardingForm.bankAccountNumber) || onboardingForm.bankAccountNumber.trim().length < 9) return "Valid bank account number is required.";
    return "";
  }

  function validateService() {
    if (!phoneValid(serviceForm.customerPhone)) return "Valid customer phone is required.";
    if (!required(serviceForm.vehicleNumber) && !required(serviceForm.vehicleInfo)) return "Vehicle number or vehicle info is required.";
    if (!required(serviceForm.description)) return "Service description is required.";
    if (!serviceForm.amount || serviceForm.amount < 1) return "Amount must be at least Rs 1.";
    return "";
  }

  async function handleSaveOnboarding() {
    const validationError = validateOnboarding();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (mode === "settings") {
        await saveGarageProfile(profile, {
          name: onboardingForm.name,
          email: onboardingForm.email,
          phone: onboardingForm.phone,
          address: onboardingForm.address,
          serviceHours: onboardingForm.serviceHours,
          workingDays: onboardingForm.workingDays,
          businessType: onboardingForm.businessType,
          legalBusinessName: onboardingForm.legalBusinessName
        });
      } else {
        await saveGarageOnboarding(profile, onboardingForm);
      }
      await refresh("dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save garage.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateService() {
    const validationError = validateService();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const result = await createGarageServiceRecord(profile, serviceForm);
      setActiveRecord(result.record);
      setDevOtp(result.otp);
      setOtp("");
      await refresh("otp");
      setServiceForm({
        customerPhone: "",
        customerHasApp: true,
        vehicleNumber: "",
        vehicleInfo: "",
        description: "",
        amount: 0
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create service record.");
    } finally {
      setSaving(false);
    }
  }

  async function handleVerifyOtp() {
    if (!activeRecord) return;
    if (otp.trim().length !== 6) {
      setError("Enter 6 digit OTP shared by customer.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const verified = await verifyGarageServiceOtp(profile, activeRecord.id, otp);
      setActiveRecord(verified);
      setDevOtp("");
      await refresh("payment");
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePayment(paymentMethod: GaragePaymentMethod) {
    if (!activeRecord) return;

    setSaving(true);
    setError("");
    try {
      const result = await completeGaragePayment(profile, activeRecord.id, paymentMethod);
      setActiveRecord(result.record);
      setLastPaymentSummary(
        `${paymentMethod === "qr" ? "QR verified" : "Cash unverified"} | Customer pays ${money(
          result.paymentSummary.customerPays
        )} | Platform fee ${money(result.paymentSummary.platformFee)}`
      );
      await refresh("dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment completion failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !state) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#2563eb" size="large" />
        <Text style={styles.loadingText}>Loading garage workspace</Text>
      </View>
    );
  }

  const garage = state?.garage;
  const records = state?.serviceRecords ?? [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Garage Owner</Text>
        <Text style={styles.title}>{garage?.name ?? "Garage onboarding"}</Text>
        <Text style={styles.subtitle}>Garage-first service records. No booking flow.</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {lastPaymentSummary ? <Text style={styles.success}>{lastPaymentSummary}</Text> : null}

      {mode === "dashboard" && garage ? (
        <>
          <View style={styles.heroCard}>
            <View style={styles.recordTop}>
              <View style={styles.flex}>
                <Text style={styles.heroTitle}>{garage.name}</Text>
                <Text style={styles.recordMeta}>{garage.address}</Text>
                <Text style={styles.recordMeta}>{garage.serviceHours} | {garage.workingDays.join(", ")}</Text>
              </View>
              <Text style={styles.rating}>{garage.rating.toFixed(1)}</Text>
            </View>
            <View style={styles.badgeRow}>
              <Text style={styles.badge}>{garage.isVerified ? "Verified garage" : "Pending verification"}</Text>
              <Text style={styles.badge}>{garage.onboardingStatus}</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <StatBox label="Pending OTP" value={String(stats.pending)} />
            <StatBox label="Completed" value={String(stats.completed)} />
            <StatBox label="Verified QR" value={String(stats.verified)} />
            <StatBox label="Service value" value={money(stats.totalAmount)} />
          </View>

          <View style={styles.actionRow}>
            <PrimaryButton label="Add Service" onPress={() => setMode("addService")} />
            <PrimaryButton label="Settings" onPress={() => setMode("settings")} variant="outline" />
          </View>

          <SectionTitle title="Service Records" hint="Invoice appears here after payment completion." />
          {records.length === 0 ? (
            <Text style={styles.empty}>No service records yet.</Text>
          ) : (
            records.map((record) => (
              <ServiceRecordCard
                key={record.id}
                record={record}
                onVerify={(selected) => {
                  setActiveRecord(selected);
                  setOtp("");
                  setDevOtp("");
                  setMode("otp");
                }}
                onComplete={(selected) => {
                  setActiveRecord(selected);
                  setMode("payment");
                }}
              />
            ))
          )}
        </>
      ) : null}

      {(mode === "onboarding" || mode === "settings") ? (
        <View style={styles.panel}>
          <SectionTitle
            title={mode === "settings" ? "Garage Settings" : "Garage Onboarding"}
            hint="Preserves old business, bank, timings, and profile logic."
          />
          <LabeledInput label="Garage name" value={onboardingForm.name} onChangeText={(value) => setOnboardingField("name", value)} />
          <LabeledInput label="Email" value={onboardingForm.email} onChangeText={(value) => setOnboardingField("email", value)} keyboardType="email-address" />
          <LabeledInput label="Phone" value={onboardingForm.phone} onChangeText={(value) => setOnboardingField("phone", value)} keyboardType="phone-pad" />
          <LabeledInput label="Address" value={onboardingForm.address} onChangeText={(value) => setOnboardingField("address", value)} multiline />
          <LabeledInput label="Service hours" value={onboardingForm.serviceHours} onChangeText={(value) => setOnboardingField("serviceHours", value)} />
          <LabeledInput label="Working days" value={onboardingForm.workingDays.join(", ")} onChangeText={(value) => setOnboardingField("workingDays", value.split(",").map((day) => day.trim()).filter(Boolean))} />
          <LabeledInput label="Business type" value={onboardingForm.businessType} onChangeText={(value) => setOnboardingField("businessType", value as GarageProfile["businessType"])} />
          <LabeledInput label="Legal business name" value={onboardingForm.legalBusinessName} onChangeText={(value) => setOnboardingField("legalBusinessName", value)} />
          {mode === "onboarding" ? (
            <>
              <LabeledInput label="Bank account holder" value={onboardingForm.bankAccountHolderName} onChangeText={(value) => setOnboardingField("bankAccountHolderName", value)} />
              <LabeledInput label="Bank name" value={onboardingForm.bankName} onChangeText={(value) => setOnboardingField("bankName", value)} />
              <LabeledInput label="IFSC" value={onboardingForm.bankIfscCode} onChangeText={(value) => setOnboardingField("bankIfscCode", value.toUpperCase())} />
              <LabeledInput label="Account number" value={onboardingForm.bankAccountNumber} onChangeText={(value) => setOnboardingField("bankAccountNumber", value)} keyboardType="numeric" />
            </>
          ) : null}
          <PrimaryButton label={saving ? "Saving..." : "Save garage"} onPress={handleSaveOnboarding} disabled={saving} />
          {mode === "settings" ? <PrimaryButton label="Back" onPress={() => setMode("dashboard")} variant="outline" /> : null}
        </View>
      ) : null}

      {mode === "addService" ? (
        <View style={styles.panel}>
          <SectionTitle title="Add Service Record" hint="Garage creates the record using customer mobile number." />
          <LabeledInput label="Customer phone" value={serviceForm.customerPhone} onChangeText={(value) => setServiceField("customerPhone", value)} keyboardType="phone-pad" />
          <LabeledInput label="Vehicle number" value={serviceForm.vehicleNumber} onChangeText={(value) => setServiceField("vehicleNumber", value)} />
          <LabeledInput label="Vehicle info" value={serviceForm.vehicleInfo} onChangeText={(value) => setServiceField("vehicleInfo", value)} />
          <LabeledInput label="Service description" value={serviceForm.description} onChangeText={(value) => setServiceField("description", value)} multiline />
          <LabeledInput
            label="Total amount"
            value={serviceForm.amount ? String(serviceForm.amount) : ""}
            onChangeText={(value) => setServiceField("amount", Number(value.replace(/[^0-9.]/g, "")))}
            keyboardType="numeric"
          />
          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <Text style={styles.label}>Customer has app installed</Text>
              <Text style={styles.sectionHint}>On = push/in-app OTP. Off = WhatsApp fallback.</Text>
            </View>
            <Switch value={serviceForm.customerHasApp} onValueChange={(value) => setServiceField("customerHasApp", value)} />
          </View>
          <PrimaryButton label={saving ? "Creating..." : "Create record and send OTP"} onPress={handleCreateService} disabled={saving} />
          <PrimaryButton label="Back" onPress={() => setMode("dashboard")} variant="outline" />
        </View>
      ) : null}

      {mode === "otp" && activeRecord ? (
        <View style={styles.panel}>
          <SectionTitle title="Customer OTP Verification" hint="Customer shares OTP with garage. Garage cannot bypass this." />
          <Text style={styles.recordTitle}>{activeRecord.description}</Text>
          <Text style={styles.recordMeta}>Customer {activeRecord.customerPhone} | Amount {money(activeRecord.amount)}</Text>
          <Text style={styles.delivery}>
            Delivery: {activeRecord.verificationMethod === "in_app" ? "push/in-app approval" : "WhatsApp fallback"}
          </Text>
          {devOtp ? <Text style={styles.devOtp}>Dev OTP: {devOtp}</Text> : null}
          <LabeledInput label="OTP from customer" value={otp} onChangeText={setOtp} keyboardType="numeric" />
          <PrimaryButton label={saving ? "Verifying..." : "Verify OTP"} onPress={handleVerifyOtp} disabled={saving} />
          <PrimaryButton label="Back" onPress={() => setMode("dashboard")} variant="outline" />
        </View>
      ) : null}

      {mode === "payment" && activeRecord ? (
        <View style={styles.panel}>
          <SectionTitle title="Complete Payment" hint="QR is verified and charged platform fee. Cash is unverified with no platform fee." />
          <Text style={styles.recordTitle}>{activeRecord.description}</Text>
          <Text style={styles.recordMeta}>Base amount {money(activeRecord.amount)}</Text>
          <View style={styles.paymentBox}>
            <Text style={styles.paymentTitle}>QR payment</Text>
            <Text style={styles.recordMeta}>Verified transaction. Platform fee {money(PLATFORM_FEE)} applies.</Text>
            <PrimaryButton label="Complete with QR" onPress={() => handlePayment("qr")} disabled={saving} />
          </View>
          <View style={styles.paymentBox}>
            <Text style={styles.paymentTitle}>Cash payment</Text>
            <Text style={styles.recordMeta}>Unverified transaction. No platform fee.</Text>
            <PrimaryButton label="Complete with Cash" onPress={() => handlePayment("cash")} disabled={saving} variant="dark" />
          </View>
          <PrimaryButton label="Back" onPress={() => setMode("dashboard")} variant="outline" />
        </View>
      ) : null}

      <PrimaryButton
        label="Logout"
        onPress={() => {
          Alert.alert("Logout", "Leave garage workspace?", [
            { text: "Cancel", style: "cancel" },
            { text: "Logout", style: "destructive", onPress: signOut }
          ]);
        }}
        variant="dark"
      />
    </ScrollView>
  );
}

const PLATFORM_FEE = 1.9;

const styles = StyleSheet.create({
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
    fontSize: 15,
    marginTop: 10
  },
  header: {
    marginBottom: 18
  },
  kicker: {
    color: "#2563eb",
    fontSize: 13,
    fontWeight: "800",
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
    marginTop: 6
  },
  heroCard: {
    backgroundColor: "#ffffff",
    borderColor: "#dbe3ef",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16
  },
  heroTitle: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "900"
  },
  rating: {
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    color: "#92400e",
    fontSize: 18,
    fontWeight: "900",
    minWidth: 46,
    padding: 8,
    textAlign: "center"
  },
  statsGrid: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14
  },
  statBox: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    minWidth: "47%",
    padding: 14
  },
  statValue: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: "900"
  },
  statLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4
  },
  actionRow: {
    gap: 10,
    marginBottom: 18
  },
  panel: {
    backgroundColor: "#ffffff",
    borderColor: "#dbe3ef",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16
  },
  sectionHeader: {
    marginBottom: 12
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 19,
    fontWeight: "900"
  },
  sectionHint: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3
  },
  field: {
    marginBottom: 12
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
    borderRadius: 8,
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
    backgroundColor: "#2563eb",
    borderRadius: 8,
    justifyContent: "center",
    marginTop: 10,
    minHeight: 50,
    paddingHorizontal: 14
  },
  darkButton: {
    backgroundColor: "#0f172a"
  },
  outlineButton: {
    backgroundColor: "#ffffff",
    borderColor: "#2563eb",
    borderWidth: 1
  },
  disabledButton: {
    opacity: 0.6
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900"
  },
  outlineButtonText: {
    color: "#2563eb"
  },
  recordCard: {
    backgroundColor: "#ffffff",
    borderColor: "#dbe3ef",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14
  },
  recordTop: {
    flexDirection: "row",
    gap: 10
  },
  flex: {
    flex: 1
  },
  recordTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900"
  },
  recordMeta: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4
  },
  amount: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900"
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
  invoiceLine: {
    color: "#475569",
    fontSize: 12,
    marginTop: 10
  },
  empty: {
    color: "#64748b",
    fontSize: 15,
    marginBottom: 16
  },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 8
  },
  delivery: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    color: "#334155",
    fontSize: 13,
    fontWeight: "800",
    marginVertical: 12,
    padding: 10
  },
  devOtp: {
    backgroundColor: "#fff7ed",
    borderColor: "#fed7aa",
    borderRadius: 8,
    borderWidth: 1,
    color: "#9a3412",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 12,
    padding: 10
  },
  paymentBox: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 12
  },
  paymentTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900"
  },
  error: {
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 12,
    padding: 12
  },
  success: {
    backgroundColor: "#ecfdf5",
    borderRadius: 8,
    color: "#047857",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 12,
    padding: 12
  }
});
