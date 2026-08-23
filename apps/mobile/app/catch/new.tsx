import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, TextInput } from "react-native";
import { Button, Card, Label, Screen } from "@/components";
import { saveCatchReport } from "@/db";
import { useAppState } from "@/store";
import { colors, spacing } from "@/theme";

export default function NewCatchScreen() {
  const state = useAppState(); const [quantity, setQuantity] = useState(""); const [note, setNote] = useState(""); const [result, setResult] = useState<"NONE" | "LOW" | "MEDIUM" | "GOOD">("NONE");
  async function save() { if (!state.db) return; await saveCatchReport(state.db, { startedAt: new Date().toISOString(), targetSpecies: state.targetSpecies, caughtSpecies: [], quantity: quantity ? Number(quantity) : 0, result, gearProfileId: state.gear?.id ?? null, note }); Alert.alert("Cihaza kaydedildi", state.isConnected ? "Senkronizasyon kuyruğuna eklendi." : "İnternet gelince otomatik gönderilecek."); router.back(); }
  return <Screen><ScrollView contentContainerStyle={styles.content}><Card><Label>Sonuç</Label>{(["NONE", "LOW", "MEDIUM", "GOOD"] as const).map((value) => <Button key={value} title={({ NONE: "Yok", LOW: "Az", MEDIUM: "Orta", GOOD: "İyi" } as const)[value]} variant={result === value ? "primary" : "secondary"} onPress={() => setResult(value)} />)}<Label>Adet</Label><TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholder="0" /><Label>Not</Label><TextInput style={[styles.input, { minHeight: 100 }]} value={note} onChangeText={setNote} multiline placeholder="Yem, çapari, gramaj, saat…" /></Card><Button title="Çevrimdışı kaydet" onPress={save} /></ScrollView></Screen>;
}
const styles = StyleSheet.create({ content: { padding: spacing.md, gap: spacing.md }, input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.white, padding: 12, color: colors.ink } });

