import Ionicons from "@expo/vector-icons/Ionicons";
import { SPECIES } from "@mera/config";
import { rankRecommendations } from "@mera/domain";
import type { ConditionSnapshot, RecentReportSummary, RecommendationResult } from "@mera/types";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { fetchConditions } from "@/api";
import { Loading, OfflineBanner } from "@/components";
import { cacheCondition, conditionsMap, recentReportsMap } from "@/db";
import { useCurrentLocation } from "@/location";
import { useAppState } from "@/store";

const coastalFallback = require("../../assets/spot-detail-karasu.png");
const experienceLabels = { FIRST_TIME: "İlk defa", BEGINNER: "Acemi", INTERMEDIATE: "Orta", EXPERIENCED: "Deneyimli" } as const;

export default function HomeScreen() {
  const state = useAppState();
  const location = useCurrentLocation();
  const [conditionBySpot, setConditionBySpot] = useState<Map<string, ConditionSnapshot>>(new Map());
  const [reportsBySpot, setReportsBySpot] = useState<Map<string, RecentReportSummary>>(new Map());
  const [refreshingConditions, setRefreshingConditions] = useState(false);
  const [finding, setFinding] = useState(false);
  const fetchedKey = useRef("");

  useEffect(() => { if (state.ready && !state.gear) router.replace("/onboarding"); }, [state.ready, state.gear]);
  useEffect(() => { if (state.db) void conditionsMap(state.db).then(setConditionBySpot); }, [state.db]);
  useEffect(() => { if (state.db) void recentReportsMap(state.db, state.targetSpecies).then(setReportsBySpot); }, [state.db, state.targetSpecies]);

  const rank = useMemo(() => (coordinates: { latitude: number; longitude: number }) => rankRecommendations(state.spots, {
    userCoordinates: coordinates,
    experience: state.experience,
    targetSpecies: state.targetSpecies,
    gear: state.gear ?? undefined,
    maxDistanceKm: state.maxDistanceKm,
    now: new Date().toISOString()
  }, conditionBySpot, reportsBySpot), [conditionBySpot, reportsBySpot, state.experience, state.gear, state.maxDistanceKm, state.spots, state.targetSpecies]);

  const ranked = useMemo(() => location.coordinates && state.fishingType === "SHORE" ? rank(location.coordinates) : [], [location.coordinates, rank, state.fishingType]);
  const suitable = useMemo(() => ranked.filter((item) => item.safety.allowed).slice(0, 3), [ranked]);

  useEffect(() => {
    const coordinates = location.coordinates;
    if (!state.db || !state.isConnected || !coordinates || ranked.length === 0) return;
    const key = `${state.targetSpecies}:${state.maxDistanceKm}:${coordinates.latitude.toFixed(3)}:${coordinates.longitude.toFixed(3)}`;
    if (fetchedKey.current === key) return;
    fetchedKey.current = key;
    setRefreshingConditions(true);
    void Promise.all(ranked.filter((item) => item.safety.allowed).slice(0, 5).map(async (item) => {
      const condition = await fetchConditions(item.spot);
      if (condition) await cacheCondition(state.db!, condition);
    })).then(async () => setConditionBySpot(await conditionsMap(state.db!))).finally(() => setRefreshingConditions(false));
  }, [location.coordinates, ranked, state.db, state.isConnected, state.maxDistanceKm, state.targetSpecies]);

  if (!state.ready) return <Loading />;
  const targetName = SPECIES.find((species) => species.id === state.targetSpecies)?.nameTr ?? state.targetSpecies;
  const gearLabel = state.gear ? `${state.gear.rodLengthCm ?? "?"} cm · ${state.gear.castingWeightMinG ?? "?"}–${state.gear.castingWeightMaxG ?? "?"} g` : "Takım seçilmedi";

  async function refreshConditionsFor(coordinates: { latitude: number; longitude: number }) {
    if (!state.db || !state.isConnected) return conditionBySpot;
    const initial = rank(coordinates).filter((item) => item.safety.allowed).slice(0, 5);
    await Promise.all(initial.map(async (item) => {
      const condition = await fetchConditions(item.spot);
      if (condition) await cacheCondition(state.db!, condition);
    }));
    const next = await conditionsMap(state.db);
    setConditionBySpot(next);
    return next;
  }

  async function findBestSpot() {
    if (state.fishingType !== "SHORE") { router.push("/(tabs)/profile"); return; }
    setFinding(true);
    try {
      const coordinates = location.coordinates ?? await location.request();
      if (!coordinates) { Alert.alert("Konum gerekli", "Sana yakın uygun meraları göstermek için cihaz konumuna izin ver."); return; }
      const nextConditions = await refreshConditionsFor(coordinates);
      const results = rankRecommendations(state.spots, { userCoordinates: coordinates, experience: state.experience, targetSpecies: state.targetSpecies, gear: state.gear ?? undefined, maxDistanceKm: state.maxDistanceKm, now: new Date().toISOString() }, nextConditions, reportsBySpot);
      const best = results.find((item) => item.safety.allowed);
      if (!best) { Alert.alert("Uygun mera bulunamadı", "Seçili yarıçap ve tercihlerinde bugün önerilebilecek bir mera yok."); return; }
      router.push({ pathname: "/spot/[id]", params: { id: best.spot.id } });
    } finally { setFinding(false); }
  }

  return <View style={styles.screen}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.header}><View><Text maxFontSizeMultiplier={1} style={styles.brand}>Mera</Text><View style={styles.location}><Ionicons name="location" size={22} color="#5F7184" /><Text maxFontSizeMultiplier={1} style={styles.locationText}>{location.label ?? (location.loading ? "Konum aranıyor…" : "Konum kullanılabilir değil")}</Text></View></View><View accessibilityLabel="Bildirimler" style={styles.bell}><Ionicons name="notifications-outline" size={27} color="#0B2440" /></View></View>
    {!state.isConnected && <OfflineBanner connected={state.isConnected} lastSyncAt={state.lastSyncAt} />}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickFacts}>
      <QuickFact width={112} icon="fish-outline" label="Hedef Balık" value={targetName} onPress={() => router.push("/(tabs)/profile")} />
      <QuickFact width={98} icon="radio-button-on-outline" label="Yarıçap" value={`${state.maxDistanceKm} km`} onPress={() => router.push("/(tabs)/profile")} />
      <QuickFact width={98} icon="bar-chart-outline" label="Seviye" value={experienceLabels[state.experience]} onPress={() => router.push("/(tabs)/profile")} />
      <QuickFact width={148} icon="fish-outline" label="Takım" value={gearLabel} onPress={() => router.push("/(tabs)/profile")} />
    </ScrollView>
    <View style={styles.hero}><Image source={coastalFallback} style={styles.heroImage} /><View style={styles.heroOverlay} /><View style={styles.heroContent}><Text maxFontSizeMultiplier={1} style={styles.heroTitle}>Bugün Nereye{"\n"}Gitsem?</Text><Text maxFontSizeMultiplier={1} style={styles.heroSubtitle}>Hava, deniz ve hedef balığına göre{"\n"}sana en uygun yerleri bulalım.</Text><Pressable accessibilityRole="button" disabled={finding} onPress={() => void findBestSpot()} style={[styles.heroButton, finding && styles.disabled]}><Text maxFontSizeMultiplier={1} style={styles.heroButtonText}>{finding ? "Yer aranıyor…" : "En Uygun Yeri Bul"}</Text></Pressable></View></View>
    <View style={styles.sectionHeader}><Text maxFontSizeMultiplier={1} style={styles.sectionTitle}>Bugün sana uygun</Text><Pressable accessibilityRole="button" onPress={() => router.push("/recommendations")} style={styles.allButton}><Text maxFontSizeMultiplier={1} style={styles.allText}>Tümünü gör</Text><Ionicons name="chevron-forward" size={24} color="#1F65B8" /></Pressable></View>
    {refreshingConditions && <Text maxFontSizeMultiplier={1} style={styles.status}>Koşullar güncelleniyor…</Text>}
    {!location.coordinates && <View style={styles.empty}><Text maxFontSizeMultiplier={1} style={styles.emptyTitle}>Konumunu kullanarak öneri al</Text><Text maxFontSizeMultiplier={1} style={styles.emptyText}>Yakınındaki meralar, mesafe ve güncel koşullarla sıralanır.</Text></View>}
    {location.coordinates && suitable.length === 0 && <View style={styles.empty}><Text maxFontSizeMultiplier={1} style={styles.emptyTitle}>Bugün uygun mera bulunamadı</Text><Text maxFontSizeMultiplier={1} style={styles.emptyText}>Yarıçapını veya tercihlerini Profil’den güncelleyebilirsin.</Text></View>}
    {suitable.map((result) => <RecommendationCard key={result.spot.id} result={result} condition={conditionBySpot.get(result.spot.id)} saved={state.favoriteIds.includes(result.spot.id)} onOpen={() => router.push({ pathname: "/spot/[id]", params: { id: result.spot.id } })} onSave={() => void state.toggleFavorite(result.spot.id)} />)}
  </ScrollView></View>;
}

function QuickFact({ width, icon, label, value, onPress }: { width: number; icon: keyof typeof Ionicons.glyphMap; label: string; value: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.quickFact, { width }]}><Ionicons name={icon} size={25} color="#0B2440" /><View style={styles.quickCopy}><Text maxFontSizeMultiplier={1} numberOfLines={1} style={styles.quickLabel}>{label}</Text><Text maxFontSizeMultiplier={1} numberOfLines={1} style={styles.quickValue}>{value}</Text></View></Pressable>;
}

function RecommendationCard({ result, condition, saved, onOpen, onSave }: { result: RecommendationResult; condition?: ConditionSnapshot; saved: boolean; onOpen: () => void; onSave: () => void }) {
  const photoPath = result.spot.photoPaths?.find((path) => path.startsWith("file:") || path.startsWith("content:"));
  const bestTime = condition?.sunrise ? `${formatHour(condition.sunrise)}–${formatHour(addHours(condition.sunrise, 3))}` : "Saat bilinmiyor";
  const imageSource = photoPath ? { uri: photoPath } : coastalFallback;
  return <Pressable accessibilityRole="button" onPress={onOpen} style={styles.recommendation}><Image source={imageSource} style={styles.cardImage} /><View style={styles.cardCopy}><View style={styles.cardTitleRow}><View style={styles.cardNameBlock}><Text maxFontSizeMultiplier={1} numberOfLines={2} style={styles.cardName}>{result.spot.canonicalName}</Text><Text maxFontSizeMultiplier={1} style={styles.cardMeta}>{result.spot.district} · {result.straightLineDistanceKm.toFixed(0)} km</Text></View></View><View style={styles.metrics}><Metric icon="speedometer-outline" text={`Rüzgâr ${condition?.windSpeedKmh === undefined ? "—" : `${Math.round(condition.windSpeedKmh)} km/s`}`} /><Metric icon="time-outline" text={bestTime} /></View></View><View style={styles.cardRight}><Pressable accessibilityRole="button" accessibilityLabel={saved ? "Kaydı kaldır" : "Kaydet"} hitSlop={8} onPress={(event) => { event.stopPropagation(); onSave(); }} style={styles.bookmark}><Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={27} color="#0B2440" /></Pressable><View style={styles.cardActionRow}><View style={styles.score}><Text maxFontSizeMultiplier={1} style={styles.scoreNumber}>{result.score}</Text><Text maxFontSizeMultiplier={1} numberOfLines={1} style={styles.scoreLabel}>{scoreLabel(result.score)}</Text></View><Ionicons name="chevron-forward" size={25} color="#49637E" /></View></View></Pressable>;
}

function Metric({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) { return <View style={styles.metric}><Ionicons name={icon} size={16} color="#49637E" /><Text maxFontSizeMultiplier={1} numberOfLines={1} style={styles.metricText}>{text}</Text></View>; }
function scoreLabel(score: number) { return score >= 80 ? "Çok uygun" : score >= 60 ? "Uygun" : score > 0 ? "Kontrol et" : "Uygun değil"; }
function formatHour(iso: string) { return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }); }
function addHours(iso: string, hours: number) { return new Date(new Date(iso).getTime() + hours * 3_600_000).toISOString(); }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FCFCFD" },
  content: { padding: 16, paddingBottom: 8, gap: 16, backgroundColor: "#FCFCFD" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8 },
  brand: { color: "#0B2440", fontFamily: "serif", fontSize: 32, lineHeight: 38, fontWeight: "700" },
  location: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 }, locationText: { color: "#5F7184", fontSize: 16, fontWeight: "500" },
  bell: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#DEE4EA", borderRadius: 24, backgroundColor: "#FFFFFF" },
  quickFacts: { gap: 8, paddingRight: 16 }, quickFact: { minWidth: 0, minHeight: 64, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 10, borderWidth: 1, borderColor: "#DDE4EA", borderRadius: 15, backgroundColor: "#FFFFFF" }, quickCopy: { flex: 1, minWidth: 0 }, quickLabel: { color: "#374151", fontSize: 11, fontWeight: "500" }, quickValue: { color: "#1F65B8", fontSize: 13, fontWeight: "700", marginTop: 3 },
  hero: { height: 210, overflow: "hidden", borderRadius: 24, backgroundColor: "#C4DCEA" }, heroImage: { ...StyleSheet.absoluteFill, width: undefined, height: undefined }, heroOverlay: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(236,246,251,0.36)" }, heroContent: { flex: 1, justifyContent: "center", paddingHorizontal: 26, paddingVertical: 12 }, heroTitle: { color: "#0B2440", fontFamily: "serif", fontSize: 29, lineHeight: 32, fontWeight: "700" }, heroSubtitle: { color: "#43546B", fontSize: 14, lineHeight: 17, marginTop: 6 }, heroButton: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", marginTop: 8, paddingHorizontal: 18, paddingVertical: 7, borderRadius: 13, backgroundColor: "#0B2440" }, disabled: { opacity: 0.72 }, heroButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 }, sectionTitle: { color: "#0B2440", fontSize: 20, fontWeight: "800" }, allButton: { minHeight: 44, flexDirection: "row", alignItems: "center" }, allText: { color: "#1F65B8", fontSize: 15, fontWeight: "700" }, status: { color: "#49637E", fontSize: 13, fontWeight: "600", marginTop: -8 },
  recommendation: { minHeight: 116, flexDirection: "row", alignItems: "center", gap: 12, padding: 12, marginTop: -8, borderWidth: 1, borderColor: "#E3E7EB", borderRadius: 18, backgroundColor: "#FFFFFF" }, cardImage: { width: 92, height: 92, borderRadius: 10, backgroundColor: "#D6E4EC" }, cardCopy: { flex: 1, minWidth: 0, alignSelf: "stretch", justifyContent: "center" }, cardTitleRow: { flexDirection: "row", alignItems: "flex-start" }, cardNameBlock: { flex: 1, minWidth: 0 }, cardName: { color: "#0B2440", fontFamily: "serif", fontSize: 19, lineHeight: 23, fontWeight: "700" }, cardMeta: { color: "#5F7184", fontSize: 12, marginTop: 3 }, cardRight: { width: 64, minHeight: 92, alignSelf: "stretch" }, bookmark: { alignSelf: "flex-end", width: 36, height: 36, alignItems: "center", justifyContent: "flex-start" }, cardActionRow: { flex: 1, flexDirection: "row", alignItems: "center" }, metrics: { flexDirection: "row", flexWrap: "nowrap", gap: 4, marginTop: 8 }, metric: { maxWidth: "100%", flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 5, paddingVertical: 4, borderRadius: 7, backgroundColor: "#F0F4FA" }, metricText: { color: "#49637E", fontSize: 8, fontWeight: "500" }, score: { flex: 1, alignItems: "center" }, scoreNumber: { color: "#0B2440", fontFamily: "serif", fontSize: 31, lineHeight: 35, fontWeight: "700" }, scoreLabel: { color: "#5F7184", fontSize: 9, textAlign: "center" },
  empty: { gap: 5, paddingVertical: 16, marginTop: -8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#E3E7EB" }, emptyTitle: { color: "#0B2440", fontSize: 16, fontWeight: "700" }, emptyText: { color: "#5F7184", fontSize: 14, lineHeight: 20 }
});
