import { Tabs } from "expo-router";
import { colors } from "@/theme";

export default function TabsLayout() {
  return <Tabs screenOptions={{ tabBarActiveTintColor: colors.primaryDark, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 64, paddingBottom: 8 }, headerStyle: { backgroundColor: colors.bg }, headerShadowVisible: false, headerTitleStyle: { color: colors.ink, fontWeight: "800" } }}>
    <Tabs.Screen name="index" options={{ title: "Ana Sayfa", tabBarLabel: "Ana Sayfa" }} />
    <Tabs.Screen name="map" options={{ title: "Harita", tabBarLabel: "Harita" }} />
    <Tabs.Screen name="saved" options={{ title: "Kaydedilenler", tabBarLabel: "Kaydedilenler" }} />
    <Tabs.Screen name="catches" options={{ title: "Avlarım", tabBarLabel: "Avlarım" }} />
    <Tabs.Screen name="profile" options={{ title: "Profil", tabBarLabel: "Profil" }} />
  </Tabs>;
}

