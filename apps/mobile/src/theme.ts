import { DynamicColorIOS, Platform, PlatformColor, type ColorValue } from "react-native";

function adaptive(light: string, dark: string, androidAttribute: string): ColorValue {
  if (Platform.OS === "ios") return DynamicColorIOS({ light, dark });
  if (Platform.OS === "android") return PlatformColor(androidAttribute);
  return light;
}

export const colors = {
  bg: adaptive("#F4F2EA", "#121815", "?attr/colorBackground"),
  surface: adaptive("#FFFDF7", "#1C2520", "?attr/colorSurface"),
  ink: adaptive("#18221D", "#F3F5F0", "?attr/textColorPrimary"),
  muted: adaptive("#657069", "#ABB5AE", "?attr/textColorSecondary"),
  border: adaptive("#D8D9CF", "#39453E", "?attr/colorControlNormal"),
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
