import type { PublicationLevel } from "@mera/types";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Button, Card, Label, Screen, Title } from "@/components";
import { saveUserSpot } from "@/db";
import { useCurrentLocation } from "@/location";
import { useAppState } from "@/store";
import { colors, spacing } from "@/theme";

const publicationOptions: [PublicationLevel, string, string][] = [
  ["PRIVATE", "Özel", "Kesin konum yalnızca hesabında kalır."],
  ["APPROXIMATE", "Yaklaşık paylaş", "Sunucu genel görünümde yaklaşık 1–1,5 km belirsizlik uygular."],
  ["PUBLIC", "Açık paylaş", "Kesin koordinat topluluğa gösterilir."]
];

export default function NewSpotScreen() {
  const state = useAppState();
  const location = useCurrentLocation();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [publicationLevel, setPublicationLevel] = useState<PublicationLevel>("PRIVATE");
  async function save() {
    if (!state.db || !location.coordinates) return Alert.alert("Konum gerekli", "Önce bulunduğun konumu güvenli GPS kaydı olarak al.");
    if (name.trim().length < 2) return Alert.alert("Mera adı gerekli");
    const id = await saveUserSpot(state.db, { canonicalName: name, latitude: location.coordinates.latitude, longitude: location.coordinates.longitude, publicationLevel, targetSpecies: [state.targetSpecies], coastlineType: "UNKNOWN", accessType: "UNKNOWN", note });
    await state.reload();
    router.replace({ pathname: "/spot/[id]", params: { id } });
  }
  return <Screen><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Title>Kendi meranı kaydet</Title><Text style={styles.subtle}>Kayıt internet olmadan yapılır. Varsayılan “Özel” seçim kesin koordinatını topluluğa açmaz.</Text>
    <Card><Label>Konum</Label><Text style={styles.value}>{location.coordinates ? `GPS alındı · doğruluk ±${Math.round(location.accuracy ?? 0)} m` : "Henüz alınmadı"}</Text><Button title={location.loading ? "Konum alınıyor…" : "Şu anki konumumu kullan"} variant="secondary" disabled={location.loading} onPress={location.request} /></Card>
    <Card><Label>Mera adı</Label><TextInput style={styles.input} value={name} onChangeText={setName} maxLength={160} placeholder="Örn. dere ağzının doğusu" placeholderTextColor={colors.muted} /><Label>Not / arazi bilgisi</Label><TextInput style={[styles.input, styles.multiline]} value={note} onChangeText={setNote} maxLength={500} multiline placeholder="Erişim, zemin ve tehlike notları" placeholderTextColor={colors.muted} /></Card>
    <Card><Label>Gizlilik</Label>{publicationOptions.map(([value, title, description]) => <Pressable key={value} onPress={() => setPublicationLevel(value)} style={[styles.option, publicationLevel === value && styles.optionActive]}><View style={styles.radio}>{publicationLevel === value && <View style={styles.radioDot} />}</View><View style={{ flex: 1 }}><Text style={styles.optionTitle}>{title}</Text><Text style={styles.subtle}>{description}</Text></View></Pressable>)}</Card>
    <Card><Text style={styles.warning}>“Açık paylaş” seçilse bile kayıt topluluk kaydıdır; otomatik olarak doğrulanmış sayılmaz. Yasak, özel mülk ve güvenlik alanlarını paylaşma.</Text></Card>
    <Button title="Cihazda kaydet" onPress={save} />
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({ content: { padding: spacing.md, gap: spacing.md, paddingBottom: 80 }, subtle: { color: colors.muted, lineHeight: 20 }, value: { color: colors.ink, fontSize: 16, fontWeight: "800" }, input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, backgroundColor: colors.surface, color: colors.ink, fontSize: 16 }, multiline: { minHeight: 100, paddingTop: 12, textAlignVertical: "top" }, option: { flexDirection: "row", gap: spacing.sm, padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 12 }, optionActive: { borderColor: colors.primary, borderWidth: 2 }, optionTitle: { color: colors.ink, fontWeight: "900", fontSize: 16 }, radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.primary, alignItems: "center", justifyContent: "center" }, radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }, warning: { color: colors.warning, fontWeight: "700", lineHeight: 21 } });
