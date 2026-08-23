import type { ExperienceLevel, FishingType, GearProfile } from "@mera/types";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Button, Card, Label, Screen, Title } from "@/components";
import { saveGear, setSetting } from "@/db";
import { useAppState } from "@/store";
import { colors, spacing } from "@/theme";

const experiences: [ExperienceLevel, string][] = [["FIRST_TIME", "İlk defa"], ["BEGINNER", "Acemi"], ["INTERMEDIATE", "Orta"], ["EXPERIENCED", "Deneyimli"]];
const fishingTypes: [FishingType, string][] = [["SHORE", "Kıyı"], ["BOAT", "Tekne"], ["FRESHWATER", "Tatlı su"]];
const rodTypes: [NonNullable<GearProfile["rodType"]>, string][] = [["SPIN", "Spin"], ["SURF", "Surf"], ["TELESCOPIC", "Teleskopik"], ["OTHER", "Diğer"], ["UNKNOWN", "Bilmiyorum"]];
const lineTypes: [NonNullable<GearProfile["mainLine"]>, string][] = [["BRAID", "Örgü"], ["MONO", "Mono"], ["FLUOROCARBON", "Fluorocarbon"], ["OTHER", "Diğer"], ["UNKNOWN", "Bilmiyorum"]];

export default function OnboardingScreen() {
  const state = useAppState();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [experience, setExperience] = useState<ExperienceLevel>("BEGINNER");
  const [fishingType, setFishingType] = useState<FishingType>("SHORE");
  const [name, setName] = useState("Alesta Spin");
  const [length, setLength] = useState("270"); const [min, setMin] = useState("10"); const [max, setMax] = useState("30"); const [reel, setReel] = useState("3000");
  const [rodType, setRodType] = useState<NonNullable<GearProfile["rodType"]>>("SPIN"); const [mainLine, setMainLine] = useState<NonNullable<GearProfile["mainLine"]>>("UNKNOWN"); const [lineDiameter, setLineDiameter] = useState(""); const [peRating, setPeRating] = useState("");
  async function save() {
    if (!state.db) return;
    const numericValues = [length, min, max, reel, lineDiameter, peRating].filter(Boolean).map(Number);
    if (numericValues.some((value) => !Number.isFinite(value) || value <= 0)) return Alert.alert("Takım ölçülerini kontrol et", "Girilen sayılar sıfırdan büyük olmalı; bilmediğin alanı boş bırakabilirsin.");
    const gear: GearProfile = { id: globalThis.crypto.randomUUID(), name: name.trim() || "Takımım", rodType, rodLengthCm: length ? Number(length) : undefined, castingWeightMinG: min ? Number(min) : undefined, castingWeightMaxG: max ? Number(max) : undefined, reelSize: reel ? Number(reel) : undefined, mainLine, lineDiameterMm: lineDiameter ? Number(lineDiameter) : undefined, peRating: peRating ? Number(peRating) : undefined };
    if (gear.castingWeightMinG && gear.castingWeightMaxG && gear.castingWeightMinG > gear.castingWeightMaxG) return Alert.alert("Atar aralığını kontrol et");
    await saveGear(state.db, gear);
    if (mode !== "gear") { await setSetting(state.db, "experience", experience); await setSetting(state.db, "fishing_type", fishingType); await setSetting(state.db, "target_species", "ISTAVRIT"); await setSetting(state.db, "max_distance_km", "100"); }
    await state.reload(); if (mode === "gear") router.back(); else router.replace("/(tabs)");
  }
  return <Screen><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Title>Önce seni ve takımını tanıyalım</Title><Text style={styles.subtle}>Bilmediğin alanı boş bırakabilirsin.</Text>
    {mode !== "gear" && <><Card><Label>Deneyim</Label><View style={styles.wrap}>{experiences.map(([value, label]) => <Pressable key={value} onPress={() => setExperience(value)} style={[styles.chip, experience === value && styles.chipActive]}><Text style={[styles.chipText, experience === value && styles.chipTextActive]}>{label}</Text></Pressable>)}</View></Card><Card><Label>Av tipi</Label><View style={styles.wrap}>{fishingTypes.map(([value, label]) => <Pressable key={value} onPress={() => setFishingType(value)} style={[styles.chip, fishingType === value && styles.chipActive]}><Text style={[styles.chipText, fishingType === value && styles.chipTextActive]}>{label}</Text></Pressable>)}</View><Text style={styles.subtle}>İlk MVP kıyı avına odaklanır.</Text></Card></>}
    <Card><Label>Takım adı</Label><TextInput style={styles.input} value={name} onChangeText={setName} placeholder="İstavrit takımım" placeholderTextColor={colors.muted} /><Label>Kamış tipi</Label><View style={styles.wrap}>{rodTypes.map(([value, label]) => <Pressable key={value} onPress={() => setRodType(value)} style={[styles.chip, rodType === value && styles.chipActive]}><Text style={[styles.chipText, rodType === value && styles.chipTextActive]}>{label}</Text></Pressable>)}</View><View style={styles.row}><Field label="Uzunluk cm" value={length} onChange={setLength} /><Field label="Atar min g" value={min} onChange={setMin} /><Field label="Atar max g" value={max} onChange={setMax} /></View><Field label="Makine (bilmiyorsan boş)" value={reel} onChange={setReel} /><Label>Ana misina</Label><View style={styles.wrap}>{lineTypes.map(([value, label]) => <Pressable key={value} onPress={() => setMainLine(value)} style={[styles.chip, mainLine === value && styles.chipActive]}><Text style={[styles.chipText, mainLine === value && styles.chipTextActive]}>{label}</Text></Pressable>)}</View><View style={styles.row}><Field label="Çap mm" value={lineDiameter} onChange={setLineDiameter} /><Field label="PE" value={peRating} onChange={setPeRating} /></View></Card>
    <Button title={mode === "gear" ? "Takımı kaydet" : "Başla"} onPress={save} /></ScrollView></Screen>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <View style={{ flex: 1, gap: 6 }}><Text style={styles.fieldLabel}>{label}</Text><TextInput style={styles.input} value={value} onChangeText={onChange} keyboardType="numeric" placeholder="Bilmiyorum" placeholderTextColor={colors.muted} /></View>; }
const styles = StyleSheet.create({ content: { padding: spacing.md, gap: spacing.md }, subtle: { color: colors.muted, fontSize: 15 }, wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, chip: { minHeight: 46, paddingHorizontal: 15, alignItems: "center", justifyContent: "center", backgroundColor: colors.soft, borderRadius: 12 }, chipActive: { backgroundColor: colors.moss }, chipText: { color: colors.ink, fontWeight: "700" }, chipTextActive: { color: colors.white }, input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, backgroundColor: colors.surface, color: colors.ink, fontSize: 16 }, row: { flexDirection: "row", gap: spacing.sm }, fieldLabel: { color: colors.muted, fontWeight: "700", fontSize: 12 } });
