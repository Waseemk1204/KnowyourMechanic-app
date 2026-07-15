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
import {
  fallbackServiceTaxonomy,
  loadServiceTaxonomy,
  vehicleTypeOptions
} from "../garage/serviceTaxonomy";
import { buttonShadow, cardShadow, colors, radii, sectionLabel } from "../ui/tokens";

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

function StatBox({
  label,
  value,
  icon,
  iconBg,
  iconFg
}: {
  label: string;
  value: string;
  icon?: string;
  iconBg?: string;
  iconFg?: string;
}) {
  return (
    <View style={styles.statBox}>
      {icon ? (
        <View style={[styles.statIcon, iconBg ? { backgroundColor: iconBg } : null]}>
          <Text style={[styles.statIconText, iconFg ? { color: iconFg } : null]}>{icon}</Text>
        </View>
      ) : null}
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
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

function ChipGroup({
  label,
  options,
  selectedCodes,
  onPress
}: {
  label: string;
  options: Array<{ code: string; label: string }>;
  selectedCodes: string[];
  onPress(option: { code: string; label: string }): void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chipGrid}>
        {options.map((option) => {
          const selected = selectedCodes.includes(option.code);
          return (
            <Pressable
              key={option.code}
              onPress={() => onPress(option)}
              style={[styles.choiceChip, selected ? styles.choiceChipSelected : null]}
            >
              <Text style={[styles.choiceChipText, selected ? styles.choiceChipTextSelected : null]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
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
  const vehicleTypeLabel =
    vehicleTypeOptions.find((option) => option.code === record.vehicleType)?.label ?? "Vehicle";
  const vehicleSummary = [record.vehicleMakeName, record.vehicleModelName].filter(Boolean).join(" ");
  const vehicleDetails = [
    record.modelYear ? `MY ${record.modelYear}` : null,
    record.odometerKm != null ? `${record.odometerKm.toLocaleString("en-IN")} km` : null
  ].filter(Boolean);

  return (
    <View style={styles.recordCard}>
      <View style={styles.recordTop}>
        <View style={styles.flex}>
          <Text style={styles.recordTitle}>{record.description}</Text>
          <Text style={styles.recordMeta}>{record.customerPhone} | {record.vehicleNumber || "No vehicle number"}</Text>
          <Text style={styles.recordVehicle}>
            {vehicleTypeLabel} · {vehicleSummary || "Unknown vehicle"}
            {vehicleDetails.length ? ` · ${vehicleDetails.join(" · ")}` : ""}
          </Text>
        </View>
        <Text style={styles.amount}>{money(record.amount)}</Text>
      </View>

      {record.serviceCategoryNames.length ? (
        <View style={styles.badgeRow}>
          {record.serviceCategoryNames.map((name) => (
            <Text key={`svc-${name}`} style={styles.chipService}>{name}</Text>
          ))}
        </View>
      ) : null}

      {record.failureCategoryNames.length ? (
        <View style={styles.badgeRow}>
          {record.failureCategoryNames.map((name) => (
            <Text key={`fail-${name}`} style={styles.chipFailure}>{name}</Text>
          ))}
        </View>
      ) : null}

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

function emptyServiceForm(): CreateServiceRecordInput {
  return {
    customerPhone: "",
    customerHasApp: true,
    vehicleNumber: "",
    vehicleType: null,
    vehicleMakeCode: null,
    vehicleModelCode: null,
    vehicleMakeOther: "",
    vehicleModelOther: "",
    vehicleMakeName: "",
    vehicleModelName: "",
    modelYear: null,
    odometerKm: null,
    serviceCategoryCodes: [],
    serviceCategoryNames: [],
    failureCategoryCodes: [],
    failureCategoryNames: [],
    serviceNotes: "",
    amount: 0
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
  const [serviceForm, setServiceForm] = useState<CreateServiceRecordInput>(emptyServiceForm);
  const [taxonomy, setTaxonomy] = useState(fallbackServiceTaxonomy);
  const [useOtherMake, setUseOtherMake] = useState(false);
  const [useOtherModel, setUseOtherModel] = useState(false);
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
    loadServiceTaxonomy().then(setTaxonomy);
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
    if (!serviceForm.vehicleType) return "Vehicle type is required.";
    if (serviceForm.vehicleType !== "other" && !required(serviceForm.vehicleNumber)) return "Vehicle number is required.";
    if (!required(useOtherMake ? serviceForm.vehicleMakeOther : serviceForm.vehicleMakeName)) return "Vehicle make is required.";
    if (!required(useOtherModel ? serviceForm.vehicleModelOther : serviceForm.vehicleModelName)) return "Vehicle model is required.";
    if (serviceForm.modelYear !== null && (serviceForm.modelYear < 1950 || serviceForm.modelYear > new Date().getFullYear() + 1)) return "Valid model year is required.";
    if (serviceForm.odometerKm !== null && (serviceForm.odometerKm < 0 || serviceForm.odometerKm > 5000000)) return "Valid odometer is required.";
    if (serviceForm.serviceCategoryCodes.length === 0) return "Select at least one service category.";
    if (serviceForm.failureCategoryCodes.length === 0) return "Select at least one failure category.";
    if (!serviceForm.amount || serviceForm.amount < 1) return "Amount must be at least Rs 1.";
    return "";
  }

  function selectVehicleType(code: string) {
    const vehicleType = vehicleTypeOptions.find((option) => option.code === code)?.code ?? null;
    setServiceForm((current) => ({
      ...current,
      vehicleType,
      vehicleMakeCode: null,
      vehicleModelCode: null,
      vehicleMakeOther: "",
      vehicleModelOther: "",
      vehicleMakeName: "",
      vehicleModelName: ""
    }));
    setUseOtherMake(vehicleType === "other");
    setUseOtherModel(vehicleType === "other");
  }

  function selectMake(option: { code: string; label: string }) {
    const other = option.code === "__other__";
    setUseOtherMake(other);
    setUseOtherModel(other);
    setServiceForm((current) => ({
      ...current,
      vehicleMakeCode: other ? null : option.code,
      vehicleMakeName: other ? "" : option.label,
      vehicleMakeOther: "",
      vehicleModelCode: null,
      vehicleModelName: "",
      vehicleModelOther: ""
    }));
  }

  function selectModel(option: { code: string; label: string }) {
    const other = option.code === "__other__";
    setUseOtherModel(other);
    setServiceForm((current) => ({
      ...current,
      vehicleModelCode: other ? null : option.code,
      vehicleModelName: other ? "" : option.label,
      vehicleModelOther: ""
    }));
  }

  function toggleServiceCategory(option: { code: string; label: string }) {
    setServiceForm((current) => {
      const selected = current.serviceCategoryCodes.includes(option.code);
      return {
        ...current,
        serviceCategoryCodes: selected
          ? current.serviceCategoryCodes.filter((code) => code !== option.code)
          : [...current.serviceCategoryCodes, option.code],
        serviceCategoryNames: selected
          ? current.serviceCategoryNames.filter((_, index) => current.serviceCategoryCodes[index] !== option.code)
          : [...current.serviceCategoryNames, option.label]
      };
    });
  }

  function toggleFailureCategory(option: { code: string; label: string }) {
    setServiceForm((current) => {
      const selected = current.failureCategoryCodes.includes(option.code);
      return {
        ...current,
        failureCategoryCodes: selected
          ? current.failureCategoryCodes.filter((code) => code !== option.code)
          : [...current.failureCategoryCodes, option.code],
        failureCategoryNames: selected
          ? current.failureCategoryNames.filter((_, index) => current.failureCategoryCodes[index] !== option.code)
          : [...current.failureCategoryNames, option.label]
      };
    });
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
      setServiceForm(emptyServiceForm());
      setUseOtherMake(false);
      setUseOtherModel(false);
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
  const availableMakes = serviceForm.vehicleType
    ? taxonomy.vehicleMakes.filter((make) => make.vehicleTypes.includes(serviceForm.vehicleType!))
    : [];
  const availableModels = serviceForm.vehicleType && serviceForm.vehicleMakeCode
    ? taxonomy.vehicleModels.filter(
        (model) => model.vehicleType === serviceForm.vehicleType && model.makeCode === serviceForm.vehicleMakeCode
      )
    : [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      {mode !== "dashboard" ? (
        <View style={styles.header}>
          <Text style={styles.kicker}>Garage Owner</Text>
          <Text style={styles.title}>{garage?.name ?? "Garage onboarding"}</Text>
          <Text style={styles.subtitle}>Garage-first service records. No booking flow.</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {lastPaymentSummary ? <Text style={styles.success}>{lastPaymentSummary}</Text> : null}

      {mode === "dashboard" && garage ? (
        <>
          <View style={styles.heroCard}>
            <View style={styles.heroGear}>
              <Text style={styles.heroGearIcon}>⚙️</Text>
            </View>
            <Text style={styles.heroTitle}>{garage.name}</Text>
            <Text style={styles.heroMeta}>{garage.address}</Text>
            <Text style={styles.heroMeta}>{garage.serviceHours}</Text>
            <View style={styles.heroPills}>
              <Text style={styles.heroPillOpen}>
                ● {garage.isVerified ? "Verified" : "Pending"}
              </Text>
              <Text style={styles.heroPillRating}>★ {garage.rating.toFixed(1)}</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <StatBox label="Pending OTP" value={String(stats.pending)} icon="⏳" iconBg="#FEF3C7" iconFg="#B45309" />
            <StatBox label="Completed" value={String(stats.completed)} icon="✅" iconBg={colors.green50} iconFg={colors.green700} />
            <StatBox label="Verified QR" value={String(stats.verified)} icon="🔳" iconBg={colors.softBlue} iconFg={colors.blue700} />
            <StatBox label="Service value" value={money(stats.totalAmount)} icon="₹" iconBg={colors.softBlue} iconFg={colors.blue700} />
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
          <ChipGroup
            label="Vehicle type"
            options={vehicleTypeOptions}
            selectedCodes={serviceForm.vehicleType ? [serviceForm.vehicleType] : []}
            onPress={(option) => selectVehicleType(option.code)}
          />
          {serviceForm.vehicleType ? (
            <ChipGroup
              label="Vehicle make"
              options={[...availableMakes, { code: "__other__", label: "Other" }]}
              selectedCodes={useOtherMake ? ["__other__"] : serviceForm.vehicleMakeCode ? [serviceForm.vehicleMakeCode] : []}
              onPress={selectMake}
            />
          ) : null}
          {useOtherMake ? (
            <LabeledInput label="Other make" value={serviceForm.vehicleMakeOther} onChangeText={(value) => setServiceField("vehicleMakeOther", value)} />
          ) : null}
          {serviceForm.vehicleMakeCode || useOtherMake ? (
            useOtherMake ? null : (
              <ChipGroup
                label="Vehicle model"
                options={[...availableModels, { code: "__other__", label: "Other" }]}
                selectedCodes={useOtherModel ? ["__other__"] : serviceForm.vehicleModelCode ? [serviceForm.vehicleModelCode] : []}
                onPress={selectModel}
              />
            )
          ) : null}
          {useOtherModel ? (
            <LabeledInput label="Other model" value={serviceForm.vehicleModelOther} onChangeText={(value) => setServiceField("vehicleModelOther", value)} />
          ) : null}
          <LabeledInput label="Vehicle number" value={serviceForm.vehicleNumber} onChangeText={(value) => setServiceField("vehicleNumber", value.toUpperCase())} />
          <LabeledInput
            label="Model year (optional)"
            value={serviceForm.modelYear ? String(serviceForm.modelYear) : ""}
            onChangeText={(value) => setServiceField("modelYear", value ? Number(value.replace(/\D/g, "")) : null)}
            keyboardType="numeric"
          />
          <LabeledInput
            label="Odometer km (optional)"
            value={serviceForm.odometerKm !== null ? String(serviceForm.odometerKm) : ""}
            onChangeText={(value) => setServiceField("odometerKm", value ? Number(value.replace(/\D/g, "")) : null)}
            keyboardType="numeric"
          />
          <ChipGroup
            label="Services performed (select all)"
            options={taxonomy.serviceCategories}
            selectedCodes={serviceForm.serviceCategoryCodes}
            onPress={toggleServiceCategory}
          />
          <ChipGroup
            label="Failures / symptoms (select all)"
            options={taxonomy.failureCategories}
            selectedCodes={serviceForm.failureCategoryCodes}
            onPress={toggleFailureCategory}
          />
          <LabeledInput label="Service notes (optional)" value={serviceForm.serviceNotes} onChangeText={(value) => setServiceField("serviceNotes", value)} multiline />
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
  screen: {
    backgroundColor: colors.slate50
  },
  container: {
    padding: 20,
    paddingBottom: 40
  },
  center: {
    alignItems: "center",
    backgroundColor: colors.slate50,
    flex: 1,
    justifyContent: "center",
    padding: 20
  },
  loadingText: {
    color: colors.slate500,
    fontSize: 15,
    marginTop: 10
  },
  header: {
    marginBottom: 20
  },
  kicker: {
    ...sectionLabel,
    color: colors.blue600
  },
  title: {
    color: colors.navy,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 4
  },
  subtitle: {
    color: colors.slate500,
    fontSize: 15,
    marginTop: 6
  },
  heroCard: {
    backgroundColor: colors.blue700,
    justifyContent: "flex-end",
    marginBottom: 20,
    marginHorizontal: -20,
    marginTop: -20,
    minHeight: 250,
    paddingBottom: 24,
    paddingHorizontal: 24,
    paddingTop: 68
  },
  heroGear: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    position: "absolute",
    right: 20,
    top: 52,
    width: 40
  },
  heroGearIcon: {
    fontSize: 16
  },
  heroTitle: {
    color: colors.white,
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 38
  },
  heroMeta: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4
  },
  heroPills: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14
  },
  heroPillOpen: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    borderColor: "rgba(34, 197, 94, 0.3)",
    borderRadius: radii.pill,
    borderWidth: 1,
    color: "#86EFAC",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 7,
    textTransform: "uppercase"
  },
  heroPillRating: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: radii.pill,
    borderWidth: 1,
    color: "#FCD34D",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 7
  },
  statsGrid: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16
  },
  statBox: {
    alignItems: "center",
    ...cardShadow,
    borderColor: colors.slate100,
    flexBasis: "47%",
    flexGrow: 1,
    maxWidth: "48%",
    paddingHorizontal: 12,
    paddingVertical: 20
  },
  statIcon: {
    alignItems: "center",
    backgroundColor: colors.softBlue,
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    marginBottom: 12,
    width: 44
  },
  statIconText: {
    fontSize: 20
  },
  statValue: {
    color: colors.slate900,
    fontSize: 26,
    fontWeight: "900"
  },
  statLabel: {
    color: colors.slate400,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginTop: 4,
    textTransform: "uppercase"
  },
  actionRow: {
    gap: 12,
    marginBottom: 22
  },
  panel: {
    ...cardShadow,
    marginBottom: 18,
    padding: 20
  },
  sectionHeader: {
    marginBottom: 14
  },
  sectionTitle: {
    ...sectionLabel
  },
  sectionHint: {
    color: colors.slate500,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6
  },
  field: {
    marginBottom: 14
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  choiceChip: {
    backgroundColor: colors.slate50,
    borderColor: colors.slate200,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  choiceChipSelected: {
    backgroundColor: colors.blue600,
    borderColor: colors.blue600
  },
  choiceChipText: {
    color: colors.slate600,
    fontSize: 13,
    fontWeight: "700"
  },
  choiceChipTextSelected: {
    color: colors.white
  },
  label: {
    color: colors.slate600,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
    marginLeft: 2
  },
  input: {
    backgroundColor: colors.slate50,
    borderColor: colors.slate200,
    borderRadius: radii.control,
    borderWidth: 1.5,
    color: colors.navy,
    fontSize: 16,
    fontWeight: "600",
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: "top"
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.control,
    justifyContent: "center",
    marginTop: 10,
    minHeight: 56,
    paddingHorizontal: 16,
    ...buttonShadow
  },
  darkButton: {
    backgroundColor: colors.navy,
    shadowColor: colors.navy
  },
  outlineButton: {
    backgroundColor: colors.white,
    borderColor: colors.slate200,
    borderWidth: 1.5,
    shadowOpacity: 0,
    elevation: 0
  },
  disabledButton: {
    opacity: 0.4,
    shadowOpacity: 0
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700"
  },
  outlineButtonText: {
    color: colors.blue600
  },
  recordCard: {
    ...cardShadow,
    marginBottom: 14,
    padding: 18
  },
  recordTop: {
    flexDirection: "row",
    gap: 10
  },
  flex: {
    flex: 1
  },
  recordTitle: {
    color: colors.slate900,
    fontSize: 16,
    fontWeight: "800"
  },
  recordMeta: {
    color: colors.slate500,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4
  },
  amount: {
    color: colors.slate900,
    fontSize: 17,
    fontWeight: "900"
  },
  recordVehicle: {
    color: colors.slate600,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 4
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  chipService: {
    backgroundColor: colors.green50,
    borderRadius: radii.pill,
    color: colors.green700,
    fontSize: 12,
    fontWeight: "700",
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  chipFailure: {
    backgroundColor: colors.red50,
    borderRadius: radii.pill,
    color: colors.red600,
    fontSize: 12,
    fontWeight: "700",
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  badge: {
    backgroundColor: colors.softBlue,
    borderRadius: radii.pill,
    color: colors.blue700,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  invoiceLine: {
    color: colors.slate600,
    fontSize: 12,
    marginTop: 12
  },
  empty: {
    color: colors.slate500,
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
    backgroundColor: colors.slate50,
    borderColor: colors.slate200,
    borderRadius: radii.control,
    borderWidth: 1,
    color: colors.slate600,
    fontSize: 13,
    fontWeight: "700",
    marginVertical: 12,
    padding: 12
  },
  devOtp: {
    backgroundColor: colors.amber50,
    borderColor: "#FDE68A",
    borderRadius: radii.control,
    borderWidth: 1,
    color: "#92400E",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 12,
    padding: 12
  },
  paymentBox: {
    backgroundColor: colors.slate50,
    borderColor: colors.slate100,
    borderRadius: radii.control,
    borderWidth: 1,
    marginTop: 12,
    padding: 16
  },
  paymentTitle: {
    color: colors.slate900,
    fontSize: 16,
    fontWeight: "800"
  },
  error: {
    backgroundColor: colors.red50,
    borderRadius: radii.control,
    color: colors.red600,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
    padding: 12,
    textAlign: "center"
  },
  success: {
    backgroundColor: colors.green50,
    borderRadius: radii.control,
    color: colors.green700,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
    padding: 12,
    textAlign: "center"
  }
});
