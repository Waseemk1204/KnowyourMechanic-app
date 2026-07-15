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
import { buttonShadow, colors, radii } from "../ui/tokens";

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
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.logoTile}>
          <Text style={styles.logoEmoji}>🔧</Text>
        </View>

        <Text style={styles.title}>KnowyourMechanic</Text>
        <Text style={styles.subtitle}>Trusted mechanics at your fingertips</Text>

        {step === "phone" ? (
          <View style={styles.form}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.phoneRow}>
              <Text style={styles.countryCode}>+91</Text>
              <View style={styles.divider} />
              <TextInput
                keyboardType="number-pad"
                maxLength={10}
                onChangeText={setPhoneNumber}
                placeholder="00000 00000"
                placeholderTextColor={colors.slate300}
                style={styles.input}
                value={phoneNumber}
              />
            </View>
            <Pressable
              disabled={!canSubmitPhone || submitting}
              onPress={handleRequestOtp}
              style={[
                styles.button,
                (!canSubmitPhone || submitting) && styles.buttonDisabled
              ]}
            >
              <Text style={styles.buttonText}>
                {submitting ? "Sending..." : "Continue  ›"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>Enter verification code</Text>
            <TextInput
              keyboardType="number-pad"
              maxLength={6}
              onChangeText={setOtp}
              placeholder={authMode === "dev_mock_otp" ? "123456" : "000000"}
              placeholderTextColor={colors.slate200}
              style={styles.otpInput}
              value={otp}
            />
            <Pressable
              disabled={!canSubmitOtp || submitting}
              onPress={handleVerifyOtp}
              style={[styles.button, (!canSubmitOtp || submitting) && styles.buttonDisabled]}
            >
              <Text style={styles.buttonText}>{submitting ? "Verifying..." : "Verify  ›"}</Text>
            </Pressable>
            <Pressable onPress={() => setStep("phone")} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Change phone number</Text>
            </Pressable>
          </View>
        )}

        {authMode === "dev_mock_otp" ? (
          <Text style={styles.devNote}>Dev OTP: 123456</Text>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.terms}>By continuing, you agree to our Terms & Privacy Policy</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    backgroundColor: colors.slate50,
    flex: 1,
    justifyContent: "center"
  },
  container: {
    backgroundColor: colors.slate50,
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  content: {
    alignSelf: "center",
    maxWidth: 400,
    width: "100%"
  },
  logoTile: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.white,
    borderRadius: 32,
    height: 112,
    justifyContent: "center",
    marginBottom: 40,
    shadowColor: colors.azure,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 6,
    width: 112
  },
  logoEmoji: {
    fontSize: 52
  },
  title: {
    color: colors.navy,
    fontSize: 34,
    fontWeight: "900",
    textAlign: "center"
  },
  subtitle: {
    color: colors.slate500,
    fontSize: 18,
    marginTop: 8,
    textAlign: "center"
  },
  form: {
    marginTop: 40
  },
  label: {
    color: colors.slate600,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4
  },
  phoneRow: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radii.control,
    flexDirection: "row",
    height: 64,
    marginBottom: 24,
    paddingHorizontal: 20,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1
  },
  countryCode: {
    color: colors.slate600,
    fontSize: 18,
    fontWeight: "700"
  },
  divider: {
    backgroundColor: colors.slate200,
    height: 24,
    marginHorizontal: 14,
    width: 1
  },
  input: {
    color: colors.navy,
    flex: 1,
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: 1
  },
  otpInput: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    color: colors.navy,
    fontSize: 34,
    fontWeight: "700",
    height: 80,
    letterSpacing: 12,
    marginBottom: 24,
    textAlign: "center"
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.control,
    height: 64,
    justifyContent: "center",
    ...buttonShadow
  },
  buttonDisabled: {
    backgroundColor: colors.slate400,
    opacity: 0.7,
    shadowOpacity: 0
  },
  buttonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700"
  },
  secondaryButton: {
    alignItems: "center",
    marginTop: 18
  },
  secondaryText: {
    color: colors.blue600,
    fontSize: 15,
    fontWeight: "700"
  },
  devNote: {
    color: colors.slate400,
    fontSize: 13,
    marginTop: 16,
    textAlign: "center"
  },
  error: {
    backgroundColor: colors.red50,
    borderRadius: 12,
    color: colors.red600,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    textAlign: "center"
  },
  terms: {
    color: colors.slate400,
    fontSize: 13,
    marginTop: 32,
    textAlign: "center"
  }
});
