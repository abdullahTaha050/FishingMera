import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Mera",
  slug: "mera",
  scheme: "mera",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  runtimeVersion: { policy: "appVersion" },
  ios: {
    bundleIdentifier: "app.mera.mobile",
    supportsTablet: true,
    infoPlist: {
      NSLocationWhenInUseUsageDescription: "Yakındaki meraları bulmak, pusula yönünü ve kuş uçuşu mesafeyi göstermek için konumun gerekir.",
      NSMotionUsageDescription: "Mera ve araç yönünü çevrimdışı göstermek için pusula sensörü kullanılır."
    }
  },
  android: {
    package: "app.mera.mobile",
    permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"],
    predictiveBackGestureEnabled: true
  },
  plugins: [
    "expo-router",
    "@maplibre/maplibre-react-native",
    ["expo-sqlite", { enableFTS: true }],
    ["expo-location", { locationWhenInUsePermission: "Yakındaki meraları ve çevrimdışı yönü göstermek için konumuna izin ver." }]
  ],
  experiments: { typedRoutes: true },
  extra: {
    mapStyleUrl: process.env.EXPO_PUBLIC_MAP_STYLE_URL ?? null,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? null
  }
};

export default config;
