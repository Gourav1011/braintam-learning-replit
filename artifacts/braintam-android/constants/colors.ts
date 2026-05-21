export const Colors = {
  primary: "#FF6B1A",
  navy: "#0B2B6B",
  background: "#F5F7FF",
  surface: "#FFFFFF",
  text: "#0B2B6B",
  muted: "#374151",
  mutedForeground: "#6B7280",
  border: "#E5E7EB",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  cardBackground: "#FFFFFF",
  tabBar: "#FFFFFF",
  tabBarBorder: "#E5E7EB",
} as const;

export type ColorKey = keyof typeof Colors;
