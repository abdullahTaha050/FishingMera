import { router } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";
import { Button, Card, Loading, Screen } from "@/components";
import { useAppState } from "@/store";
import { colors, spacing } from "@/theme";

export default function SavedScreen() {
  const state = useAppState(); if (!state.ready) return <Loading />;
  const spots = state.spots.filter((spot) => state.favoriteIds.includes(spot.id));
  return <Screen><ScrollView contentContainerStyle={styles.content}>{spots.length === 0 && <Card><Text style={styles.title}>Henüz kaydedilen mera yok</Text><Text style={styles.subtle}>Mera detayından favoriye eklediğin noktalar internetsiz de burada kalır.</Text></Card>}{spots.map((spot) => <Card key={spot.id}><Text style={styles.title}>{spot.canonicalName}</Text><Text style={styles.subtle}>{spot.district} · {spot.verificationStatus}</Text><Button title="Detay" variant="secondary" onPress={() => router.push({ pathname: "/spot/[id]", params: { id: spot.id } })} /></Card>)}</ScrollView></Screen>;
}
const styles = StyleSheet.create({ content: { padding: spacing.md, gap: spacing.md }, title: { color: colors.ink, fontSize: 18, fontWeight: "900" }, subtle: { color: colors.muted, lineHeight: 20 } });

