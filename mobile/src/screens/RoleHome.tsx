import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../auth/AuthContext";
import type { AuthProfile } from "../auth/authTypes";
import { CustomerWorkspace } from "./CustomerWorkspace";
import { GarageWorkspace } from "./GarageWorkspace";

const roleLabels: Record<AuthProfile["role"], string> = {
  admin: "Admin",
  customer: "Customer",
  employee: "Employee",
  garage: "Garage Owner"
};

const roleDescriptions: Record<AuthProfile["role"], string> = {
  admin: "Migration admin shell ready.",
  customer: "Customer shell ready.",
  employee: "Employee shell ready.",
  garage: "Garage shell ready."
};

export function RoleHome({ profile }: { profile: AuthProfile }) {
  const { signOut } = useAuth();

  if (profile.role === "garage") {
    return <GarageWorkspace profile={profile} />;
  }

  if (profile.role === "customer") {
    return <CustomerWorkspace profile={profile} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>{roleLabels[profile.role]}</Text>
        <Text style={styles.title}>{profile.name ?? "KnowYourMechanic user"}</Text>
        <Text style={styles.subtitle}>{roleDescriptions[profile.role]}</Text>
      </View>

      <View style={styles.infoPanel}>
        <Text style={styles.infoLabel}>Phone</Text>
        <Text style={styles.infoValue}>{profile.phone_number}</Text>
        <Text style={styles.infoLabel}>Profile ID</Text>
        <Text style={styles.infoValue}>{profile.id}</Text>
      </View>

      <Pressable onPress={signOut} style={styles.button}>
        <Text style={styles.buttonText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  header: {
    marginBottom: 22
  },
  kicker: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0,
    marginBottom: 8,
    textAlign: "center"
  },
  title: {
    color: "#0f172a",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 0,
    textAlign: "center"
  },
  subtitle: {
    color: "#64748b",
    fontSize: 16,
    marginTop: 8,
    textAlign: "center"
  },
  infoPanel: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    padding: 18
  },
  infoLabel: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8
  },
  infoValue: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 3
  },
  button: {
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: 8,
    marginTop: 18,
    minHeight: 52,
    justifyContent: "center"
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800"
  }
});
