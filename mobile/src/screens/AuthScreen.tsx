import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { useAuth } from "../auth/AuthContext";
import { formatIndianPhone, isValidIndianPhone } from "../auth/phone";
import { authMode } from "../config/env";

type AuthStep = "phone" | "otp";

export function AuthScreen({ loadingSession }: { loadingSession: boolean }) {
  const { requestOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<AuthStep>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmitPhone = isValidIndianPhone(phoneNumber);
  const canSubmitOtp = otp.trim().length === 6;

  async function handleRequestOtp() {
    setError("");
    setSubmitting(true);

    try {
      const formattedPhone = formatIndianPhone(phoneNumber);
      await requestOtp(formattedPhone);
      setPhoneNumber(formattedPhone);
      setStep("otp");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not send OTP.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp() {
    setError("");
    setSubmitting(true);

    try {
      await verifyOtp(phoneNumber, otp);
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Could not verify OTP.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingSession) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#2563eb" size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>KnowYourMechanic</Text>
        <Text style={styles.subtitle}>
          {step === "phone" ? "Sign in with your phone number" : "Enter verification code"}
        </Text>
      </View>

      <View style={styles.panel}>
        {step === "phone" ? (
          <>
            <Text style={styles.label}>Phone number</Text>
            <View style={styles.phoneRow}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                keyboardType="number-pad"
                maxLength={10}
                onChangeText={setPhoneNumber}
                placeholder="9321495344"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                value={phoneNumber}
              />
            </View>
            <Pressable
              disabled={!canSubmitPhone || submitting}
              onPress={handleRequestOtp}
              style={[styles.button, (!canSubmitPhone || submitting) && styles.buttonDisabled]}
            >
              <Text style={styles.buttonText}>{submitting ? "Sending..." : "Continue"}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.label}>OTP</Text>
            <TextInput
              keyboardType="number-pad"
              maxLength={6}
              onChangeText={setOtp}
              placeholder={authMode === "dev_mock_otp" ? "123456" : "Enter OTP"}
              placeholderTextColor="#94a3b8"
              style={styles.otpInput}
              value={otp}
            />
            <Pressable
              disabled={!canSubmitOtp || submitting}
              onPress={handleVerifyOtp}
              style={[styles.button, (!canSubmitOtp || submitting) && styles.buttonDisabled]}
            >
              <Text style={styles.buttonText}>{submitting ? "Verifying..." : "Verify"}</Text>
            </Pressable>
            <Pressable onPress={() => setStep("phone")} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Change phone number</Text>
            </Pressable>
          </>
        )}

        {authMode === "dev_mock_otp" ? (
          <Text style={styles.devNote}>Dev OTP: 123456</Text>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  header: {
    marginBottom: 28
  },
  title: {
    color: "#0f172a",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 0,
    textAlign: "center"
  },
  subtitle: {
    color: "#64748b",
    fontSize: 17,
    marginTop: 8,
    textAlign: "center"
  },
  panel: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    padding: 18
  },
  label: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8
  },
  phoneRow: {
    alignItems: "center",
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 16
  },
  countryCode: {
    color: "#475569",
    fontSize: 18,
    fontWeight: "700",
    paddingLeft: 14,
    paddingRight: 10
  },
  input: {
    color: "#0f172a",
    flex: 1,
    fontSize: 20,
    padding: 14
  },
  otpInput: {
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0f172a",
    fontSize: 24,
    letterSpacing: 0,
    marginBottom: 16,
    padding: 14,
    textAlign: "center"
  },
  button: {
    alignItems: "center",
    backgroundColor: "#2563eb",
    borderRadius: 8,
    minHeight: 52,
    justifyContent: "center"
  },
  buttonDisabled: {
    opacity: 0.45
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800"
  },
  secondaryButton: {
    alignItems: "center",
    marginTop: 14
  },
  secondaryText: {
    color: "#2563eb",
    fontSize: 15,
    fontWeight: "700"
  },
  devNote: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 14,
    textAlign: "center"
  },
  error: {
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 14,
    padding: 12,
    textAlign: "center"
  }
});
