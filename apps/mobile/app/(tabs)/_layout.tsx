import { Tabs } from "expo-router";
import { MeraBottomNavigation, type MeraTabKey } from "@/mera-tab-bar";

export default function TabsLayout() {
  return <Tabs tabBar={({ state, navigation }) => <MeraBottomNavigation activeKey={state.routes[state.index]?.name as MeraTabKey} onNavigate={(key) => navigation.navigate(key)} />} screenOptions={{ headerShown: false }}>
    <Tabs.Screen name="index" options={{ title: "Bugün" }} />
    <Tabs.Screen name="map" options={{ title: "Keşfet" }} />
    <Tabs.Screen name="saved" options={{ title: "Kaydedilenler" }} />
    <Tabs.Screen name="catches" options={{ title: "Avlarım" }} />
    <Tabs.Screen name="profile" options={{ title: "Profil" }} />
  </Tabs>;
}
