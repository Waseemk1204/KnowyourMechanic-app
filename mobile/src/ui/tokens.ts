// Design tokens lifted from the original KnowYourMechanic web app
// (src/index.css "Premium Blue" palette + Tailwind classes used across pages).
// Keep the mobile app visually identical to the old web UI.

export const colors = {
  // Premium Blue palette (src/index.css :root)
  primary: "#0A58CA",
  primaryPressed: "#084298",
  azure: "#3B82F6",
  navy: "#0F172A",
  softBlue: "#EFF6FF",

  // Tailwind slate scale used throughout the old app
  slate50: "#F8FAFC",
  slate100: "#F1F5F9",
  slate200: "#E2E8F0",
  slate300: "#CBD5E1",
  slate400: "#94A3B8",
  slate500: "#64748B",
  slate600: "#475569",
  slate900: "#0F172A",

  white: "#FFFFFF",

  // Accents seen in the old app
  blue600: "#2563EB",
  blue700: "#1D4ED8",
  blue800: "#1E40AF",
  green500: "#22C55E",
  green50: "#F0FDF5",
  green700: "#15803D",
  amber500: "#F59E0B",
  amber50: "#FFFBEB",
  red600: "#DC2626",
  red50: "#FEF2F2"
} as const;

// Old app radii: premium-card 1.5rem (24), buttons/inputs rounded-2xl (16),
// pills rounded-full.
export const radii = {
  card: 24,
  control: 16,
  pill: 999
} as const;

// .premium-card: white bg, hairline navy-tinted border, soft layered shadow.
export const cardShadow = {
  backgroundColor: colors.white,
  borderColor: "rgba(15, 23, 42, 0.05)",
  borderWidth: 1,
  borderRadius: radii.card,
  shadowColor: colors.navy,
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.04,
  shadowRadius: 15,
  elevation: 2
} as const;

// .btn-premium: blue bg with a blue glow shadow.
export const buttonShadow = {
  shadowColor: colors.primary,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.39,
  shadowRadius: 14,
  elevation: 4
} as const;

// "text-sm font-black text-slate-400 uppercase tracking-[0.15em]"
export const sectionLabel = {
  color: colors.slate400,
  fontSize: 13,
  fontWeight: "900" as const,
  letterSpacing: 2,
  textTransform: "uppercase" as const
};
