import "react-native-gesture-handler";
import "react-native-url-polyfill/auto";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppStateProvider } from "@/store";
import { colors } from "@/theme";

export default function RootLayout() {
  return <SafeAreaProvider><AppStateProvider><StatusBar style="dark" /><Stack screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.ink, headerShadowVisible: false, contentStyle: { backgroundColor: colors.bg } }}><Stack.Screen name="(tabs)" options={{ headerShown: false }} /><Stack.Screen name="onboarding" options={{ title: "Başlangıç" }} /><Stack.Screen name="recommendations" options={{ title: "Bugün Nereye Gitsem?" }} /><Stack.Screen name="spot/[id]" options={{ title: "Mera" }} /><Stack.Screen name="compass" options={{ title: "Pusula" }} /><Stack.Screen name="catch/new" options={{ title: "Avı Kaydet", presentation: "modal" }} /></Stack></AppStateProvider></SafeAreaProvider>;
}

