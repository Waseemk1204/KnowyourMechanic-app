import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../auth/AuthContext";
import type { AuthProfile } from "../auth/authTypes";
import { cardShadow, colors, radii, sectionLabel } from "../ui/tokens";
import { AdminWorkspace } from "./AdminWorkspace";
import { CustomerWorkspace } from "./CustomerWorkspace";
import { EmployeeWorkspace } from "./EmployeeWorkspace";
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

  if (profile.role === "admin") {
    return <AdminWorkspace profile={profile} />;
  }

  if (profile.role === "employee") {
    return <EmployeeWorkspace profile={profile} />;
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
    backgroundColor: colors.slate50,
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  header: {
    marginBottom: 24
  },
  kicker: {
    ...sectionLabel,
    color: colors.blue600,
    marginBottom: 8,
    textAlign: "center"
  },
  title: {
    color: colors.navy,
    fontSize: 30,
    fontWeight: "900",
    textAlign: "center"
  },
  subtitle: {
    color: colors.slate500,
    fontSize: 16,
    marginTop: 8,
    textAlign: "center"
  },
  infoPanel: {
    ...cardShadow,
    padding: 20
  },
  infoLabel: {
    color: colors.slate400,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 10,
    textTransform: "uppercase"
  },
  infoValue: {
    color: colors.slate900,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 3
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.navy,
    borderRadius: radii.control,
    marginTop: 20,
    minHeight: 56,
    justifyContent: "center"
  },
  buttonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "700"
  }
});
