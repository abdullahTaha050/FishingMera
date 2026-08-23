import { rankRecommendations } from "@mera/domain";
import type { RecommendationResult } from "@mera/types";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { discoverMoreSpots, fetchConditions, type DiscoveryCandidate } from "@/api";
import { Button, Card, Label, Loading, Screen } from "@/components";
import { cacheCondition, conditionsMap, trackEvent } from "@/db";
import { HENDEK_DEMO_LOCATION, useCurrentLocation } from "@/location";
import { useAppState } from "@/store";
import { colors, spacing } from "@/theme";

const reasonText: Record<string, string> = {
  SPECIES_REPORTED: "Hedef tür için kaynak veya bölgesel kayıt var.",
  SPECIES_EVIDENCE_WEAK: "Bu nokta yalnızca coğrafi potansiyel; tür henüz doğrulanmadı.",
  CONDITIONS_RELATIVELY_SUITABLE: "Model verilerine göre hava ve deniz nispeten uygun görünüyor.",
  CONDITIONS_MISSING: "Güncel koşul verisi yok; eski veri güncel gibi kullanılmadı.",
  GEAR_GOOD_MATCH: "Seçili takımın başlangıç kural setiyle uyumlu.",
  NO_MODEL_RISK_FLAG: "Mevcut veride hard risk kuralı tetiklenmedi; yerel koşulları yine kontrol et.",
  ACCESS_UNKNOWN: "Erişim bilgisi bilinmiyor.",
  PROHIBITION_UNKNOWN: "Güncel yasak/izin durumu doğrulanmadı."
};

export default function RecommendationsScreen() {
  const state = useAppState();
  const location = useCurrentLocation();
  const [conditionBySpot, setConditionBySpot] = useState(new Map());
  const [refreshing, setRefreshing] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState<DiscoveryCandidate[]>([]);
  const fetchedKey = useRef("");
  useEffect(() => { if (state.db) conditionsMap(state.db).then(setConditionBySpot); }, [state.db]);
  useEffect(() => { if (state.db) void trackEvent(state.db, "recommendation_requested", { radiusKm: state.maxDistanceKm, targetSpecies: state.targetSpecies }); }, [state.db, state.maxDistanceKm, state.targetSpecies]);
  const coordinates = location.coordinates ?? HENDEK_DEMO_LOCATION;
  const results = useMemo(() => rankRecommendations(state.spots, { userCoordinates: coordinates, experience: state.experience, targetSpecies: state.targetSpecies, gear: state.gear ?? undefined, maxDistanceKm: state.maxDistanceKm, now: new Date().toISOString() }, conditionBySpot, new Map()), [state.spots, coordinates, state.experience, state.targetSpecies, state.gear, state.maxDistanceKm, conditionBySpot]);

  useEffect(() => {
    const key = `${state.targetSpecies}:${state.maxDistanceKm}:${coordinates.latitude.toFixed(3)}:${coordinates.longitude.toFixed(3)}`;
    if (!state.db || !state.isConnected || fetchedKey.current === key || results.length === 0) return;
    fetchedKey.current = key; setRefreshing(true);
    Promise.all(results.filter((item) => item.safety.allowed).slice(0, 5).map(async (item) => {
      const condition = await fetchConditions(item.spot);
      if (condition) await cacheCondition(state.db!, condition);
    })).then(async () => setConditionBySpot(await conditionsMap(state.db!))).finally(() => setRefreshing(false));
  }, [state.db, state.isConnected, state.targetSpecies, state.maxDistanceKm, coordinates, results]);

  if (!state.ready) return <Loading />;
  async function discover() {
    if (!state.isConnected) return Alert.alert("İnternet gerekli", "Seed meralar ve mevcut öneriler çevrimdışı çalışmaya devam eder.");
    setDiscovering(true);
    try {
      const result = await discoverMoreSpots({ latitude: coordinates.latitude, longitude: coordinates.longitude, radiusKm: state.maxDistanceKm, targetSpecies: state.targetSpecies });
      setDiscovered(result.candidates);
      if (result.candidates.length === 0) Alert.alert("Yeni kanıtlı aday bulunamadı", "Mevcut seed verisi kullanılmaya devam ediyor.");
    } catch (error) {
      Alert.alert("Keşif şu an kullanılamıyor", error instanceof Error && error.message === "DISCOVERY_BUDGET_BLOCKED" ? "Günlük/aylık yapay zekâ bütçe sınırı doldu; mevcut veriler etkilenmez." : "Sunucu, hesap veya bağlantı yapılandırmasını kontrol et. Mevcut veriler etkilenmez.");
    } finally { setDiscovering(false); }
  }
  return <Screen><ScrollView contentContainerStyle={styles.content}>
    <Card><Label>Konum kaynağı</Label><Text style={styles.value}>{location.coordinates ? "Cihaz GPS" : "Hendek demo konumu"}</Text><Text style={styles.subtle}>{location.coordinates ? `GPS doğruluğu: ±${Math.round(location.accuracy ?? 0)} m` : "İzin verince gerçek konumla yeniden hesaplanır."}</Text><Button title={location.loading ? "Konum alınıyor…" : "Konumumu kullan"} variant="secondary" disabled={location.loading} onPress={location.request} /></Card>
    {refreshing && <Text style={styles.refresh}>İlk beş sonuç için hava/deniz cache’i güncelleniyor…</Text>}
    {results.map((result) => <ResultCard key={result.spot.id} result={result} onOpen={() => router.push({ pathname: "/spot/[id]", params: { id: result.spot.id } })} />)}
    {results.length === 0 && <Card><Text style={styles.value}>Seçilen yarıçapta kayıt yok.</Text><Text style={styles.subtle}>İnternet varsa “daha fazla mera ara” sunucu keşfini kullanabilir; mevcut seed veri çalışmaya devam eder.</Text></Card>}
    <Button title={discovering ? "Web kaynakları araştırılıyor…" : "Daha fazla mera ara"} variant="secondary" disabled={discovering || !state.isConnected} onPress={discover} />
    {discovered.length > 0 && <View style={{ gap: spacing.sm }}><Label>Keşif adayları · öneri listesine henüz eklenmedi</Label>{discovered.map((candidate, index) => <Card key={`${candidate.canonicalName}-${index}`}><Text style={styles.name}>{candidate.canonicalName}</Text><Text style={styles.subtle}>{[candidate.district, candidate.province].filter(Boolean).join(", ") || "Bölge bilinmiyor"} · {candidate.coordinatePrecision === "UNKNOWN" ? "Koordinat kanıtı yok" : candidate.coordinatePrecision === "APPROXIMATE" ? "Yaklaşık koordinat" : "Kaynaklı koordinat"}</Text><Text style={styles.risk}>Doğrulanmamış web adayı · güven skoru %{Math.round(candidate.confidenceScore * 100)}</Text>{candidate.sources.slice(0, 3).map((source) => <Text key={source.url} style={styles.link} onPress={() => Linking.openURL(source.url)}>• {source.title} ↗</Text>)}</Card>)}</View>}
  </ScrollView></Screen>;
}

function ResultCard({ result, onOpen }: { result: RecommendationResult; onOpen: () => void }) {
  const condition = result.factors.find((item) => item.factor === "CONDITIONS");
  return <Card><View style={styles.topRow}><View style={{ flex: 1 }}><Text style={styles.name}>{result.spot.canonicalName}</Text><Text style={styles.subtle}>{result.spot.district} · Kuş uçuşu {result.straightLineDistanceKm} km</Text></View><View style={[styles.score, !result.safety.allowed && styles.scoreRisk]}><Text style={styles.scoreText}>{result.score}</Text><Text style={styles.scoreOut}>/100</Text></View></View>
    <Text style={result.safety.allowed ? styles.good : styles.risk}>{result.safety.allowed ? "Bugün sana göre değerlendirilebilir" : "Risk kuralı nedeniyle üst sıralara alınmadı"}</Text>
    <View style={styles.metrics}><Text style={styles.metric}>{result.spot.verificationStatus === "POTENTIAL" ? "Potansiyel · doğrulanmadı" : "Web keşfi"}</Text><Text style={styles.metric}>{condition?.reasonCode === "CONDITIONS_MISSING" ? "Koşul verisi yok" : `Koşul puanı ${Math.round((condition?.raw ?? 0) * 100)}`}</Text></View>
    <Label>Neden?</Label>{result.explanationCodes.slice(0, 4).map((code) => <Text key={code} style={styles.reason}>• {reasonText[code] ?? code.replaceAll("_", " ").toLocaleLowerCase("tr-TR")}</Text>)}
    <Button title="Detay" variant="secondary" onPress={onOpen} />
  </Card>;
}

const styles = StyleSheet.create({ content: { padding: spacing.md, gap: spacing.md, paddingBottom: 80 }, topRow: { flexDirection: "row", alignItems: "center", gap: spacing.md }, name: { color: colors.ink, fontSize: 20, fontWeight: "900" }, value: { color: colors.ink, fontSize: 17, fontWeight: "800" }, subtle: { color: colors.muted, fontSize: 14, lineHeight: 20 }, refresh: { color: colors.water, fontWeight: "700", textAlign: "center" }, score: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.moss, alignItems: "center", justifyContent: "center" }, scoreRisk: { backgroundColor: colors.danger }, scoreText: { color: colors.white, fontSize: 22, fontWeight: "900" }, scoreOut: { color: colors.white, fontSize: 11 }, good: { color: colors.moss, fontWeight: "800" }, risk: { color: colors.danger, fontWeight: "800" }, metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, metric: { backgroundColor: "#ECEBE3", color: colors.ink, paddingVertical: 6, paddingHorizontal: 9, borderRadius: 9, fontSize: 12, fontWeight: "700" }, reason: { color: colors.ink, lineHeight: 20 }, link: { color: colors.water, lineHeight: 22, textDecorationLine: "underline" } });
