import type { ExperienceLevel, GearProfile } from "@mera/types";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Button, Card, Label, Screen, Title } from "@/components";
import { saveGear, setSetting } from "@/db";
import { useAppState } from "@/store";
import { colors, spacing } from "@/theme";

const experiences: [ExperienceLevel, string][] = [["FIRST_TIME", "İlk defa"], ["BEGINNER", "Acemi"], ["INTERMEDIATE", "Orta"], ["EXPERIENCED", "Deneyimli"]];

export default function OnboardingScreen() {
  const state = useAppState();
  const [experience, setExperience] = useState<ExperienceLevel>("BEGINNER");
  const [name, setName] = useState("Alesta Spin");
  const [length, setLength] = useState("270"); const [min, setMin] = useState("10"); const [max, setMax] = useState("30"); const [reel, setReel] = useState("3000");
  async function save() {
    if (!state.db) return;
    const gear: GearProfile = { id: globalThis.crypto.randomUUID(), name: name.trim() || "Takımım", rodType: "SPIN", rodLengthCm: length ? Number(length) : undefined, castingWeightMinG: min ? Number(min) : undefined, castingWeightMaxG: max ? Number(max) : undefined, reelSize: reel ? Number(reel) : undefined, mainLine: "UNKNOWN" };
    if (gear.castingWeightMinG && gear.castingWeightMaxG && gear.castingWeightMinG > gear.castingWeightMaxG) return Alert.alert("Atar aralığını kontrol et");
    await saveGear(state.db, gear); await setSetting(state.db, "experience", experience); await setSetting(state.db, "target_species", "ISTAVRIT"); await setSetting(state.db, "max_distance_km", "100"); await state.reload(); router.replace("/(tabs)");
  }
  return <Screen><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Title>Önce seni ve takımını tanıyalım</Title><Text style={styles.subtle}>Bilmediğin alanı boş bırakabilirsin.</Text>
    <Card><Label>Deneyim</Label><View style={styles.wrap}>{experiences.map(([value, label]) => <Pressable key={value} onPress={() => setExperience(value)} style={[styles.chip, experience === value && styles.chipActive]}><Text style={[styles.chipText, experience === value && styles.chipTextActive]}>{label}</Text></Pressable>)}</View></Card>
    <Card><Label>Takım adı</Label><TextInput style={styles.input} value={name} onChangeText={setName} placeholder="İstavrit takımım" placeholderTextColor={colors.muted} /><Label>Kamış</Label><View style={styles.row}><Field label="Uzunluk cm" value={length} onChange={setLength} /><Field label="Atar min g" value={min} onChange={setMin} /><Field label="Atar max g" value={max} onChange={setMax} /></View><Field label="Makine (bilmiyorsan boş)" value={reel} onChange={setReel} /></Card>
    <Button title="Başla" onPress={save} /></ScrollView></Screen>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <View style={{ flex: 1, gap: 6 }}><Text style={styles.fieldLabel}>{label}</Text><TextInput style={styles.input} value={value} onChangeText={onChange} keyboardType="numeric" placeholder="Bilmiyorum" placeholderTextColor={colors.muted} /></View>; }
const styles = StyleSheet.create({ content: { padding: spacing.md, gap: spacing.md }, subtle: { color: colors.muted, fontSize: 15 }, wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, chip: { minHeight: 46, paddingHorizontal: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#ECEBE3", borderRadius: 12 }, chipActive: { backgroundColor: colors.moss }, chipText: { color: colors.ink, fontWeight: "700" }, chipTextActive: { color: colors.white }, input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, backgroundColor: colors.white, color: colors.ink, fontSize: 16 }, row: { flexDirection: "row", gap: spacing.sm }, fieldLabel: { color: colors.muted, fontWeight: "700", fontSize: 12 } });
