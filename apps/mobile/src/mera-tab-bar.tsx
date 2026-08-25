import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type MeraTabKey = "index" | "map" | "saved" | "catches" | "profile";
type IconName = ComponentProps<typeof Ionicons>["name"];

export const meraTabs: ReadonlyArray<{ key: MeraTabKey; label: string; activeIcon: IconName; icon: IconName }> = [
  { key: "index", label: "Bugün", activeIcon: "calendar", icon: "calendar-outline" },
  { key: "map", label: "Keşfet", activeIcon: "search", icon: "search-outline" },
  { key: "saved", label: "Kaydedilenler", activeIcon: "bookmark", icon: "bookmark-outline" },
  { key: "catches", label: "Avlarım", activeIcon: "fish", icon: "fish-outline" },
  { key: "profile", label: "Profil", activeIcon: "person", icon: "person-outline" }
];

export function MeraBottomNavigation({ activeKey, onNavigate, includeSafeArea = true }: { activeKey?: MeraTabKey; onNavigate: (key: MeraTabKey) => void; includeSafeArea?: boolean }) {
  const insets = useSafeAreaInsets();
  const bottomPadding = includeSafeArea ? Math.max(insets.bottom, 8) : 8;

  return <View style={[styles.bar, { paddingBottom: bottomPadding }]}>
    {meraTabs.map((tab) => {
      const active = tab.key === activeKey;
      return <Pressable key={tab.key} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={tab.label} onPress={() => onNavigate(tab.key)} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
        <Ionicons name={active ? tab.activeIcon : tab.icon} size={25} color={active ? NAVY : NEUTRAL} />
        <Text numberOfLines={1} style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
      </Pressable>;
    })}
  </View>;
}

const NAVY = "#0B2440";
const NEUTRAL = "#6B7788";

const styles = StyleSheet.create({
  bar: { minHeight: 74, flexDirection: "row", alignItems: "flex-start", paddingTop: 10, borderTopWidth: 1, borderTopColor: "#DDE5E7", backgroundColor: "#FFFFFF" },
  item: { flex: 1, minWidth: 0, minHeight: 54, alignItems: "center", justifyContent: "center", gap: 4 },
  pressed: { opacity: 0.68 },
  label: { maxWidth: "100%", color: NEUTRAL, fontSize: 10, lineHeight: 13, fontWeight: "500", letterSpacing: -0.2 },
  labelActive: { color: NAVY, fontWeight: "700" }
});
