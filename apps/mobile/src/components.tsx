import { stalenessLabelTr } from "@mera/domain";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type PressableProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "./theme";

export function Screen({ children }: React.PropsWithChildren) {
  return <SafeAreaView edges={["bottom"]} style={styles.screen}>{children}</SafeAreaView>;
}

export function Button({ title, variant = "primary", ...props }: PressableProps & { title: string; variant?: "primary" | "secondary" | "danger" }) {
  return <Pressable accessibilityRole="button" style={({ pressed }) => [styles.button, variant === "secondary" && styles.buttonSecondary, variant === "danger" && styles.buttonDanger, pressed && { opacity: 0.75 }]} {...props}><Text style={[styles.buttonText, variant === "secondary" && styles.buttonSecondaryText]}>{title}</Text></Pressable>;
}

export function Card({ children }: React.PropsWithChildren) { return <View style={styles.card}>{children}</View>; }
export function Title({ children }: React.PropsWithChildren) { return <Text style={styles.title}>{children}</Text>; }
export function Label({ children }: React.PropsWithChildren) { return <Text style={styles.label}>{children}</Text>; }

export function OfflineBanner({ connected, lastSyncAt }: { connected: boolean; lastSyncAt: string | null }) {
  if (connected && !lastSyncAt) return null;
  return <View style={[styles.banner, !connected && styles.offlineBanner]}><Text style={[styles.bannerText, !connected && styles.offlineBannerText]}>{connected ? `Son senkronizasyon: ${stalenessLabelTr(lastSyncAt ?? undefined)}` : `Çevrimdışı · ${lastSyncAt ? stalenessLabelTr(lastSyncAt) : "Seed verisi kullanılıyor"}`}</Text></View>;
}

export function Loading() { return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.muted}>Yerel veriler hazırlanıyor…</Text></View>; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, backgroundColor: colors.bg },
  muted: { color: colors.muted, fontSize: 15 },
  button: { minHeight: 52, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  buttonSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  buttonDanger: { backgroundColor: colors.danger },
  buttonText: { color: colors.white, fontWeight: "800", fontSize: 16, letterSpacing: 0.2 },
  buttonSecondaryText: { color: colors.ink },
  card: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm },
  title: { color: colors.ink, fontSize: 28, lineHeight: 34, fontWeight: "900" },
  label: { color: colors.muted, fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.7 },
  banner: { backgroundColor: colors.banner, paddingHorizontal: spacing.md, paddingVertical: 8 },
  offlineBanner: { backgroundColor: colors.offline },
  offlineBannerText: { color: colors.white },
  bannerText: { color: colors.ink, textAlign: "center", fontWeight: "700", fontSize: 13 },
});
