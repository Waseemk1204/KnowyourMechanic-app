import { useEffect, useRef } from "react";
import {
  Animated,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { chip, colors, radii } from "./tokens";

export type DrawerItem = {
  glyph: string;
  tone: keyof typeof chip;
  title: string;
  subtitle?: string;
  onPress: () => void;
};

// Slide-out drawer used by customer (p2) and garage (p20): a blue header with
// avatar/role, tappable menu rows with tinted icon chips, and a red Logout pill.
export function AppDrawer({
  visible,
  onClose,
  title,
  subtitle,
  statusText,
  glyph,
  photoUrl,
  items,
  onLogout
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  statusText?: string;
  glyph?: string;
  photoUrl?: string;
  items: DrawerItem[];
  onLogout: () => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: false
    }).start();
  }, [anim, visible]);
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [420, 0] });

  const HeaderInner = (
    <>
      <Pressable style={styles.close} onPress={onClose} hitSlop={8}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
      <View style={styles.avatar}>
        {photoUrl ? null : <Text style={styles.avatarGlyph}>{glyph ?? "👤"}</Text>}
      </View>
      <Text style={styles.headerTitle}>{title}</Text>
      {statusText ? (
        <Text style={styles.statusText}>● {statusText}</Text>
      ) : subtitle ? (
        <Text style={styles.subtitle}>{subtitle}</Text>
      ) : null}
    </>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: anim }]}>
        <Pressable style={styles.backdropPress} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.panel, { transform: [{ translateX }] }]}>
        {photoUrl ? (
          <ImageBackground source={{ uri: photoUrl }} style={styles.header} imageStyle={styles.headerImg}>
            <View style={styles.headerScrim} />
            {HeaderInner}
          </ImageBackground>
        ) : (
          <LinearGradient
            colors={["#3B82F6", "#2563EB", "#1E40AF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            {HeaderInner}
          </LinearGradient>
        )}

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {items.map((item) => (
            <Pressable
              key={item.title}
              style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
              onPress={() => {
                onClose();
                item.onPress();
              }}
            >
              <View style={[styles.rowChip, { backgroundColor: chip[item.tone].bg }]}>
                <Text style={[styles.rowChipGlyph, { color: chip[item.tone].fg }]}>{item.glyph}</Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                {item.subtitle ? <Text style={styles.rowSub}>{item.subtitle}</Text> : null}
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Pressable
          style={({ pressed }) => [styles.logout, pressed ? styles.rowPressed : null]}
          onPress={() => {
            onClose();
            onLogout();
          }}
        >
          <Text style={styles.logoutText}>⇥  Logout</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15,23,42,0.4)"
  },
  backdropPress: { flex: 1 },
  panel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: "82%",
    maxWidth: 380,
    backgroundColor: colors.white
  },
  header: {
    paddingBottom: 24,
    paddingHorizontal: 22,
    paddingTop: 52
  },
  headerBlue: { backgroundColor: colors.primary },
  headerImg: {},
  headerScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(8,15,35,0.35)"
  },
  close: { alignSelf: "flex-end" },
  closeText: { color: "rgba(255,255,255,0.9)", fontSize: 20, fontWeight: "700" },
  avatar: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 999,
    height: 64,
    justifyContent: "center",
    marginBottom: 12,
    width: 64
  },
  avatarGlyph: { fontSize: 28 },
  headerTitle: { color: colors.white, fontSize: 26, fontWeight: "900" },
  statusText: { color: "#86EFAC", fontSize: 15, fontWeight: "700", marginTop: 4 },
  subtitle: { color: "rgba(255,255,255,0.85)", fontSize: 15, marginTop: 2 },
  body: { flex: 1 },
  bodyContent: { padding: 18 },
  row: {
    alignItems: "center",
    borderRadius: radii.control,
    flexDirection: "row",
    gap: 14,
    marginHorizontal: -8,
    paddingHorizontal: 8,
    paddingVertical: 14
  },
  rowPressed: {
    backgroundColor: colors.slate50,
    opacity: 0.9
  },
  rowChip: {
    alignItems: "center",
    borderRadius: radii.chip,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  rowChipGlyph: { fontSize: 20 },
  rowTitle: { color: colors.slate900, fontSize: 18, fontWeight: "800" },
  rowSub: { color: colors.slate500, fontSize: 13, marginTop: 2 },
  chevron: { color: colors.slate300, fontSize: 24, fontWeight: "700" },
  logout: {
    alignItems: "center",
    backgroundColor: colors.red50,
    borderRadius: radii.control,
    margin: 18,
    paddingVertical: 16
  },
  logoutText: { color: colors.red600, fontSize: 17, fontWeight: "800" }
});
