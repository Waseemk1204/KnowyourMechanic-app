import type { ReactNode } from "react";
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle
} from "react-native";

import { buttonShadow, cardShadow, chip, colors, radii, sectionLabel } from "./tokens";

// Rounded-square tinted icon chip (e.g. blue wrench, green headphones).
export function IconChip({
  glyph,
  tone = "blue",
  size = 48
}: {
  glyph: string;
  tone?: keyof typeof chip;
  size?: number;
}) {
  const t = chip[tone];
  return (
    <View
      style={[
        styles.iconChip,
        { backgroundColor: t.bg, width: size, height: size, borderRadius: size * 0.3 }
      ]}
    >
      <Text style={{ color: t.fg, fontSize: size * 0.42, fontWeight: "800" }}>{glyph}</Text>
    </View>
  );
}

// White card with the standard soft shadow.
export function Card({
  children,
  style
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// Uppercase tracked section label.
export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

// Rounded blue header card used on customer/garage sub-screens
// (Profile, Support, Activity, Settings). Optional photo background.
export function BlueHeader({
  title,
  subtitle,
  onBack,
  glyph,
  photoUrl,
  right
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  glyph?: string;
  photoUrl?: string;
  right?: ReactNode;
}) {
  const inner = (
    <View style={styles.headerInner}>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.backRow} hitSlop={8}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
      ) : null}
      <View style={styles.headerTitleRow}>
        {glyph ? (
          <View style={styles.headerGlyph}>
            <Text style={styles.headerGlyphText}>{glyph}</Text>
          </View>
        ) : null}
        <View style={styles.flex}>
          <Text style={styles.headerTitle}>{title}</Text>
          {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );

  if (photoUrl) {
    return (
      <ImageBackground source={{ uri: photoUrl }} style={styles.header} imageStyle={styles.headerImage}>
        <View style={styles.headerScrim} />
        {inner}
      </ImageBackground>
    );
  }
  return <View style={[styles.header, styles.headerBlue]}>{inner}</View>;
}

// Bright-blue primary button (optionally with a leading glyph).
export function PrimaryButton({
  label,
  onPress,
  glyph,
  disabled,
  variant = "primary"
}: {
  label: string;
  onPress: () => void;
  glyph?: string;
  disabled?: boolean;
  variant?: "primary" | "outline" | "danger" | "ghost";
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.btn,
        variant === "primary" ? styles.btnPrimary : null,
        variant === "outline" ? styles.btnOutline : null,
        variant === "danger" ? styles.btnDanger : null,
        variant === "ghost" ? styles.btnGhost : null,
        disabled ? styles.btnDisabled : null
      ]}
    >
      {glyph ? (
        <Text
          style={[
            styles.btnGlyph,
            variant === "outline" || variant === "ghost" ? styles.btnTextDark : null,
            variant === "danger" ? styles.btnTextDanger : null
          ]}
        >
          {glyph}
        </Text>
      ) : null}
      <Text
        style={[
          styles.btnText,
          variant === "outline" || variant === "ghost" ? styles.btnTextDark : null,
          variant === "danger" ? styles.btnTextDanger : null
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// Icon-chip stat tile (big number + uppercase label), used on dashboards.
export function StatTile({
  value,
  label,
  glyph,
  tone = "blue"
}: {
  value: string;
  label: string;
  glyph: string;
  tone?: keyof typeof chip;
}) {
  return (
    <View style={styles.statTile}>
      <IconChip glyph={glyph} tone={tone} size={44} />
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  iconChip: {
    alignItems: "center",
    justifyContent: "center"
  },
  card: {
    ...cardShadow,
    padding: 20
  },
  sectionLabel: {
    ...sectionLabel,
    marginBottom: 12
  },
  // Blue header
  header: {
    borderBottomLeftRadius: radii.card,
    borderBottomRightRadius: radii.card,
    overflow: "hidden"
  },
  headerBlue: {
    backgroundColor: colors.primary
  },
  headerImage: {
    borderBottomLeftRadius: radii.card,
    borderBottomRightRadius: radii.card
  },
  headerScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(10,23,55,0.35)"
  },
  headerInner: {
    paddingBottom: 22,
    paddingHorizontal: 22,
    paddingTop: 56
  },
  backRow: { marginBottom: 14 },
  backText: { color: "rgba(255,255,255,0.9)", fontSize: 17, fontWeight: "700" },
  headerTitleRow: { alignItems: "center", flexDirection: "row", gap: 14 },
  headerGlyph: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
    width: 56
  },
  headerGlyphText: { fontSize: 26 },
  headerTitle: { color: colors.white, fontSize: 30, fontWeight: "900" },
  headerSubtitle: { color: "rgba(255,255,255,0.82)", fontSize: 15, marginTop: 3 },
  // Buttons
  btn: {
    alignItems: "center",
    borderRadius: radii.control,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 18
  },
  btnPrimary: { backgroundColor: colors.primary, ...buttonShadow },
  btnOutline: { backgroundColor: colors.white, borderColor: colors.slate200, borderWidth: 1.5 },
  btnDanger: { backgroundColor: colors.red50 },
  btnGhost: { backgroundColor: colors.slate100 },
  btnDisabled: { backgroundColor: colors.slate300, opacity: 0.7, shadowOpacity: 0 },
  btnText: { color: colors.white, fontSize: 17, fontWeight: "800" },
  btnTextDark: { color: colors.slate700 },
  btnTextDanger: { color: colors.red600 },
  btnGlyph: { color: colors.white, fontSize: 18, fontWeight: "800" },
  // Stat tile
  statTile: {
    ...cardShadow,
    alignItems: "center",
    flexBasis: "47%",
    flexGrow: 1,
    maxWidth: "48%",
    paddingHorizontal: 12,
    paddingVertical: 22
  },
  statValue: { color: colors.slate900, fontSize: 30, fontWeight: "900", marginTop: 12 },
  statLabel: {
    color: colors.slate400,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 4,
    textTransform: "uppercase"
  }
});
