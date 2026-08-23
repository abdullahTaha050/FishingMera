import { GEAR_RULES } from "@mera/config";
import { stalenessLabelTr } from "@mera/domain";
import type { ConditionSnapshot, Spot } from "@mera/types";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, Card, Label, Loading, Screen, Title } from "@/components";
import { conditionsMap, getSpot } from "@/db";
import { downloadOfflineRegion, SAKARYA_NORTH_BOUNDS } from "@/map";
import { useAppState } from "@/store";
import { colors, spacing } from "@/theme";

export default function SpotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const state = useAppState(); const [spot, setSpot] = useState<Spot | null>(null); const [condition, setCondition] = useState<ConditionSnapshot | null>(null); const [progress, setProgress] = useState<number | null>(null);
  useEffect(() => { if (state.db && id) { void getSpot(state.db, id).then(setSpot); void conditionsMap(state.db).then((map) => setCondition(map.get(id) ?? null)); } }, [state.db, id]);
  if (!state.ready || !spot) return <Loading />;
  const favorite = state.favoriteIds.includes(spot.id); const gearRule = GEAR_RULES.find((rule) => rule.speciesId === state.targetSpecies);
  async function offline() { if (!state.db) return; try { await downloadOfflineRegion(state.db, { id: "sakarya-north-v1", name: "Sakarya Kuzey Sahili", bounds: SAKARYA_NORTH_BOUNDS }, setProgress); Alert.alert("İndirme başladı", "Tamamlanan harita paketi yeniden açılışta da kullanılabilir."); } catch (error) { Alert.alert("Offline harita indirilemedi", error instanceof Error && error.message === "OFFLINE_STYLE_NOT_CONFIGURED" ? "Offline indirmeye izinli Mera tile endpoint'i henüz ortam değişkeninde tanımlı değil. Seed pinleri çevrimdışı çalışmaya devam eder." : "Bağlantıyı ve depolama alanını kontrol et."); } }
  return <Screen><ScrollView contentContainerStyle={styles.content}><View><Label>{spot.verificationStatus === "POTENTIAL" ? "Potansiyel · doğrulanmadı" : "Web keşfi · topluluk doğrulaması yok"}</Label><Title>{spot.canonicalName}</Title><Text style={styles.subtle}>{spot.district}, {spot.province} · {spot.coordinates.latitude.toFixed(5)}, {spot.coordinates.longitude.toFixed(5)}</Text></View>
    {spot.verificationStatus === "POTENTIAL" && <Card><Text style={styles.warning}>Coğrafi yapısı nedeniyle potansiyel kıyı av noktası. Henüz doğrulanmadı.</Text></Card>}
    <View style={styles.actions}><Button title={favorite ? "Favoriden çıkar" : "Favoriye ekle"} variant="secondary" onPress={() => state.toggleFavorite(spot.id)} /><Button title="Pusulayla yönel" onPress={() => router.push({ pathname: "/compass", params: { spotId: spot.id } })} /></View>
    <Card><Label>Erişim ve kıyı</Label><Text style={styles.value}>{spot.coastlineType} · {spot.accessType}</Text><Text style={styles.subtle}>{spot.terrain}</Text><Text style={styles.subtle}>Park: {spot.parkingNotes ?? "Bilinmiyor"}</Text></Card>
    <Card><Label>Bilinen riskler / uyarılar</Label>{[...spot.knownHazards, ...spot.accessWarnings].map((item) => <Text key={item} style={styles.warning}>• {item}</Text>)}<Text style={styles.disclaimer}>Bu uygulama güvenli rota veya deniz güvenliği garantisi vermez. Yerel koşulları ve resmî kısıtları kontrol et.</Text></Card>
    <Card><Label>Hava ve deniz</Label>{condition ? <><Text style={styles.value}>Dalga {condition.waveHeightM ?? "—"} m · Rüzgâr {condition.windSpeedKmh ?? "—"} km/s</Text><Text style={styles.subtle}>{stalenessLabelTr(condition.fetchedAt)}</Text></> : <Text style={styles.warning}>Güncel koşul verisi yok. Uygulama eski veriyi güncelmiş gibi göstermiyor.</Text>}</Card>
    <Card><Label>Bugün için daha uygun saatler</Label><Text style={styles.value}>{condition?.sunrise ? `${new Date(condition.sunrise).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} sonrası yaklaşık 3 saat` : "Gün doğumu çevresi — veri gelince hesaplanır"}</Text><Text style={styles.subtle}>Bu zamanlar tahmini değerlendirmedir; av garantisi değildir.</Text></Card>
    {gearRule && <Card><Label>Başlangıç önerisi</Label><Text style={styles.value}>{gearRule.suggestionTr}</Text><Text style={styles.subtle}>Structured kural veritabanından; yapay zekâ gramaj üretmez.</Text></Card>}
    <Card><Label>Offline harita</Label><Text style={styles.subtle}>Yollar, kıyı ve yer adları yalnızca indirmeye izinli Mera vector tile paketi üzerinden indirilir.</Text>{progress !== null && <Text style={styles.value}>%{Math.round(progress)}</Text>}<Button title="Sakarya Kuzey Sahili — Offline indir" variant="secondary" onPress={offline} /></Card>
    <Card><Label>Kaynaklar</Label>{spot.sources.map((source) => <Text key={`${source.url}-${source.evidenceType}`} style={styles.link} onPress={() => Linking.openURL(source.url)}>• {source.title} ↗</Text>)}</Card>
  </ScrollView></Screen>;
}
const styles = StyleSheet.create({ content: { padding: spacing.md, gap: spacing.md, paddingBottom: 80 }, subtle: { color: colors.muted, lineHeight: 20 }, value: { color: colors.ink, fontSize: 17, fontWeight: "800", lineHeight: 24 }, warning: { color: colors.warning, lineHeight: 21, fontWeight: "700" }, disclaimer: { color: colors.danger, lineHeight: 20, fontWeight: "800", marginTop: spacing.sm }, actions: { gap: spacing.sm }, link: { color: colors.water, lineHeight: 22, textDecorationLine: "underline" } });

