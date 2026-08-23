import { DynamicColorIOS, Platform, PlatformColor, type ColorValue } from "react-native";

function adaptive(light: string, dark: string, ...androidResources: string[]): ColorValue {
  if (Platform.OS === "ios") return DynamicColorIOS({ light, dark });
  if (Platform.OS === "android") return PlatformColor(...androidResources);
  return light;
}

export const colors = {
  bg: adaptive("#F4F2EA", "#121815", "?android:attr/colorBackground", "@android:color/background_light"),
  surface: adaptive("#FFFDF7", "#1C2520", "?android:attr/colorBackgroundFloating", "?android:attr/colorBackground", "@android:color/background_light"),
  ink: adaptive("#18221D", "#F3F5F0", "?android:attr/textColorPrimary", "@android:color/primary_text_light"),
  muted: adaptive("#657069", "#ABB5AE", "?android:attr/textColorSecondary", "@android:color/secondary_text_light"),
  border: adaptive("#D8D9CF", "#39453E", "?android:attr/textColorSecondary", "@android:color/darker_gray"),
  soft: adaptive("#ECEBE3", "#28322C", "?android:attr/colorBackgroundFloating", "?android:attr/colorBackground", "@android:color/background_light"),
  banner: adaptive("#E2E7DF", "#2B3730", "?android:attr/colorBackgroundFloating", "?android:attr/colorBackground", "@android:color/background_light"),
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
