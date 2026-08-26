import { Camera, GeoJSONSource, Layer, Map } from "@maplibre/maplibre-react-native";
import { Ionicons } from "@expo/vector-icons";
import { GENERAL_SEA_REGULATION_TR, GEAR_RULES, REGULATION_VERSION, SPECIES, SPECIES_REGULATIONS } from "@mera/config";
import { evaluateSafety, haversineDistanceKm, matchGear } from "@mera/domain";
import type { ConditionSnapshot, Spot } from "@mera/types";
import { Stack, router, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { Button, Loading, Screen } from "@/components";
import { conditionsMap, getSpot, saveFeedback, trackEvent } from "@/db";
import { useCurrentLocation } from "@/location";
import { downloadOfflineRegion, fallbackMapStyle, SAKARYA_NORTH_BOUNDS } from "@/map";
import { BundledBasemapLayers } from "@/mapLayers";
import { MeraBottomNavigation, type MeraTabKey } from "@/mera-tab-bar";
import { accessTypeText, beginnerSuitabilityText, coastlineTypeText, safetyReasonTr } from "@/labels";
import { useAppState } from "@/store";
import { colors, spacing } from "@/theme";

const runtimeStartedAt = Date.now();
const fallbackHero = require("../../assets/spot-detail-karasu.png");

export default function SpotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useAppState();
  const location = useCurrentLocation();
  const [spot, setSpot] = useState<Spot | null>(null);
  const [condition, setCondition] = useState<ConditionSnapshot | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [verificationVisible, setVerificationVisible] = useState(false);
  const [lastKnownCoordinates, setLastKnownCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [liveCoordinates, setLiveCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (!state.db || !id) return;
    void getSpot(state.db, id).then(setSpot);
    void conditionsMap(state.db).then((map) => setCondition(map.get(id) ?? null));
    void trackEvent(state.db, "spot_opened", { verification: "local" });
  }, [state.db, id]);

  useEffect(() => {
    let mounted = true;
    let subscription: Location.LocationSubscription | undefined;
    void (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) return;
      subscription = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, timeInterval: 1_000, distanceInterval: 1 }, (position) => {
        if (mounted) setLiveCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      });
    })().catch(() => undefined);
    return () => { mounted = false; subscription?.remove(); };
  }, []);

  useEffect(() => {
    let mounted = true;
    void Location.getLastKnownPositionAsync({ maxAge: 15 * 60 * 1000, requiredAccuracy: 5_000 }).then((position) => {
      if (mounted && position) setLastKnownCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  const userCoordinates = liveCoordinates ?? location.coordinates ?? lastKnownCoordinates;
  const distanceKm = useMemo(() => spot && userCoordinates ? haversineDistanceKm(userCoordinates, spot.coordinates) : null, [spot, userCoordinates]);
  if (!state.ready || !spot) return <Loading />;
  const currentSpot = spot;

  const spotId = spot.id;
  const favorite = state.favoriteIds.includes(spot.id);
  const gearRule = GEAR_RULES.find((rule) => rule.speciesId === state.targetSpecies);
  const gearMatch = matchGear(state.gear ?? undefined, state.targetSpecies, spot);
  const regulation = SPECIES_REGULATIONS[state.targetSpecies];
  const safety = evaluateSafety(spot, condition ?? undefined, state.experience);
  const primarySpecies = SPECIES.find((item) => item.id === spot.targetSpecies[0])?.nameTr ?? "Belirsiz";
  const score = safety.allowed ? Math.round(spot.confidenceScore * 100) : 0;
  const scoreLabel = score >= 80 ? "Çok uygun" : score >= 60 ? "Uygun" : score > 0 ? "Kontrol et" : "Uygun değil";
  const verificationLabel = spot.verificationStatus === "VERIFIED" ? "Doğrulanmış" : spot.verificationStatus === "COMMUNITY" ? "Topluluk" : spot.verificationStatus === "WEB_DISCOVERED" ? "Web keşfi" : "Potansiyel";
  const regulationAgeDays = Math.floor((runtimeStartedAt - new Date(REGULATION_VERSION.checkedAt).getTime()) / 86_400_000);
  const localHour = new Date(runtimeStartedAt).getHours();
  const isNight = localHour < 5 || localHour >= 21;
  const heroPath = spot.photoPaths?.find((path) => path.startsWith("file:") || path.startsWith("content:"));
  const marker = { type: "FeatureCollection" as const, features: [{ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [spot.coordinates.longitude, spot.coordinates.latitude] }, properties: {} }] };
  const timeSlots = condition?.sunrise ? [0, 3, 6, 9, 12].map((offset, index) => ({ label: timeRange(condition.sunrise!, offset), state: index === 0 ? "En uygun" : index < 2 ? "Uygun" : "Orta" })) : ["06–09", "09–12", "12–15", "15–18", "18–21"].map((label, index) => ({ label, state: index === 0 ? "En uygun" : index === 1 || index === 4 ? "Uygun" : "Orta" }));
  const hazards = [...spot.knownHazards, ...spot.accessWarnings].filter(Boolean).slice(0, 4);

  async function offline() {
    if (!state.db) return;
    try {
      await downloadOfflineRegion(state.db, { id: "sakarya-north-v1", name: "Sakarya Kuzey Sahili", bounds: SAKARYA_NORTH_BOUNDS }, setProgress);
      Alert.alert("Çevrimdışı harita hazır", "Harita verisi uçak modunda da kullanılabilir.");
    } catch { Alert.alert("Çevrimdışı harita hazırlanamadı", "Depolama alanını kontrol et."); }
  }

  async function feedback(feedbackType: "LOCATION_CORRECT" | "FISHABLE" | "ACCESS_CHANGED" | "PROHIBITED" | "DANGEROUS") {
    if (!state.db) return;
    await saveFeedback(state.db, spotId, feedbackType);
    Alert.alert("Teşekkürler", "Geri bildirimin kuyruğa alındı.");
  }

  async function shareSpot() {
    await Share.share({ title: currentSpot.canonicalName, message: `${currentSpot.canonicalName} · ${currentSpot.district}, ${currentSpot.province}` });
  }

  function openDirections() {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${currentSpot.coordinates.latitude},${currentSpot.coordinates.longitude}`;
    void Linking.openURL(url);
  }

  return <Screen>
    <Stack.Screen options={{ title: "Mera Detayı", headerTitleAlign: "center", headerTitleStyle: { fontFamily: "serif", fontWeight: "700" }, headerRight: () => <Pressable accessibilityRole="button" accessibilityLabel="Paylaş" hitSlop={10} onPress={shareSpot} style={styles.headerShare}><Ionicons name="share-outline" size={22} color={colors.ink} /></Pressable> }} />
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.detailHero}><View style={styles.heroHeader}><View style={styles.heroCopy}><Text style={styles.heroSpotTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.84}>{spot.canonicalName}</Text><Text style={styles.heroLocation}>{spot.district} · {distanceKm === null ? "—" : `${distanceKm.toFixed(0)} km`}</Text><Pressable accessibilityRole="button" accessibilityLabel={`${verificationLabel} doğrulama bilgisi`} onPress={() => setVerificationVisible(true)} style={styles.verification}><Ionicons name={spot.verificationStatus === "VERIFIED" ? "shield-checkmark-outline" : "information-circle-outline"} size={18} color={spot.verificationStatus === "VERIFIED" ? colors.moss : colors.water} /><Text style={styles.verificationText}>{verificationLabel}</Text><Ionicons name="information-circle-outline" size={17} color={colors.muted} /></Pressable></View><View style={[styles.score, score >= 60 ? styles.scorePositive : styles.scoreCaution]}><Text style={[styles.scoreNumberLight, score >= 60 ? styles.scorePositiveText : styles.scoreCautionText]}>{score}</Text><Text style={[styles.scoreLabelLight, score >= 60 ? styles.scorePositiveText : styles.scoreCautionText]}>{scoreLabel}</Text></View></View><View style={styles.heroMedia}>{heroPath ? <Image source={{ uri: heroPath }} style={styles.heroImage} resizeMode="cover" /> : <Image source={fallbackHero} style={styles.heroImage} resizeMode="cover" />}<Pressable accessibilityRole="button" accessibilityLabel="Haritada konumu aç" onPress={() => router.push({ pathname: "/(tabs)/map", params: { spotId: spot.id } })} style={styles.heroMiniMap}><Map pointerEvents="none" style={styles.heroMap} mapStyle={process.env.EXPO_PUBLIC_MAP_STYLE_URL ?? fallbackMapStyle}><Camera initialViewState={{ center: [spot.coordinates.longitude, spot.coordinates.latitude], zoom: 12 }} />{!process.env.EXPO_PUBLIC_MAP_STYLE_URL && <BundledBasemapLayers />}<GeoJSONSource id={`hero-marker-${spot.id}`} data={marker}><Layer id={`hero-marker-layer-${spot.id}`} type="circle" paint={{ "circle-radius": 8, "circle-color": colors.water, "circle-stroke-color": colors.white, "circle-stroke-width": 3 }} /></GeoJSONSource></Map><View style={styles.heroPin}><Ionicons name="location" size={27} color={colors.water} /></View></Pressable></View></View>
      {!safety.allowed && <View style={styles.alertSurface}><Ionicons name="warning-outline" size={20} color={colors.warning} /><Text style={styles.alertText}>Bugün uygun değil</Text>{safety.reasonCodes.slice(0, 2).map((code) => <Text key={code} style={styles.alertDetail}>{safetyReasonTr(code)}</Text>)}</View>}
      {isNight && <View style={styles.alertSurface}><Ionicons name="moon-outline" size={20} color={colors.warning} /><Text style={styles.alertText}>Gece dikkat</Text><Text style={styles.alertDetail}>Aydınlatma ve yerel koşulları kontrol et.</Text></View>}
      <View style={styles.factsSurface}><Fact label="Hedef Balık" value={primarySpecies} icon="fish-outline" /><Fact label="Kıyı Tipi" value={coastlineTypeText[spot.coastlineType]} icon="water-outline" /><Fact label="Seviye Uygunluğu" value={beginnerSuitabilityText[spot.beginnerSuitability]} icon="bar-chart-outline" /><Fact label="Erişim & Park" value={spot.parkingNotes ? "Park var" : accessTypeText[spot.accessType]} icon="car-outline" /><Fact label="Bilinen Riskler" value={hazards[0] ? compactHazard(hazards[0]) : "—"} icon="warning-outline" last /></View>
      <View style={styles.weatherSurface}><Text style={styles.referenceSectionTitle}>Hava & Deniz Durumu</Text>{condition ? <View style={styles.conditionRow}><Metric label="Dalga" value={`${condition.waveHeightM ?? "—"} m`} tone="sea" icon="water-outline" /><Metric label="Rüzgâr" value={`${condition.windSpeedKmh ?? "—"} km/s`} tone="wind" icon="rainy-outline" /><Metric label="Deniz" value={`${condition.seaSurfaceTemperatureC ?? "—"}°C`} tone="sea" icon="thermometer-outline" /><Metric label="Nem" value="—" tone="wind" icon="water-outline" /></View> : <View style={styles.neutralSurface}><Text style={styles.muted}>Güncel koşul verisi yok</Text></View>}</View>
      <View style={styles.timeSurface}><Text style={styles.referenceSectionTitle}>Bugün için uygun saatler</Text><View style={styles.timeline}>{timeSlots.map((slot) => <TimeSlot key={slot.label} slot={slot} />)}</View></View>
      {gearRule && <View style={styles.gearSurface}><Text style={styles.referenceSectionTitle}>Başlangıç takım önerisi</Text><View style={styles.gearRow}><Ionicons name="fish-outline" size={21} color={gearMatch.reasonCode === "GEAR_GOOD_MATCH" ? colors.moss : colors.water} /><Text style={styles.gearReferenceText}>{gearRule.suggestionTr}</Text></View></View>}
      <SectionTitle>Konum</SectionTitle><View style={styles.mapCard}><Map style={styles.map} mapStyle={process.env.EXPO_PUBLIC_MAP_STYLE_URL ?? fallbackMapStyle}><Camera initialViewState={{ center: [spot.coordinates.longitude, spot.coordinates.latitude], zoom: 12 }} />{!process.env.EXPO_PUBLIC_MAP_STYLE_URL && <BundledBasemapLayers />}<GeoJSONSource id={`detail-marker-${spot.id}`} data={marker}><Layer id={`detail-marker-layer-${spot.id}`} type="circle" paint={{ "circle-radius": 9, "circle-color": colors.water, "circle-stroke-color": colors.white, "circle-stroke-width": 3 }} /></GeoJSONSource></Map><Text style={styles.caption}>{distanceKm === null ? "Mesafe için konum izni gerekli" : `Kuş uçuşu ${distanceKm.toFixed(1)} km`}</Text>{distanceKm === null && <Button title={location.loading ? "Konum alınıyor…" : "Konumumla hesapla"} variant="secondary" disabled={location.loading} onPress={location.request} />}</View>
      {progress !== null && <Text style={styles.caption}>%{Math.round(progress)}</Text>}
      <AdvancedSections regulation={regulation} regulationAgeDays={regulationAgeDays} feedback={feedback} />
    </ScrollView>
    <View style={styles.stickyBar}><Pressable accessibilityRole="button" accessibilityLabel="Yol tarifi" onPress={openDirections} style={styles.stickyPrimaryButton}><Ionicons name="car-outline" size={18} color={colors.white} /><Text style={styles.stickyPrimaryText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>Yol tarifi</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Pusulayla yönel" onPress={() => router.push({ pathname: "/compass", params: { spotId: spot.id } })} style={styles.stickySecondary}><Ionicons name="compass-outline" size={18} color={colors.ink} /><Text style={styles.stickySecondaryText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>Pusula</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Offline indir" onPress={offline} style={styles.stickySecondary}><Ionicons name="download-outline" size={18} color={colors.ink} /><Text style={styles.stickySecondaryText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>Offline</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={favorite ? "Kaydı kaldır" : "Kaydet"} onPress={() => state.toggleFavorite(spot.id)} style={styles.stickySecondary}><Ionicons name={favorite ? "bookmark" : "bookmark-outline"} size={18} color={colors.ink} /><Text style={[styles.stickySecondaryText, favorite && styles.stickySavedText]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>{favorite ? "Kaydedildi" : "Kaydet"}</Text></Pressable></View>
    <MeraBottomNavigation includeSafeArea={false} onNavigate={(tab) => openMainTab(tab)} />
    <Modal visible={verificationVisible} transparent animationType="slide" onRequestClose={() => setVerificationVisible(false)}><Pressable style={styles.sheetBackdrop} onPress={() => setVerificationVisible(false)}><Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}><View style={styles.sheetHandle} /><View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{verificationLabel}</Text><Pressable accessibilityRole="button" accessibilityLabel="Kapat" onPress={() => setVerificationVisible(false)}><Ionicons name="close" size={24} color={colors.ink} /></Pressable></View><View style={styles.sheetFacts}><Text style={styles.sheetFact}>3 kaynak</Text><Text style={styles.sheetFact}>18 Ağu 2026</Text></View><Text style={styles.sheetNote}>Konum teyididir; balık veya güvenlik garantisi değildir.</Text><Text style={styles.sheetLink}>Kaynakları gör</Text></Pressable></Pressable></Modal>
  </Screen>;
}

function SectionTitle({ children }: { children: string }) { return <Text style={styles.sectionTitleLight}>{children}</Text>; }
function Fact({ label, value, icon, last = false }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; last?: boolean }) { return <View style={[styles.factTile, !last && styles.factDivider]}><Ionicons name={icon} size={22} color={colors.water} /><Text style={styles.factLabelLight}>{label}</Text><Text style={styles.factValueLight} numberOfLines={2}>{value}</Text></View>; }
function Metric({ label, value, tone, icon }: { label: string; value: string; tone: "sea" | "wind"; icon: keyof typeof Ionicons.glyphMap }) { return <View style={[styles.metric, tone === "sea" ? styles.seaSurface : styles.windSurface]}><Ionicons name={icon} size={26} color={tone === "sea" ? colors.water : colors.muted} /><View style={styles.metricCopy}><Text style={styles.metricLabelLight} numberOfLines={1}>{label}</Text><Text style={styles.metricValueLight} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{value}</Text></View></View>; }
function TimeSlot({ slot }: { slot: { label: string; state: string } }) { return <View style={[styles.timeSlot, slot.state === "En uygun" && styles.timeBest, slot.state === "Orta" && styles.timeMuted]}><Text style={styles.timeLabelLight} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{slot.label}</Text><Text style={styles.timeStateLight} numberOfLines={1}>{slot.state}</Text></View>; }
function Chip({ label, tone }: { label: string; tone: "positive" | "warning" }) { return <View style={[styles.chip, tone === "positive" ? styles.positiveChip : styles.warningChip]}><Text style={styles.chipTextLight}>{label}</Text></View>; }
function openMainTab(tab: MeraTabKey) { const paths: Record<MeraTabKey, "/(tabs)" | "/(tabs)/map" | "/(tabs)/saved" | "/(tabs)/catches" | "/(tabs)/profile"> = { index: "/(tabs)", map: "/(tabs)/map", saved: "/(tabs)/saved", catches: "/(tabs)/catches", profile: "/(tabs)/profile" }; router.replace(paths[tab]); }
function FeedbackAction({ label, icon, tone, last = false, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; tone: "positive" | "neutral" | "warning"; last?: boolean; onPress: () => void }) {
  const color = tone === "positive" ? "#2E8A4C" : tone === "warning" ? colors.warning : colors.water;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.feedbackAction, !last && styles.feedbackDivider]}><Ionicons name={icon} size={21} color={color} /><Text style={styles.feedbackActionText}>{label}</Text><Ionicons name="chevron-forward" size={18} color={colors.muted} /></Pressable>;
}

function AdvancedSections({ regulation, regulationAgeDays, feedback }: { regulation?: (typeof SPECIES_REGULATIONS)[keyof typeof SPECIES_REGULATIONS]; regulationAgeDays: number; feedback: (type: "LOCATION_CORRECT" | "FISHABLE" | "ACCESS_CHANGED" | "PROHIBITED" | "DANGEROUS") => void }) {
  return <View style={styles.advanced}><SectionTitle>Kurallar</SectionTitle><View style={styles.advancedSurface}>{regulation ? <Text style={styles.factValue}>Asgari {regulation.minimumLengthCm} cm · limit {regulation.limit} kg</Text> : <Text style={styles.warning}>Özel boy satırı yok</Text>}<Text style={styles.caption}>{regulation?.noteTr}</Text><Text style={styles.caption}>{GENERAL_SEA_REGULATION_TR}</Text>{regulationAgeDays > 90 && <Text style={styles.warning}>Kontrol eski · güncel metni aç</Text>}<Text style={styles.link} onPress={() => Linking.openURL(REGULATION_VERSION.sourceUrl)}>Resmî tebliği aç ↗</Text></View><SectionTitle>Geri bildirim</SectionTitle><View style={styles.feedbackSurface}><FeedbackAction label="Konum doğru" icon="checkmark-circle-outline" tone="positive" onPress={() => feedback("LOCATION_CORRECT")} /><FeedbackAction label="Erişim değişti" icon="car-outline" tone="neutral" onPress={() => feedback("ACCESS_CHANGED")} /><FeedbackAction label="Tehlike bildir" icon="warning-outline" tone="warning" last onPress={() => feedback("DANGEROUS")} /></View></View>;
}

function timeRange(sunrise: string, offset: number) { const start = new Date(new Date(sunrise).getTime() + offset * 3_600_000); const end = new Date(start.getTime() + 3 * 3_600_000); return `${formatTime(start.toISOString())}–${formatTime(end.toISOString())}`; }
function formatTime(value: string) { return new Date(value).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }); }
function compactHazard(value: string) { if (/akınt/i.test(value)) return "Akıntı"; if (/kaygan|ıslak/i.test(value)) return "Kaygan taş"; if (/dalga/i.test(value)) return "Dalga"; return value.split(/[.!?]/)[0].slice(0, 18); }

const styles = StyleSheet.create({
  scroll: { backgroundColor: "#FAFCFB" },
  pageTitle: { flex: 1, color: colors.ink, fontSize: 22, fontWeight: "700", textAlign: "center", marginLeft: 44 },
  detailHero: { overflow: "hidden", borderRadius: 18, borderWidth: 1, borderColor: "#DDE5E7", backgroundColor: colors.white },
  heroHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, padding: spacing.md, paddingBottom: 12 },
  headerShare: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  heroSpotTitle: { color: "#0B2440", fontFamily: "serif", fontSize: 26, lineHeight: 31, fontWeight: "700", flexShrink: 1 },
  heroLocation: { color: colors.muted, fontFamily: "sans-serif", fontSize: 16, lineHeight: 22, marginTop: 3 },
  scoreNumberLight: { fontFamily: "serif", fontSize: 31, lineHeight: 35, fontWeight: "700" },
  scoreLabelLight: { fontFamily: "serif", fontSize: 12, fontWeight: "700" },
  sectionTitleLight: { color: "#0B2440", fontFamily: "serif", fontSize: 18, lineHeight: 23, fontWeight: "700", marginTop: spacing.sm },
  factsSurface: { borderRadius: 18, borderWidth: 1, borderColor: "#DDE5E7", backgroundColor: colors.white, paddingHorizontal: spacing.md },
  factTile: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 10 },
  factDivider: { borderBottomWidth: 1, borderBottomColor: "#E2E8ED" },
  factLabelLight: { flex: 1, color: "#0B2440", fontFamily: "sans-serif", fontSize: 15, fontWeight: "500" },
  factValueLight: { maxWidth: "54%", color: "#0B2440", fontFamily: "sans-serif", fontSize: 15, fontWeight: "600", textAlign: "right" },
  metricLabelLight: { color: colors.muted, fontFamily: "sans-serif", fontSize: 12, fontWeight: "500" },
  metricValueLight: { color: colors.ink, fontFamily: "sans-serif", fontSize: 16, fontWeight: "600" },
  timeLabelLight: { color: colors.ink, fontFamily: "sans-serif", fontSize: 12, fontWeight: "600" },
  timeStateLight: { color: colors.muted, fontFamily: "sans-serif", fontSize: 10, marginTop: 4, fontWeight: "500" },
  gearTitleLight: { color: colors.ink, fontFamily: "sans-serif", fontSize: 17, fontWeight: "600" },
  chipTextLight: { color: colors.ink, fontFamily: "sans-serif", fontSize: 13, fontWeight: "600" },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: 182 }, topRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", minHeight: 36 }, eyebrow: { flexDirection: "row", alignItems: "center", gap: 6 }, location: { color: colors.muted, fontSize: 15, fontWeight: "700" }, iconButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: "#DDE5E7", backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  hero: { height: 250, borderRadius: 22, overflow: "hidden", backgroundColor: colors.soft }, heroMedia: { height: 230, position: "relative" }, heroImage: { width: "100%", height: "100%" }, heroFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "#DCEFF1" }, heroOverlay: { flex: 1, padding: spacing.md, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", backgroundColor: "rgba(7,31,52,0.18)" }, heroCopy: { flex: 1, minWidth: 0 }, title: { color: colors.white, fontFamily: "serif", fontSize: 30, lineHeight: 36, fontWeight: "700" }, subtitle: { color: colors.white, fontFamily: "sans-serif", fontSize: 16, marginTop: 4, fontWeight: "600" }, score: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, minWidth: 76, alignItems: "center", borderWidth: 1 }, scorePositive: { backgroundColor: "#F1F8F2", borderColor: "#B6D8BD" }, scoreCaution: { backgroundColor: "#FFF8EC", borderColor: "#E4C98D" }, scorePositiveText: { color: "#3E7C50" }, scoreCautionText: { color: "#9A651C" }, scoreNumber: { color: colors.ink, fontFamily: "serif", fontSize: 29, lineHeight: 32, fontWeight: "700" }, scoreLabel: { color: colors.ink, fontFamily: "serif", fontSize: 12, fontWeight: "700" }, verification: { minHeight: 38, flexDirection: "row", alignItems: "center", gap: 7, marginTop: 12, paddingHorizontal: 10, alignSelf: "flex-start", borderRadius: 19, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, verificationText: { color: colors.ink, fontFamily: "sans-serif", fontSize: 14, fontWeight: "600" }, heroMiniMap: { position: "absolute", right: 12, bottom: 12, width: 132, height: 92, borderRadius: 14, overflow: "hidden", borderWidth: 3, borderColor: colors.white, backgroundColor: "#DDECF5" }, heroMap: { flex: 1 }, heroPin: { position: "absolute", left: "50%", top: "50%", marginLeft: -14, marginTop: -25, shadowColor: "#0B2440", shadowOpacity: 0.2, shadowRadius: 3 },
  referenceSectionTitle: { color: "#0B2440", fontFamily: "serif", fontSize: 18, lineHeight: 23, fontWeight: "700" }, weatherSurface: { borderRadius: 18, borderWidth: 1, borderColor: "#DDE5E7", padding: 12, gap: 12, backgroundColor: colors.white }, timeSurface: { borderRadius: 18, borderWidth: 1, borderColor: "#DDE5E7", padding: 12, gap: 10, backgroundColor: colors.white }, gearSurface: { borderRadius: 18, borderWidth: 1, borderColor: "#DDE5E7", padding: 12, gap: 10, backgroundColor: colors.white }, gearReferenceText: { flex: 1, color: "#0B2440", fontFamily: "sans-serif", fontSize: 15, fontWeight: "500" }, sectionTitle: { color: colors.ink, fontFamily: "serif", fontSize: 20, lineHeight: 25, fontWeight: "700", marginTop: spacing.sm }, factGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, fact: { width: "48%", minHeight: 72, backgroundColor: colors.soft, borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }, factLabel: { color: colors.muted, fontFamily: "sans-serif", fontSize: 12, fontWeight: "700" }, factValue: { color: colors.ink, fontFamily: "sans-serif", fontSize: 16, fontWeight: "600", marginTop: 2 }, conditionRow: { flexDirection: "row", gap: 8 }, metric: { flex: 1, minWidth: 0, minHeight: 86, flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, borderColor: "#DDE5E7", paddingHorizontal: 7, gap: 5, backgroundColor: colors.white }, metricCopy: { flex: 1, minWidth: 0 }, seaSurface: { backgroundColor: colors.white }, windSurface: { backgroundColor: colors.white }, metricLabel: { color: colors.muted, fontFamily: "sans-serif", fontSize: 12, fontWeight: "700" }, metricValue: { color: colors.ink, fontFamily: "sans-serif", fontSize: 16, fontWeight: "600" }, neutralSurface: { backgroundColor: colors.soft, borderRadius: 14, padding: 14 }, positiveSurface: { backgroundColor: "#E7F4EA", borderRadius: 14, padding: 14 }, caption: { color: colors.muted, fontFamily: "sans-serif", fontSize: 12, lineHeight: 18 }, muted: { color: colors.muted, fontFamily: "sans-serif", lineHeight: 20 },
  timeline: { flexDirection: "row", gap: 6 }, timelineRow: { flexDirection: "row", gap: 8 }, timelineSpacer: { flex: 1 }, timeSlot: { flex: 1, minWidth: 0, minHeight: 66, borderRadius: 10, borderWidth: 1, borderColor: "#DDE5E7", paddingVertical: 8, paddingHorizontal: 3, alignItems: "center", justifyContent: "center", backgroundColor: colors.white }, timeBest: { backgroundColor: "#F1F8F2", borderColor: "#98C7A5" }, timeMuted: { backgroundColor: "#F6F7F8" }, timeLabel: { color: colors.ink, fontFamily: "sans-serif", fontSize: 12, fontWeight: "600" }, timeState: { color: colors.muted, fontFamily: "sans-serif", fontSize: 10, marginTop: 4 }, gearRow: { flexDirection: "row", alignItems: "center", gap: 12 }, gearTitle: { color: colors.ink, fontFamily: "sans-serif", fontSize: 17, fontWeight: "600" }, chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, chip: { borderRadius: 18, paddingHorizontal: 12, paddingVertical: 9 }, positiveChip: { backgroundColor: "#E7F4EA" }, warningChip: { backgroundColor: "#FFF1D9" }, chipText: { color: colors.ink, fontFamily: "sans-serif", fontSize: 13, fontWeight: "600" }, mapCard: { gap: spacing.sm }, map: { height: 180, borderRadius: 16, overflow: "hidden" }, secondaryActions: { gap: spacing.sm }, alertSurface: { backgroundColor: "#FFF1D9", borderRadius: 14, padding: 12, gap: 3 }, alertText: { color: colors.warning, fontFamily: "sans-serif", fontWeight: "700" }, alertDetail: { color: colors.warning, fontFamily: "sans-serif", fontSize: 13 },
  advanced: { gap: spacing.sm, marginTop: spacing.md }, advancedSurface: { backgroundColor: colors.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 12, gap: 10 }, input: { minHeight: 86, borderWidth: 1, borderColor: colors.border, borderRadius: 12, color: colors.ink, fontFamily: "sans-serif", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.bg, textAlignVertical: "top" }, report: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, gap: 2 }, feedbackSurface: { overflow: "hidden", borderRadius: 16, borderWidth: 1, borderColor: "#DDE5E7", backgroundColor: colors.white }, feedbackAction: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14 }, feedbackDivider: { borderBottomWidth: 1, borderBottomColor: "#E2E8ED" }, feedbackActionText: { flex: 1, color: "#0B2440", fontFamily: "sans-serif", fontSize: 15, fontWeight: "600" }, warning: { color: colors.warning, fontFamily: "sans-serif", lineHeight: 20, fontWeight: "600" }, link: { color: colors.water, fontFamily: "sans-serif", lineHeight: 22, textDecorationLine: "underline" }, stickyBar: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: spacing.md, paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#DDE5E7", backgroundColor: colors.white }, stickyPrimary: { flex: 1 }, stickyPrimaryButton: { flex: 1, minWidth: 0, minHeight: 52, flexDirection: "row", gap: 4, borderRadius: 12, backgroundColor: "#0B2440", alignItems: "center", justifyContent: "center", paddingHorizontal: 4, paddingVertical: spacing.sm }, stickyPrimaryText: { flexShrink: 1, color: colors.white, fontFamily: "sans-serif", fontSize: 11, fontWeight: "700" }, stickySecondary: { flex: 1, minWidth: 0, minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, paddingHorizontal: 4, borderRadius: 12, borderWidth: 1, borderColor: "#C7D3D8", backgroundColor: colors.white }, stickySecondaryText: { flexShrink: 1, color: "#0B2440", fontFamily: "sans-serif", fontSize: 11, fontWeight: "600" }, stickySavedText: { fontSize: 10 }, detailTabBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", minHeight: 66, paddingHorizontal: 8, paddingBottom: 6, borderTopWidth: 1, borderTopColor: "#DDE5E7", backgroundColor: colors.white }, detailTab: { flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center", gap: 3, minHeight: 52 }, detailTabLabel: { maxWidth: "100%", color: colors.muted, fontFamily: "sans-serif", fontSize: 10, fontWeight: "600" },
  sheetBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(9,29,47,0.28)" }, sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, gap: spacing.md }, sheetHandle: { alignSelf: "center", width: 42, height: 4, borderRadius: 2, backgroundColor: colors.border }, sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, sheetTitle: { color: colors.ink, fontFamily: "serif", fontSize: 24, fontWeight: "700" }, sheetFacts: { flexDirection: "row", gap: 10 }, sheetFact: { color: colors.ink, backgroundColor: colors.soft, borderRadius: 10, fontFamily: "sans-serif", padding: 10, fontWeight: "600" }, sheetNote: { color: colors.muted, fontFamily: "sans-serif", lineHeight: 20 }, sheetLink: { color: colors.water, fontFamily: "sans-serif", fontWeight: "600", textDecorationLine: "underline" }
});
