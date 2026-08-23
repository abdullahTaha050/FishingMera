import { Link, router } from "expo-router";
import { useEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SPECIES } from "@mera/config";
import { Button, Card, Label, Loading, OfflineBanner, Screen, Title } from "@/components";
import { verificationText } from "@/labels";
import { useAppState } from "@/store";
import { colors, spacing } from "@/theme";

export default function HomeScreen() {
  const state = useAppState();
  useEffect(() => { if (state.ready && !state.gear) router.replace("/onboarding"); }, [state.ready, state.gear]);
  if (!state.ready) return <Loading />;
  const nearby = state.spots.filter((spot) => spot.prohibitedStatus !== "SECURITY_AREA").slice(0, 3);
  const targetName = SPECIES.find((species) => species.id === state.targetSpecies)?.nameTr ?? state.targetSpecies;
  return <Screen><OfflineBanner connected={state.isConnected} lastSyncAt={state.lastSyncAt} /><ScrollView contentContainerStyle={styles.content}>
    <View><Label>Konum</Label><Title>Hendek çevresi</Title><Text style={styles.subtle}>GPS öneri sırasında güncellenir</Text></View>
    <Card><View style={styles.row}><View><Label>Hedef</Label><Text style={styles.value}>{targetName}</Text></View><View><Label>Takım</Label><Text style={styles.value}>{state.gear ? `${state.gear.rodLengthCm ?? "?"} cm / ${state.gear.castingWeightMinG ?? "?"}–${state.gear.castingWeightMaxG ?? "?"} g` : "Henüz yok"}</Text></View></View></Card>
    <Button title="BUGÜN NEREYE GİTSEM?" onPress={() => router.push("/recommendations")} />
    <View style={styles.section}><Text style={styles.sectionTitle}>Yakındaki başlangıç meraları</Text>{nearby.map((spot) => <Link key={spot.id} href={{ pathname: "/spot/[id]", params: { id: spot.id } }} asChild><Card><Text style={styles.spotName}>{spot.canonicalName}</Text><Text style={styles.subtle}>{spot.district} · {verificationText[spot.verificationStatus]}</Text></Card></Link>)}</View>
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({ content: { padding: spacing.md, gap: spacing.md, paddingBottom: 80 }, subtle: { color: colors.muted, fontSize: 14 }, value: { color: colors.ink, fontSize: 18, fontWeight: "800", marginTop: 4 }, row: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md }, section: { gap: spacing.sm, marginTop: spacing.sm }, sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: "900" }, spotName: { color: colors.ink, fontSize: 17, fontWeight: "800" } });
