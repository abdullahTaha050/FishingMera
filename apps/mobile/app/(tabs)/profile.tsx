import type { ExperienceLevel, SpeciesId } from "@mera/types";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SPECIES } from "@mera/config";
import { Button, Card, Label, Loading, Screen } from "@/components";
import { runSync } from "@/sync";
import { useAppState } from "@/store";
import { colors, spacing } from "@/theme";

const experienceLabels: Record<ExperienceLevel, string> = { FIRST_TIME: "İlk defa", BEGINNER: "Acemi", INTERMEDIATE: "Orta", EXPERIENCED: "Deneyimli" };
export default function ProfileScreen() {
  const state = useAppState(); if (!state.ready) return <Loading />;
  return <Screen><ScrollView contentContainerStyle={styles.content}><Card><Label>Deneyim</Label><View style={styles.wrap}>{(Object.keys(experienceLabels) as ExperienceLevel[]).map((item) => <Button key={item} title={experienceLabels[item]} variant={state.experience === item ? "primary" : "secondary"} onPress={() => state.updatePreference("experience", item)} />)}</View></Card>
    <Card><Label>Hedef balık</Label><View style={styles.wrap}>{SPECIES.map((item) => <Button key={item.id} title={item.nameTr} variant={state.targetSpecies === item.id ? "primary" : "secondary"} onPress={() => state.updatePreference("target_species", item.id)} />)}</View></Card>
    <Card><Label>Maksimum kuş uçuşu yarıçap</Label><View style={styles.wrap}>{[25, 50, 100, 150].map((item) => <Button key={item} title={`${item} km`} variant={state.maxDistanceKm === item ? "primary" : "secondary"} onPress={() => state.updatePreference("max_distance_km", String(item))} />)}</View></Card>
    <Card><Label>Takım</Label><Text style={styles.value}>{state.gear?.name ?? "Yok"}</Text><Text style={styles.subtle}>{state.gear ? `${state.gear.rodLengthCm ?? "?"} cm · ${state.gear.castingWeightMinG ?? "?"}–${state.gear.castingWeightMaxG ?? "?"} g · ${state.gear.reelSize ?? "?"}` : ""}</Text><Button title="Takımı yeniden ayarla" variant="secondary" onPress={() => router.push("/onboarding")} /></Card>
    <Card><Label>Senkronizasyon</Label><Text style={styles.subtle}>Guest modunda temel özellikler ve yerel kayıtlar hesap olmadan çalışır. Cloud sync için backend ortamı ve anonim/OTP oturumu gerekir.</Text><Button title="Şimdi senkronize et" variant="secondary" onPress={async () => { if (state.db) { await runSync(state.db); await state.reload(); } }} /></Card>
  </ScrollView></Screen>;
}
const styles = StyleSheet.create({ content: { padding: spacing.md, gap: spacing.md, paddingBottom: 80 }, wrap: { gap: spacing.sm }, value: { color: colors.ink, fontSize: 18, fontWeight: "900" }, subtle: { color: colors.muted, lineHeight: 20 } });

