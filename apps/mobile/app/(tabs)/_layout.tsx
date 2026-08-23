import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";
import { colors } from "@/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

function tabIcon(filled: IconName, outline: IconName) {
  return function TabIcon({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) {
    return <Ionicons color={color} name={focused ? filled : outline} size={size} />;
  };
}

export default function TabsLayout() {
  return <Tabs screenOptions={{ tabBarActiveTintColor: colors.primaryDark, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 64, paddingBottom: 8 }, headerStyle: { backgroundColor: colors.bg }, headerShadowVisible: false, headerTitleStyle: { color: colors.ink, fontWeight: "800" } }}>
    <Tabs.Screen name="index" options={{ title: "Ana Sayfa", tabBarLabel: "Ana Sayfa", tabBarIcon: tabIcon("home", "home-outline") }} />
    <Tabs.Screen name="map" options={{ title: "Harita", tabBarLabel: "Harita", tabBarIcon: tabIcon("map", "map-outline") }} />
    <Tabs.Screen name="saved" options={{ title: "Kaydedilenler", tabBarLabel: "Kaydedilenler", tabBarIcon: tabIcon("bookmark", "bookmark-outline") }} />
    <Tabs.Screen name="catches" options={{ title: "Avlarım", tabBarLabel: "Avlarım", tabBarIcon: tabIcon("fish", "fish-outline") }} />
    <Tabs.Screen name="profile" options={{ title: "Profil", tabBarLabel: "Profil", tabBarIcon: tabIcon("person", "person-outline") }} />
  </Tabs>;
}
