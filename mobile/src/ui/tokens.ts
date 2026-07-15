// Design tokens matching the KnowYourMechanic app screens in UI.pdf.
// Light screens: customer + garage. Dark console: admin + employee.

export const colors = {
  // Primary action / header blue (bright, per the PDF).
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryPressed: "#1E40AF",
  // Kept for older references.
  azure: "#3B82F6",
  navy: "#0F172A",
  softBlue: "#EFF3FF",

  // Slate scale (light screens).
  slate50: "#F8FAFC",
  slate100: "#F1F5F9",
  slate200: "#E2E8F0",
  slate300: "#CBD5E1",
  slate400: "#94A3B8",
  slate500: "#64748B",
  slate600: "#475569",
  slate700: "#334155",
  slate900: "#0F172A",

  white: "#FFFFFF",

  blue600: "#2563EB",
  blue700: "#1D4ED8",
  blue800: "#1E40AF",
  green500: "#22C55E",
  green600: "#16A34A",
  green50: "#E9F9EF",
  green700: "#15803D",
  amber500: "#F59E0B",
  amber600: "#D97706",
  amber50: "#FFF7E6",
  purple600: "#7C3AED",
  purple50: "#F1ECFE",
  red600: "#DC2626",
  red500: "#EF4444",
  red50: "#FEECEC"
} as const;

// Near-black console theme (admin / employee).
export const dark = {
  bg: "#0A0A0B",
  card: "#101013",
  cardElevated: "#16161A",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.14)",
  text: "#FAFAFA",
  textDim: "#8A8A93",
  textFaint: "#5A5A63"
} as const;

// Tinted icon chips used throughout (rounded square with a colored glyph).
export const chip = {
  blue: { bg: colors.softBlue, fg: colors.blue600 },
  green: { bg: colors.green50, fg: colors.green600 },
  purple: { bg: colors.purple50, fg: colors.purple600 },
  amber: { bg: colors.amber50, fg: colors.amber600 },
  red: { bg: colors.red50, fg: colors.red600 }
} as const;

export const radii = {
  card: 22,
  control: 16,
  chip: 14,
  pill: 999
} as const;

// White card: soft layered shadow + hairline border.
export const cardShadow = {
  backgroundColor: colors.white,
  borderColor: "rgba(15, 23, 42, 0.05)",
  borderWidth: 1,
  borderRadius: radii.card,
  shadowColor: colors.navy,
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.05,
  shadowRadius: 16,
  elevation: 2
} as const;

// Bright-blue primary button with a matching glow.
export const buttonShadow = {
  shadowColor: colors.primary,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.35,
  shadowRadius: 16,
  elevation: 4
} as const;

// Uppercase tracked section label ("RECENT SERVICES", "TOTAL SERVICES").
export const sectionLabel = {
  color: colors.slate400,
  fontSize: 13,
  fontWeight: "800" as const,
  letterSpacing: 1.5,
  textTransform: "uppercase" as const
};
