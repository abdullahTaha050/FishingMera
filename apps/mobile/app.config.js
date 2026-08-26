/** @type {import("expo/config").ExpoConfig} */
const isDevelopmentClientBuild = ["development", "simulator"].includes(process.env.EAS_BUILD_PROFILE ?? "");
const developmentClientPlugin = ["expo-dev-client", { launchMode: "launcher", android: { launchMode: "launcher" } }];

const config = {
  name: "Mera",
  slug: "mera",
  scheme: "mera",
  version: "0.1.0",
  icon: "./assets/icon.png",
  primaryColor: "#375E4C",
  orientation: "portrait",
  userInterfaceStyle: "light",
  backgroundColor: "#F4F2EA",
  androidStatusBar: {
    barStyle: "dark-content",
    backgroundColor: "#F4F2EA"
  },
  androidNavigationBar: {
    backgroundColor: "#F4F2EA",
    barStyle: "dark-content",
    enforceContrast: false
  },
  ios: {
    bundleIdentifier: "app.mera.mobile",
    buildNumber: "1",
    supportsTablet: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSLocationWhenInUseUsageDescription: "Yakındaki meraları bulmak, pusula yönünü ve kuş uçuşu mesafeyi göstermek için konumun gerekir.",
      NSMotionUsageDescription: "Mera ve araç yönünü çevrimdışı göstermek için pusula sensörü kullanılır."
    }
  },
  android: {
    package: "app.mera.mobile",
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/icon.png",
      backgroundColor: "#F4F2EA"
    },
    permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"],
    blockedPermissions: ["android.permission.RECORD_AUDIO"],
    predictiveBackGestureEnabled: true
  },
  plugins: [
    ...(isDevelopmentClientBuild ? [developmentClientPlugin] : []),
    "expo-router",
    "@maplibre/maplibre-react-native",
    ["expo-splash-screen", { image: "./assets/icon.png", imageWidth: 180, resizeMode: "contain", backgroundColor: "#F4F2EA" }],
    ["expo-sqlite", { enableFTS: true }],
    ["expo-image-picker", { photosPermission: "Av veya mera fotoğrafını cihazda saklamak için fotoğraflarına erişim izni gerekir.", cameraPermission: "Av veya mera fotoğrafı çekmek için kamera izni gerekir." }],
    ["expo-location", { locationWhenInUsePermission: "Yakındaki meraları ve çevrimdışı yönü göstermek için konumuna izin ver." }]
  ],
  experiments: { typedRoutes: true },
  extra: {
    mapStyleUrl: process.env.EXPO_PUBLIC_MAP_STYLE_URL ?? null,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? null,
    eas: { projectId: process.env.EAS_PROJECT_ID ?? "99fbc2dc-a277-4d86-bc1a-38c33bd2510d" }
  }
};

module.exports = config;
