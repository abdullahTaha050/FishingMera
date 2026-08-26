import Ionicons from "@expo/vector-icons/Ionicons";
import { rankRecommendations } from "@mera/domain";
import type { ConditionSnapshot, RecentReportSummary, RecommendationResult, Spot } from "@mera/types";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Loading } from "@/components";
import { conditionsMap, listOfflineRegions, recentReportsMap, type OfflineRegion } from "@/db";
import { useCurrentLocation } from "@/location";
import { useAppState } from "@/store";
import { colors } from "@/theme";

type SavedTab = "spots" | "offline";
const fallbackSpotImage = require("../../assets/spot-detail-karasu.png");

export default function SavedScreen() {
  const state = useAppState();
  const location = useCurrentLocation();
  const [tab, setTab] = useState<SavedTab>("spots");
  const [conditionBySpot, setConditionBySpot] = useState<Map<string, ConditionSnapshot>>(new Map());
  const [reportsBySpot, setReportsBySpot] = useState<Map<string, RecentReportSummary>>(new Map());
  const [offlineRegions, setOfflineRegions] = useState<OfflineRegion[]>([]);

  useFocusEffect(useCallback(() => {
    if (!state.db) return;
    let active = true;
    void Promise.all([conditionsMap(state.db), recentReportsMap(state.db, state.targetSpecies), listOfflineRegions(state.db)])
      .then(([conditions, reports, regions]) => {
        if (!active) return;
        setConditionBySpot(conditions); setReportsBySpot(reports); setOfflineRegions(regions);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [state.db, state.targetSpecies]));

  const savedSpots = useMemo(() => state.favoriteIds
    .map((id) => state.spots.find((spot) => spot.id === id))
    .filter((spot): spot is Spot => Boolean(spot)), [state.favoriteIds, state.spots]);
  const recommendationBySpot = useMemo(() => {
    if (!location.coordinates || state.fishingType !== "SHORE") return new Map<string, RecommendationResult>();
    return new Map(rankRecommendations(savedSpots, {
      userCoordinates: location.coordinates,
      experience: state.experience,
      targetSpecies: state.targetSpecies,
      gear: state.gear ?? undefined,
      maxDistanceKm: state.maxDistanceKm,
      now: new Date().toISOString()
    }, conditionBySpot, reportsBySpot).map((result) => [result.spot.id, result]));
  }, [conditionBySpot, location.coordinates, reportsBySpot, savedSpots, state.experience, state.fishingType, state.gear, state.maxDistanceKm, state.targetSpecies]);

  if (!state.ready) return <Loading />;
  return <View style={styles.screen}><ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
    <View style={styles.header}><Text style={styles.pageTitle}>Kaydedilenler</Text><Text style={styles.pageSubtitle}>Kaydettiğin meraları burada bul.</Text></View>
    <View accessibilityRole="tablist" style={styles.segmented}>
      <Segment label="Meralar" selected={tab === "spots"} onPress={() => setTab("spots")} />
      <Segment label="Offline Bölgeler" selected={tab === "offline"} onPress={() => setTab("offline")} />
    </View>
    <View style={styles.tabContent}>{tab === "spots" ? <SavedSpots
      spots={savedSpots}
      results={recommendationBySpot}
      conditions={conditionBySpot}
      onOpen={(spotId) => router.push({ pathname: "/spot/[id]", params: { id: spotId } })}
      onUnsave={(spotId) => void state.toggleFavorite(spotId)}
    /> : <OfflineRegions regions={offlineRegions} />}</View>
  </ScrollView></View>;
}

function Segment({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected }} onPress={onPress} style={[styles.segment, selected && styles.segmentActive]}><Text style={[styles.segmentText, selected && styles.segmentTextActive]}>{label}</Text></Pressable>;
}

function SavedSpots({ spots, results, conditions, onOpen, onUnsave }: { spots: Spot[]; results: Map<string, RecommendationResult>; conditions: Map<string, ConditionSnapshot>; onOpen: (spotId: string) => void; onUnsave: (spotId: string) => void }) {
  if (spots.length === 0) return <View style={styles.empty}><Ionicons name="bookmark-outline" size={30} color={colors.water} /><Text style={styles.emptyTitle}>Henüz kaydedilmiş mera yok</Text><Text style={styles.emptyText}>Keşfet'ten meraları kaydedebilirsin.</Text><Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/map")} style={styles.emptyAction}><Text style={styles.emptyActionText}>Keşfet'e git</Text><Ionicons name="arrow-forward" size={19} color="#FFFFFF" /></Pressable></View>;
  return <View style={styles.section}>{spots.map((spot) => <SavedSpotCard key={spot.id} spot={spot} result={results.get(spot.id)} condition={conditions.get(spot.id)} onOpen={() => onOpen(spot.id)} onUnsave={() => onUnsave(spot.id)} />)}</View>;
}

function SavedSpotCard({ spot, result, condition, onOpen, onUnsave }: { spot: Spot; result?: RecommendationResult; condition?: ConditionSnapshot; onOpen: () => void; onUnsave: () => void }) {
  const photo = spot.photoPaths?.find((path) => path.startsWith("file:") || path.startsWith("content:"));
  const time = condition?.sunrise ? `${formatTime(condition.sunrise)}–${formatTime(addHours(condition.sunrise, 3))}` : null;
  const score = result?.score;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${spot.canonicalName} detayını aç`} onPress={onOpen} style={styles.spotCard}>
    <Image source={photo ? { uri: photo } : fallbackSpotImage} style={styles.spotImage} resizeMode="cover" />
    <View style={styles.spotCopy}><Text numberOfLines={2} style={styles.spotName}>{spot.canonicalName}</Text><Text numberOfLines={1} style={styles.spotLocation}>{[spot.district, result ? `${result.straightLineDistanceKm.toFixed(0)} km` : null].filter(Boolean).join(" · ")}</Text>{(condition?.windSpeedKmh !== undefined || time) && <View style={styles.metadata}>{condition?.windSpeedKmh !== undefined && <Meta icon="speedometer-outline" text={`Rüzgâr ${Math.round(condition.windSpeedKmh)} km/s`} />}{time && <Meta icon="time-outline" text={time} />}</View>}</View>
    <View style={styles.scoreColumn}><Pressable accessibilityRole="button" accessibilityLabel="Kaydı kaldır" hitSlop={8} onPress={(event) => { event.stopPropagation(); onUnsave(); }} style={styles.bookmark}><Ionicons name="bookmark" size={24} color="#0B2440" /></Pressable>{score !== undefined && <View style={styles.score}><Text style={styles.scoreNumber}>{score}</Text><Text style={styles.scoreLabel}>{scoreLabel(score)}</Text></View>}</View>
  </Pressable>;
}

function Meta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) { return <View style={styles.meta}><Ionicons name={icon} size={15} color="#49637E" /><Text numberOfLines={1} style={styles.metaText}>{text}</Text></View>; }

function OfflineRegions({ regions }: { regions: OfflineRegion[] }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>Offline Bölgeler</Text>{regions.length === 0 ? <View style={styles.empty}><Ionicons name="map-outline" size={30} color={colors.water} /><Text style={styles.emptyTitle}>Henüz indirilen bölge yok</Text><Text style={styles.emptyText}>Mera detayındaki Offline eylemiyle mevcut harita bölgesini indirebilirsin.</Text></View> : regions.map((region) => <OfflineRegionCard key={region.id} region={region} />)}</View>;
}

function OfflineRegionCard({ region }: { region: OfflineRegion }) {
  const isComplete = region.state === "COMPLETE";
  const isDownloading = region.state === "DOWNLOADING";
  return <View style={styles.offlineCard}><View style={[styles.offlineIcon, isComplete && styles.offlineIconComplete]}><Ionicons name={isComplete ? "checkmark" : isDownloading ? "download-outline" : "alert-outline"} size={21} color={isComplete ? "#2E8A4C" : isDownloading ? "#0B2440" : colors.warning} /></View><View style={styles.offlineCopy}><Text style={styles.offlineName}>{region.name}</Text>{isComplete && <Text style={styles.offlineStatus}>Çevrimdışı harita hazır</Text>}{isDownloading && <><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, region.progress))}%` }]} /></View><Text style={styles.offlineStatus}>İndiriliyor · %{Math.round(region.progress)}</Text></>}{region.state === "FAILED" && <Text style={styles.failedStatus}>İndirme tamamlanamadı</Text>}</View></View>;
}

function scoreLabel(score: number) { return score >= 80 ? "Çok uygun" : score >= 60 ? "Uygun" : score > 0 ? "Kontrol et" : "Uygun değil"; }
function formatTime(value: string) { return new Date(value).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }); }
function addHours(value: string, hours: number) { return new Date(new Date(value).getTime() + hours * 3_600_000).toISOString(); }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FCFCFD" }, scroll: { flex: 1, backgroundColor: "#FCFCFD" }, content: { padding: 16, paddingTop: 52, paddingBottom: 12, backgroundColor: "#FCFCFD" },
  header: { gap: 4 }, pageTitle: { color: "#0B2440", fontFamily: "serif", fontSize: 28, lineHeight: 34, fontWeight: "700" }, pageSubtitle: { color: "#5F7184", fontSize: 14, lineHeight: 20 },
  segmented: { minHeight: 50, flexDirection: "row", padding: 3, marginTop: 28, borderRadius: 14, borderWidth: 1, borderColor: "#DDE4EA", backgroundColor: "#F4F6F8" }, segment: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 11 }, segmentActive: { backgroundColor: "#FFFFFF", shadowColor: "#0B2440", shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 }, segmentText: { color: "#5F7184", fontSize: 14, fontWeight: "600" }, segmentTextActive: { color: "#0B2440", fontWeight: "700" },
  tabContent: { marginTop: 28 },
  section: { gap: 12 }, sectionTitle: { color: "#0B2440", fontFamily: "serif", fontSize: 20, lineHeight: 25, fontWeight: "700" },
  spotCard: { minHeight: 124, flexDirection: "row", gap: 11, padding: 12, borderRadius: 18, borderWidth: 1, borderColor: "#E3E7EB", backgroundColor: "#FFFFFF" }, spotImage: { width: 92, height: 100, borderRadius: 11, backgroundColor: "#D6E4EC" }, spotCopy: { flex: 1, minWidth: 0, justifyContent: "center" }, spotName: { color: "#0B2440", fontFamily: "serif", fontSize: 18, lineHeight: 22, fontWeight: "700" }, spotLocation: { color: "#5F7184", fontSize: 13, lineHeight: 17, marginTop: 3 }, scoreColumn: { width: 72, alignItems: "flex-end", justifyContent: "space-between", minHeight: 100 }, bookmark: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginTop: -8, marginRight: -8 }, metadata: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4, marginTop: 10 }, meta: { maxWidth: "100%", minHeight: 27, flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, borderRadius: 7, backgroundColor: "#F0F4FA" }, metaText: { color: "#49637E", fontSize: 10, fontWeight: "600" }, score: { alignItems: "flex-end", paddingBottom: 2 }, scoreNumber: { color: "#2E8A4C", fontFamily: "serif", fontSize: 20, lineHeight: 24, fontWeight: "700" }, scoreLabel: { color: "#2E8A4C", fontSize: 10, lineHeight: 13, fontWeight: "700", textAlign: "right" },
  empty: { alignItems: "flex-start", gap: 8, paddingVertical: 24, paddingHorizontal: 4, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#E3E7EB" }, emptyTitle: { color: "#0B2440", fontSize: 16, fontWeight: "700" }, emptyText: { color: "#5F7184", fontSize: 14, lineHeight: 20, maxWidth: 320 }, emptyAction: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, paddingHorizontal: 15, borderRadius: 12, backgroundColor: "#0B2440" }, emptyActionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  offlineCard: { minHeight: 84, flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: "#E3E7EB", backgroundColor: "#FFFFFF" }, offlineIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 21, backgroundColor: "#EFF4F7" }, offlineIconComplete: { backgroundColor: "#E7F4EA" }, offlineCopy: { flex: 1, minWidth: 0, gap: 5 }, offlineName: { color: "#0B2440", fontFamily: "serif", fontSize: 16, lineHeight: 21, fontWeight: "700" }, offlineStatus: { color: "#5F7184", fontSize: 13 }, failedStatus: { color: colors.warning, fontSize: 13, fontWeight: "600" }, progressTrack: { height: 5, overflow: "hidden", borderRadius: 3, backgroundColor: "#E1E8EE" }, progressFill: { height: "100%", borderRadius: 3, backgroundColor: "#0B2440" }
});
