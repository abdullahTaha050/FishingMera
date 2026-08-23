import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SPECIES } from "@mera/config";
import type { SpeciesId } from "@mera/types";
import { Button, Card, Label, Screen } from "@/components";
import { accountStatus } from "@/auth";
import { saveCatchReport } from "@/db";
import { pickLocalPhoto, recoverPendingLocalPhoto, type LocalPhoto } from "@/photos";
import { useAppState } from "@/store";
import { colors, spacing } from "@/theme";

export default function NewCatchScreen() {
  const state = useAppState(); const [quantity, setQuantity] = useState(""); const [note, setNote] = useState(""); const [result, setResult] = useState<"NONE" | "LOW" | "MEDIUM" | "GOOD">("NONE");
  const [spotId, setSpotId] = useState<string | null>(null); const [caughtSpecies, setCaughtSpecies] = useState<SpeciesId | null>(null); const [lengthCm, setLengthCm] = useState(""); const [baitOrLure, setBaitOrLure] = useState(""); const [lureWeightG, setLureWeightG] = useState(""); const [startedAt, setStartedAt] = useState(new Date().toISOString()); const [endedAt, setEndedAt] = useState<string | null>(null); const [photos, setPhotos] = useState<LocalPhoto[]>([]); const [sharePublicly, setSharePublicly] = useState(false);
  useEffect(() => { void recoverPendingLocalPhoto().then((photo) => { if (photo) setPhotos((current) => [...current, photo].slice(0, 3)); }); }, []);
  async function addPhoto(source: "camera" | "library") { try { const photo = await pickLocalPhoto(source); if (photo) setPhotos((current) => [...current, photo].slice(0, 3)); } catch (error) { Alert.alert("Fotoğraf eklenemedi", error instanceof Error && error.message === "PHOTO_TOO_LARGE" ? "Fotoğraf 15 MB sınırını aşıyor." : "İzinleri ve depolama alanını kontrol et."); } }
  async function save() {
    if (!state.db) return;
    const quantityNumber = quantity ? Number(quantity) : 0;
    const lengthNumber = lengthCm ? Number(lengthCm) : undefined;
    const lureWeightNumber = lureWeightG ? Number(lureWeightG) : undefined;
    if (!Number.isInteger(quantityNumber) || quantityNumber < 0) return Alert.alert("Adet tam sayı olmalı");
    if (lengthNumber !== undefined && (!Number.isFinite(lengthNumber) || lengthNumber <= 0 || lengthNumber > 1000)) return Alert.alert("Yaklaşık boyu kontrol et");
    if (lureWeightNumber !== undefined && (!Number.isFinite(lureWeightNumber) || lureWeightNumber <= 0 || lureWeightNumber > 5000)) return Alert.alert("Gramajı kontrol et");
    if (endedAt && new Date(endedAt).getTime() < new Date(startedAt).getTime()) return Alert.alert("Bitiş zamanı başlangıçtan önce olamaz");
    if (sharePublicly) {
      const account = await accountStatus();
      if (!account.configured || account.isAnonymous) return Alert.alert("Kalıcı hesap gerekli", "Herkese açık rapor için Profil ekranında e-posta koduyla hesabını yükselt. Özel rapor çevrimdışı kaydedilebilir.");
    }
    await saveCatchReport(state.db, { startedAt, endedAt: endedAt ?? new Date().toISOString(), targetSpecies: state.targetSpecies, caughtSpecies: caughtSpecies ? [{ speciesId: caughtSpecies, quantity: quantityNumber, approximateLengthCm: lengthNumber }] : [], quantity: quantityNumber, approximateLengthCm: lengthNumber, result, gearProfileId: state.gear?.id ?? null, baitOrLure: baitOrLure.trim() || undefined, lureWeightG: lureWeightNumber, spotId, photos, sharePublicly, note });
    Alert.alert("Cihaza kaydedildi", state.isConnected ? "Rapor ve fotoğraflar senkronizasyon kuyruğuna eklendi." : "İnternet gelince fotoğraflarla birlikte otomatik gönderilecek."); router.back();
  }
  return <Screen><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Card><Label>Zaman</Label><Text style={styles.value}>Başlangıç: {new Date(startedAt).toLocaleString("tr-TR")}</Text><View style={styles.row}><Button title="Şimdi başlat" variant="secondary" onPress={() => setStartedAt(new Date().toISOString())} /><Button title="Şimdi bitir" variant="secondary" onPress={() => setEndedAt(new Date().toISOString())} /></View><Text style={styles.subtle}>{endedAt ? `Bitiş: ${new Date(endedAt).toLocaleString("tr-TR")}` : "Bitiş kaydederken şimdi olarak alınır."}</Text></Card>
    <Card><Label>Mera</Label><View style={styles.wrap}><Button title="Mera seçilmedi" variant={spotId === null ? "primary" : "secondary"} onPress={() => setSpotId(null)} />{state.spots.slice(0, 12).map((spot) => <Button key={spot.id} title={spot.canonicalName} variant={spotId === spot.id ? "primary" : "secondary"} onPress={() => setSpotId(spot.id)} />)}</View></Card>
    <Card><Label>Sonuç</Label><View style={styles.wrap}>{(["NONE", "LOW", "MEDIUM", "GOOD"] as const).map((value) => <Button key={value} title={({ NONE: "Yok", LOW: "Az", MEDIUM: "Orta", GOOD: "İyi" } as const)[value]} variant={result === value ? "primary" : "secondary"} onPress={() => setResult(value)} />)}</View><Label>Yakalanan tür</Label><View style={styles.wrap}><Button title="Yok" variant={caughtSpecies === null ? "primary" : "secondary"} onPress={() => setCaughtSpecies(null)} />{SPECIES.map((species) => <Button key={species.id} title={species.nameTr} variant={caughtSpecies === species.id ? "primary" : "secondary"} onPress={() => setCaughtSpecies(species.id)} />)}</View><View style={styles.row}><Field label="Adet" value={quantity} onChange={setQuantity} /><Field label="Yaklaşık boy cm" value={lengthCm} onChange={setLengthCm} /></View></Card>
    <Card><Label>Kullanılan takım</Label><Text style={styles.value}>{state.gear?.name ?? "Takım seçilmedi"}</Text><TextInput style={styles.input} value={baitOrLure} onChangeText={setBaitOrLure} placeholder="Yem / sahte / çapari" placeholderTextColor={colors.muted} /><TextInput style={styles.input} value={lureWeightG} onChangeText={setLureWeightG} keyboardType="decimal-pad" placeholder="Kurşun / jig gramajı" placeholderTextColor={colors.muted} /></Card>
    <Card><Label>Fotoğraflar · en fazla 3</Label><View style={styles.photoRow}>{photos.map((photo) => <View key={photo.id}><Image source={{ uri: photo.uri }} style={styles.photo} /><Text style={styles.photoState}>Cihazda</Text></View>)}</View><View style={styles.row}><Button title="Kamerayı aç" variant="secondary" onPress={() => addPhoto("camera")} /><Button title="Galeriden seç" variant="secondary" onPress={() => addPhoto("library")} /></View><Text style={styles.subtle}>Fotoğraf yeniden kodlanarak EXIF konum bilgisi çıkarılır ve kalıcı uygulama klasöründe kuyruğa alınır.</Text></Card>
    <Card><Label>Gizlilik</Label><View style={styles.wrap}><Button title="Yalnızca benim" variant={!sharePublicly ? "primary" : "secondary"} onPress={() => setSharePublicly(false)} /><Button title="Toplulukla paylaş" variant={sharePublicly ? "primary" : "secondary"} onPress={() => setSharePublicly(true)} /></View><Text style={styles.subtle}>Herkese açık rapor kalıcı hesap gerektirir. Fotoğraflar yine özel depoda tutulur.</Text></Card>
    <Card><Label>Not</Label><TextInput style={[styles.input, styles.multiline]} value={note} onChangeText={setNote} multiline maxLength={5000} placeholder="Koşullar ve gözlemler" placeholderTextColor={colors.muted} /></Card><Button title="Çevrimdışı kaydet" onPress={save} /></ScrollView></Screen>;
}
function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <View style={{ flex: 1, gap: spacing.xs }}><Text style={styles.subtle}>{label}</Text><TextInput style={styles.input} value={value} onChangeText={onChange} keyboardType="decimal-pad" placeholder="Bilinmiyor" placeholderTextColor={colors.muted} /></View>; }
const styles = StyleSheet.create({ content: { padding: spacing.md, gap: spacing.md, paddingBottom: 80 }, input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, padding: 12, color: colors.ink }, multiline: { minHeight: 100, textAlignVertical: "top" }, row: { flexDirection: "row", gap: spacing.sm }, wrap: { gap: spacing.sm }, value: { color: colors.ink, fontWeight: "800", lineHeight: 22 }, subtle: { color: colors.muted, lineHeight: 20 }, photoRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, photo: { width: 92, height: 92, borderRadius: 10 }, photoState: { color: colors.warning, fontSize: 11, fontWeight: "800" } });
