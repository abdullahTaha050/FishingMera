import "react-native-gesture-handler";
import "react-native-url-polyfill/auto";
import { Stack } from "expo-router";
import * as SystemUI from "expo-system-ui";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppStateProvider } from "@/store";
import { colors } from "@/theme";

void SystemUI.setBackgroundColorAsync(colors.bg);

export default function RootLayout() {
  return <SafeAreaProvider><AppStateProvider><StatusBar barStyle="dark-content" backgroundColor={colors.bg} translucent={false} /><Stack screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.ink, headerShadowVisible: false, contentStyle: { backgroundColor: colors.bg } }}><Stack.Screen name="(tabs)" options={{ headerShown: false }} /><Stack.Screen name="onboarding" options={{ title: "Başlangıç" }} /><Stack.Screen name="recommendations" options={{ title: "Bugün Nereye Gitsem?" }} /><Stack.Screen name="spot/[id]" options={{ title: "Mera" }} /><Stack.Screen name="spot/new" options={{ title: "Mera Ekle", presentation: "modal" }} /><Stack.Screen name="compass" options={{ title: "Pusula" }} /><Stack.Screen name="catch/new" options={{ title: "Avı Kaydet", presentation: "modal" }} /><Stack.Screen name="privacy" options={{ title: "Gizlilik ve Veriler" }} /></Stack></AppStateProvider></SafeAreaProvider>;
}
