import type { ColorValue } from "react-native";

function adaptive(light: string, _dark: string): ColorValue {
  // Koyu tema paleti ileride yeniden etkinleştirilecek.
  // if (Platform.OS === "ios") return DynamicColorIOS({ light, dark });
  // if (Platform.OS === "android") return Appearance.getColorScheme() === "dark" ? dark : light;
  return light;
}

export const colors = {
  bg: adaptive("#F4F2EA", "#121815"),
  surface: adaptive("#FFFDF7", "#1C2520"),
  ink: adaptive("#18221D", "#F3F5F0"),
  muted: adaptive("#657069", "#ABB5AE"),
  border: adaptive("#D8D9CF", "#39453E"),
  soft: adaptive("#ECEBE3", "#28322C"),
  banner: adaptive("#E2E7DF", "#2B3730"),
  primary: "#E36B38",
  primaryDark: "#A93E18",
  moss: "#375E4C",
  water: "#386D78",
  warning: "#9A5A12",
  danger: "#A0322C",
  offline: "#3B4550",
  white: "#FFFFFF"
} as const;

export const spacing = { xs: 6, sm: 10, md: 16, lg: 24, xl: 32 } as const;
