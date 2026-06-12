import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet } from "react-native";

import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import { AuthScreen } from "./src/screens/AuthScreen";
import { RoleHome } from "./src/screens/RoleHome";

function AppContent() {
  const { profile, loading } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      {profile ? <RoleHome profile={profile} /> : <AuthScreen loadingSession={loading} />}
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc"
  }
});
