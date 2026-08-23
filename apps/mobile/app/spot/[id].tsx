import { Camera, GeoJSONSource, Layer, Map } from "@maplibre/maplibre-react-native";
import { Ionicons } from "@expo/vector-icons";
import { GENERAL_SEA_REGULATION_TR, GEAR_RULES, REGULATION_VERSION, SPECIES, SPECIES_REGULATIONS } from "@mera/config";
import { evaluateSafety, haversineDistanceKm, matchGear, stalenessLabelTr } from "@mera/domain";
import type { ConditionSnapshot, Spot } from "@mera/types";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { Button, Loading, Screen } from "@/components";
import { conditionsMap, getSpot, getSpotNote, listCatchReportsForSpot, saveFeedback, saveSpotNote, trackEvent } from "@/db";
import { useCurrentLocation } from "@/location";
import { downloadOfflineRegion, fallbackMapStyle, SAKARYA_NORTH_BOUNDS } from "@/map";
import { BundledBasemapLayers } from "@/mapLayers";
import { accessTypeText, beginnerSuitabilityText, catchResultTr, coastlineTypeText, safetyReasonTr, syncStatusTr } from "@/labels";
import { useAppState } from "@/store";
import { colors, spacing } from "@/theme";

type LocalReport = Awaited<ReturnType<typeof listCatchReportsForSpot>>[number];
const runtimeStartedAt = Date.now();

export default function SpotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useAppState();
  const location = useCurrentLocation();
  const [spot, setSpot] = useState<Spot | null>(null);
  const [condition, setCondition] = useState<ConditionSnapshot | null>(null);
  const [reports, setReports] = useState<LocalReport[]>([]);
  const [personalNote, setPersonalNote] = useState("");
  const [savedPersonalNote, setSavedPersonalNote] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [verificationVisible, setVerificationVisible] = useState(false);

  useEffect(() => {
    if (!state.db || !id) return;
    void getSpot(state.db, id).then(setSpot);
    void conditionsMap(state.db).then((map) => setCondition(map.get(id) ?? null));
    void listCatchReportsForSpot(state.db, id).then(setReports);
    void getSpotNote(state.db, id).then((note) => { setPersonalNote(note); setSavedPersonalNote(note); });
    void trackEvent(state.db, "spot_opened", { verification: "local" });
  }, [state.db, id]);

  const distanceKm = useMemo(() => spot && location.coordinates ? haversineDistanceKm(location.coordinates, spot.coordinates) : null, [spot, location.coordinates]);
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

  async function persistPersonalNote() {
    if (!state.db) return;
    await saveSpotNote(state.db, spotId, personalNote);
    const normalized = personalNote.trim();
    setPersonalNote(normalized);
    setSavedPersonalNote(normalized);
    Alert.alert(normalized ? "Not kaydedildi" : "Not silindi", "Not yalnızca bu cihazda tutulur.");
  }

  async function shareSpot() {
    await Share.share({ title: currentSpot.canonicalName, message: `${currentSpot.canonicalName} · ${currentSpot.district}, ${currentSpot.province}` });
  }

  function openDirections() {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${currentSpot.coordinates.latitude},${currentSpot.coordinates.longitude}`;
    void Linking.openURL(url);
  }

  return <Screen>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.topRow}><View style={styles.eyebrow}><Ionicons name="location-outline" size={17} color={colors.water} /><Text style={styles.location}>{spot.district} · {distanceKm === null ? "—" : `${distanceKm.toFixed(0)} km`}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Paylaş" hitSlop={10} onPress={shareSpot} style={styles.iconButton}><Ionicons name="share-outline" size={22} color={colors.ink} /></Pressable></View>
      <View style={styles.hero}>{heroPath ? <Image source={{ uri: heroPath }} style={styles.heroImage} resizeMode="cover" /> : <View style={[styles.heroImage, styles.heroFallback]}><Ionicons name="water-outline" size={52} color={colors.water} /></View>}<View style={styles.heroOverlay}><View style={styles.heroCopy}><Text style={styles.title}>{spot.canonicalName}</Text><Text style={styles.subtitle}>{spot.district}, {spot.province}</Text></View><View style={[styles.score, score >= 70 ? styles.scoreGood : styles.scoreCaution]}><Text style={styles.scoreNumber}>{score}</Text><Text style={styles.scoreLabel}>{scoreLabel}</Text></View></View></View>
      <Pressable accessibilityRole="button" accessibilityLabel={`${verificationLabel} doğrulama bilgisi`} onPress={() => setVerificationVisible(true)} style={styles.verification}><Ionicons name={spot.verificationStatus === "VERIFIED" ? "shield-checkmark-outline" : "information-circle-outline"} size={19} color={spot.verificationStatus === "VERIFIED" ? colors.moss : colors.water} /><Text style={styles.verificationText}>{verificationLabel}</Text><Ionicons name="information-circle-outline" size={18} color={colors.muted} /></Pressable>
      {!safety.allowed && <View style={styles.alertSurface}><Ionicons name="warning-outline" size={20} color={colors.warning} /><Text style={styles.alertText}>Bugün uygun değil</Text>{safety.reasonCodes.slice(0, 2).map((code) => <Text key={code} style={styles.alertDetail}>{safetyReasonTr(code)}</Text>)}</View>}
      {isNight && <View style={styles.alertSurface}><Ionicons name="moon-outline" size={20} color={colors.warning} /><Text style={styles.alertText}>Gece dikkat</Text><Text style={styles.alertDetail}>Aydınlatma ve yerel koşulları kontrol et.</Text></View>}
      <SectionTitle>Hızlı bilgiler</SectionTitle><View style={styles.factGrid}><Fact label="Balık" value={primarySpecies} icon="fish-outline" /><Fact label="Kıyı" value={coastlineTypeText[spot.coastlineType]} icon="water-outline" /><Fact label="Seviye" value={beginnerSuitabilityText[spot.beginnerSuitability]} icon="bar-chart-outline" /><Fact label="Park" value={spot.parkingNotes ? "Var" : "Bilinmiyor"} icon="car-outline" /></View>
      <SectionTitle>Hava & Deniz</SectionTitle>{condition ? <View style={styles.conditionRow}><Metric label="Dalga" value={`${condition.waveHeightM ?? "—"} m`} tone="sea" icon="water-outline" /><Metric label="Rüzgâr" value={`${condition.windSpeedKmh ?? "—"} km/s`} tone="wind" icon="rainy-outline" /><Metric label="Deniz" value={`${condition.seaSurfaceTemperatureC ?? "—"}°C`} tone="sea" icon="thermometer-outline" /></View> : <View style={styles.neutralSurface}><Text style={styles.muted}>Güncel koşul verisi yok</Text></View>}{condition && <Text style={styles.caption}>{stalenessLabelTr(condition.fetchedAt)} · {new Date(condition.observedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</Text>}
      <SectionTitle>Uygun saatler</SectionTitle><View style={styles.timeline}>{timeSlots.map((slot) => <View key={slot.label} style={[styles.timeSlot, slot.state === "En uygun" && styles.timeBest, slot.state === "Orta" && styles.timeMuted]}><Text style={styles.timeLabel}>{slot.label}</Text><Text style={styles.timeState}>{slot.state}</Text></View>)}</View>
      <SectionTitle>Takım</SectionTitle>{gearRule ? <View style={[styles.gearRow, gearMatch.reasonCode === "GEAR_GOOD_MATCH" ? styles.positiveSurface : styles.neutralSurface]}><Ionicons name="fish-outline" size={21} color={gearMatch.reasonCode === "GEAR_GOOD_MATCH" ? colors.moss : colors.water} /><View><Text style={styles.gearTitle}>{gearRule.suggestionTr.split("•")[0].trim() || "Kısa çapari"}</Text><Text style={styles.caption}>{gearMatch.reasonCode === "GEAR_GOOD_MATCH" ? "Uygun eşleşme" : "Kontrol et"} · {gearRule.suggestionTr.match(/\d+\s*g/i)?.[0] ?? "15 g"}</Text></View></View> : <View style={styles.neutralSurface}><Text style={styles.muted}>Takım önerisi yok</Text></View>}
      <SectionTitle>Risk & Erişim</SectionTitle><View style={styles.chipWrap}><Chip label={accessTypeText[spot.accessType] === "Bilinmiyor" ? "Erişim belirsiz" : "Kolay erişim"} tone="positive" />{spot.parkingNotes && <Chip label="Park var" tone="positive" />}{hazards.map((item) => <Chip key={item} label={compactHazard(item)} tone="warning" />)}</View>
      <SectionTitle>Konum</SectionTitle><View style={styles.mapCard}><Map style={styles.map} mapStyle={process.env.EXPO_PUBLIC_MAP_STYLE_URL ?? fallbackMapStyle}><Camera initialViewState={{ center: [spot.coordinates.longitude, spot.coordinates.latitude], zoom: 12 }} />{!process.env.EXPO_PUBLIC_MAP_STYLE_URL && <BundledBasemapLayers />}<GeoJSONSource id={`detail-marker-${spot.id}`} data={marker}><Layer id={`detail-marker-layer-${spot.id}`} type="circle" paint={{ "circle-radius": 9, "circle-color": colors.water, "circle-stroke-color": colors.white, "circle-stroke-width": 3 }} /></GeoJSONSource></Map><Text style={styles.caption}>{distanceKm === null ? "Mesafe için konum izni gerekli" : `Kuş uçuşu ${distanceKm.toFixed(1)} km`}</Text>{distanceKm === null && <Button title={location.loading ? "Konum alınıyor…" : "Konumumla hesapla"} variant="secondary" disabled={location.loading} onPress={location.request} />}</View>
      <View style={styles.secondaryActions}><Button title="Çevrimdışı haritayı hazırla" variant="secondary" onPress={offline} />{progress !== null && <Text style={styles.caption}>%{Math.round(progress)}</Text>}</View>
      <AdvancedSections spot={spot} reports={reports} personalNote={personalNote} savedPersonalNote={savedPersonalNote} setPersonalNote={setPersonalNote} persistPersonalNote={persistPersonalNote} regulation={regulation} regulationAgeDays={regulationAgeDays} feedback={feedback} />
    </ScrollView>
    <View style={styles.stickyBar}><View style={styles.stickyPrimary}><Button title="Yol tarifi" onPress={openDirections} /></View><Pressable accessibilityRole="button" accessibilityLabel="Pusula" onPress={() => router.push({ pathname: "/compass", params: { spotId: spot.id } })} style={styles.stickySecondary}><Ionicons name="compass-outline" size={20} color={colors.ink} /><Text style={styles.stickySecondaryText}>Pusula</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={favorite ? "Kaydı kaldır" : "Kaydet"} onPress={() => state.toggleFavorite(spot.id)} style={styles.stickySecondary}><Ionicons name={favorite ? "bookmark" : "bookmark-outline"} size={20} color={colors.ink} /><Text style={styles.stickySecondaryText}>{favorite ? "Kayıtlı" : "Kaydet"}</Text></Pressable></View>
    <Modal visible={verificationVisible} transparent animationType="slide" onRequestClose={() => setVerificationVisible(false)}><Pressable style={styles.sheetBackdrop} onPress={() => setVerificationVisible(false)}><Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}><View style={styles.sheetHandle} /><View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{verificationLabel}</Text><Pressable accessibilityRole="button" accessibilityLabel="Kapat" onPress={() => setVerificationVisible(false)}><Ionicons name="close" size={24} color={colors.ink} /></Pressable></View><View style={styles.sheetFacts}><Text style={styles.sheetFact}>3 kaynak</Text><Text style={styles.sheetFact}>18 Ağu 2026</Text></View><Text style={styles.sheetNote}>Konum teyididir; balık veya güvenlik garantisi değildir.</Text><Text style={styles.sheetLink}>Kaynakları gör</Text></Pressable></Pressable></Modal>
  </Screen>;
}

function SectionTitle({ children }: { children: string }) { return <Text style={styles.sectionTitle}>{children}</Text>; }
function Fact({ label, value, icon }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }) { return <View style={styles.fact}><Ionicons name={icon} size={20} color={colors.water} /><View><Text style={styles.factLabel}>{label}</Text><Text style={styles.factValue} numberOfLines={1}>{value}</Text></View></View>; }
function Metric({ label, value, tone, icon }: { label: string; value: string; tone: "sea" | "wind"; icon: keyof typeof Ionicons.glyphMap }) { return <View style={[styles.metric, tone === "sea" ? styles.seaSurface : styles.windSurface]}><Ionicons name={icon} size={20} color={tone === "sea" ? colors.water : colors.muted} /><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>; }
function Chip({ label, tone }: { label: string; tone: "positive" | "warning" }) { return <View style={[styles.chip, tone === "positive" ? styles.positiveChip : styles.warningChip]}><Text style={styles.chipText}>{label}</Text></View>; }
function AdvancedSections({ spot, reports, personalNote, savedPersonalNote, setPersonalNote, persistPersonalNote, regulation, regulationAgeDays, feedback }: { spot: Spot; reports: LocalReport[]; personalNote: string; savedPersonalNote: string; setPersonalNote: (value: string) => void; persistPersonalNote: () => void; regulation?: (typeof SPECIES_REGULATIONS)[keyof typeof SPECIES_REGULATIONS]; regulationAgeDays: number; feedback: (type: "LOCATION_CORRECT" | "FISHABLE" | "ACCESS_CHANGED" | "PROHIBITED" | "DANGEROUS") => void }) {
  return <View style={styles.advanced}><SectionTitle>Notlarım</SectionTitle><View style={styles.advancedSurface}><TextInput style={styles.input} value={personalNote} onChangeText={setPersonalNote} multiline maxLength={2000} placeholder="Kısa not" placeholderTextColor={colors.muted} /><Button title={personalNote.trim() ? "Notu kaydet" : "Notu sil"} variant="secondary" disabled={personalNote.trim() === savedPersonalNote} onPress={persistPersonalNote} /></View><SectionTitle>Yerel raporlar</SectionTitle><View style={styles.advancedSurface}>{reports.length === 0 ? <Text style={styles.muted}>Bu cihazda rapor yok.</Text> : reports.map((report) => <View key={report.id} style={styles.report}><Text style={styles.factValue}>{catchResultTr(report.payload.result)} · {String(report.payload.quantity ?? 0)} adet</Text><Text style={styles.caption}>{new Date(report.createdAt).toLocaleDateString("tr-TR")} · {syncStatusTr(report.syncStatus)}</Text></View>)}</View><SectionTitle>Kurallar</SectionTitle><View style={styles.advancedSurface}>{regulation ? <Text style={styles.factValue}>Asgari {regulation.minimumLengthCm} cm · limit {regulation.limit} kg</Text> : <Text style={styles.warning}>Özel boy satırı yok</Text>}<Text style={styles.caption}>{regulation?.noteTr}</Text><Text style={styles.caption}>{GENERAL_SEA_REGULATION_TR}</Text>{regulationAgeDays > 90 && <Text style={styles.warning}>Kontrol eski · güncel metni aç</Text>}<Text style={styles.link} onPress={() => Linking.openURL(REGULATION_VERSION.sourceUrl)}>Resmî tebliği aç ↗</Text></View><SectionTitle>Geri bildirim</SectionTitle><View style={styles.feedbackRow}><Button title="Konum doğru" variant="secondary" onPress={() => feedback("LOCATION_CORRECT")} /><Button title="Erişim değişti" variant="secondary" onPress={() => feedback("ACCESS_CHANGED")} /><Button title="Tehlike bildir" variant="danger" onPress={() => feedback("DANGEROUS")} /></View><SectionTitle>Kaynaklar</SectionTitle><View style={styles.advancedSurface}>{spot.sources.length === 0 ? <Text style={styles.muted}>Harici kaynak yok.</Text> : spot.sources.map((source) => <Text key={`${source.url}-${source.evidenceType}`} style={styles.link} onPress={() => Linking.openURL(source.url)}>• {source.title} ↗</Text>)}</View></View>;
}

function timeRange(sunrise: string, offset: number) { const start = new Date(new Date(sunrise).getTime() + offset * 3_600_000); const end = new Date(start.getTime() + 3 * 3_600_000); return `${formatTime(start.toISOString())}–${formatTime(end.toISOString())}`; }
function formatTime(value: string) { return new Date(value).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }); }
function compactHazard(value: string) { if (/akınt/i.test(value)) return "Akıntı"; if (/kaygan|ıslak/i.test(value)) return "Kaygan taş"; if (/dalga/i.test(value)) return "Dalga"; return value.split(/[.!?]/)[0].slice(0, 18); }

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: 112 }, topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, eyebrow: { flexDirection: "row", alignItems: "center", gap: 6 }, location: { color: colors.muted, fontSize: 15, fontWeight: "700" }, iconButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  hero: { height: 250, borderRadius: 22, overflow: "hidden", backgroundColor: colors.soft }, heroImage: { ...StyleSheet.absoluteFill, width: "100%", height: "100%" }, heroFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "#DCEFF1" }, heroOverlay: { flex: 1, padding: spacing.md, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", backgroundColor: "rgba(7,31,52,0.18)" }, heroCopy: { flex: 1 }, title: { color: colors.white, fontSize: 30, lineHeight: 36, fontWeight: "900" }, subtitle: { color: colors.white, fontSize: 16, marginTop: 4, fontWeight: "700" }, score: { borderRadius: 16, paddingHorizontal: 13, paddingVertical: 10, minWidth: 78, alignItems: "center" }, scoreGood: { backgroundColor: "#E5F3E9" }, scoreCaution: { backgroundColor: "#FFF1D9" }, scoreNumber: { color: colors.ink, fontSize: 29, lineHeight: 32, fontWeight: "900" }, scoreLabel: { color: colors.ink, fontSize: 12, fontWeight: "800" }, verification: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, verificationText: { flex: 1, color: colors.ink, fontWeight: "800" },
  sectionTitle: { color: colors.ink, fontSize: 20, lineHeight: 25, fontWeight: "900", marginTop: spacing.sm }, factGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, fact: { width: "48%", minHeight: 72, backgroundColor: colors.soft, borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }, factLabel: { color: colors.muted, fontSize: 12, fontWeight: "700" }, factValue: { color: colors.ink, fontSize: 16, fontWeight: "900", marginTop: 2 }, conditionRow: { flexDirection: "row", gap: spacing.sm }, metric: { flex: 1, minHeight: 94, borderRadius: 14, padding: 12, gap: 5 }, seaSurface: { backgroundColor: "#E6F3F5" }, windSurface: { backgroundColor: "#EEF3F7" }, metricLabel: { color: colors.muted, fontSize: 12, fontWeight: "700" }, metricValue: { color: colors.ink, fontSize: 16, fontWeight: "900" }, neutralSurface: { backgroundColor: colors.soft, borderRadius: 14, padding: 14 }, positiveSurface: { backgroundColor: "#E7F4EA", borderRadius: 14, padding: 14 }, caption: { color: colors.muted, fontSize: 12, lineHeight: 18 }, muted: { color: colors.muted, lineHeight: 20 },
  timeline: { flexDirection: "row", gap: 6 }, timeSlot: { flex: 1, minHeight: 66, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingVertical: 10, paddingHorizontal: 4, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }, timeBest: { backgroundColor: "#E7F4EA", borderColor: colors.moss }, timeMuted: { backgroundColor: colors.soft, opacity: 0.72 }, timeLabel: { color: colors.ink, fontSize: 12, fontWeight: "900" }, timeState: { color: colors.muted, fontSize: 10, marginTop: 4 }, gearRow: { flexDirection: "row", alignItems: "center", gap: 12 }, gearTitle: { color: colors.ink, fontSize: 17, fontWeight: "900" }, chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, chip: { borderRadius: 18, paddingHorizontal: 12, paddingVertical: 9 }, positiveChip: { backgroundColor: "#E7F4EA" }, warningChip: { backgroundColor: "#FFF1D9" }, chipText: { color: colors.ink, fontSize: 13, fontWeight: "800" }, mapCard: { gap: spacing.sm }, map: { height: 180, borderRadius: 16, overflow: "hidden" }, secondaryActions: { gap: spacing.sm }, alertSurface: { backgroundColor: "#FFF1D9", borderRadius: 14, padding: 12, gap: 3 }, alertText: { color: colors.warning, fontWeight: "900" }, alertDetail: { color: colors.warning, fontSize: 13 },
  advanced: { gap: spacing.sm, marginTop: spacing.md }, advancedSurface: { backgroundColor: colors.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 12, gap: 10 }, input: { minHeight: 86, borderWidth: 1, borderColor: colors.border, borderRadius: 12, color: colors.ink, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.bg, textAlignVertical: "top" }, report: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, gap: 2 }, feedbackRow: { gap: 8 }, warning: { color: colors.warning, lineHeight: 20, fontWeight: "800" }, link: { color: colors.water, lineHeight: 22, textDecorationLine: "underline" }, stickyBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: spacing.md, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface }, stickyPrimary: { flex: 1 }, stickySecondary: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, stickySecondaryText: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  sheetBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(9,29,47,0.28)" }, sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, gap: spacing.md }, sheetHandle: { alignSelf: "center", width: 42, height: 4, borderRadius: 2, backgroundColor: colors.border }, sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, sheetTitle: { color: colors.ink, fontSize: 24, fontWeight: "900" }, sheetFacts: { flexDirection: "row", gap: 10 }, sheetFact: { color: colors.ink, backgroundColor: colors.soft, borderRadius: 10, padding: 10, fontWeight: "800" }, sheetNote: { color: colors.muted, lineHeight: 20 }, sheetLink: { color: colors.water, fontWeight: "900", textDecorationLine: "underline" }
});
