import { Camera, GeoJSONSource, Layer, Map } from "@maplibre/maplibre-react-native";
import { GENERAL_SEA_REGULATION_TR, GEAR_RULES, REGULATION_VERSION, SPECIES, SPECIES_REGULATIONS } from "@mera/config";
import { evaluateSafety, haversineDistanceKm, matchGear, stalenessLabelTr } from "@mera/domain";
import type { ConditionSnapshot, Spot } from "@mera/types";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, Card, Label, Loading, Screen, Title } from "@/components";
import { conditionsMap, getSpot, listCatchReportsForSpot, saveFeedback, trackEvent } from "@/db";
import { useCurrentLocation } from "@/location";
import { downloadOfflineRegion, fallbackMapStyle, SAKARYA_NORTH_BOUNDS } from "@/map";
import { BundledBasemapLayers } from "@/mapLayers";
import { useAppState } from "@/store";
import { colors, spacing } from "@/theme";

type LocalReport = Awaited<ReturnType<typeof listCatchReportsForSpot>>[number];
const verificationLabels: Record<Spot["verificationStatus"], string> = {
  VERIFIED: "Doğrulanmış kayıt",
  COMMUNITY: "Topluluk kaydı · doğrulama sürüyor",
  WEB_DISCOVERED: "Web keşfi · topluluk doğrulaması yok",
  POTENTIAL: "Potansiyel · doğrulanmadı"
};
const runtimeStartedAt = Date.now();

export default function SpotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useAppState();
  const location = useCurrentLocation();
  const [spot, setSpot] = useState<Spot | null>(null);
  const [condition, setCondition] = useState<ConditionSnapshot | null>(null);
  const [reports, setReports] = useState<LocalReport[]>([]);
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    if (!state.db || !id) return;
    void getSpot(state.db, id).then(setSpot);
    void conditionsMap(state.db).then((map) => setCondition(map.get(id) ?? null));
    void listCatchReportsForSpot(state.db, id).then(setReports);
    void trackEvent(state.db, "spot_opened", { verification: "local" });
  }, [state.db, id]);

  const distanceKm = useMemo(() => spot && location.coordinates ? haversineDistanceKm(location.coordinates, spot.coordinates) : null, [spot, location.coordinates]);
  if (!state.ready || !spot) return <Loading />;
  const spotId = spot.id;
  const favorite = state.favoriteIds.includes(spot.id);
  const gearRule = GEAR_RULES.find((rule) => rule.speciesId === state.targetSpecies);
  const gearMatch = matchGear(state.gear ?? undefined, state.targetSpecies, spot);
  const regulation = SPECIES_REGULATIONS[state.targetSpecies];
  const safety = evaluateSafety(spot, condition ?? undefined, state.experience);
  const speciesNames = spot.targetSpecies.map((speciesId) => SPECIES.find((item) => item.id === speciesId)?.nameTr ?? speciesId).join(", ") || "Tür kanıtı yok";
  const regulationAgeDays = Math.floor((runtimeStartedAt - new Date(REGULATION_VERSION.checkedAt).getTime()) / 86_400_000);
  const localHour = new Date(runtimeStartedAt).getHours();
  const isNight = localHour < 5 || localHour >= 21;
  const marker = { type: "FeatureCollection" as const, features: [{ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [spot.coordinates.longitude, spot.coordinates.latitude] }, properties: {} }] };

  async function offline() {
    if (!state.db) return;
    try {
      await downloadOfflineRegion(state.db, { id: "sakarya-north-v1", name: "Sakarya Kuzey Sahili", bounds: SAKARYA_NORTH_BOUNDS }, setProgress);
      Alert.alert("Offline harita hazır", "Paketlenmiş yol, kıyı, yer adı ve mera verisi yeniden açılışta ve uçak modunda kullanılabilir.");
    } catch { Alert.alert("Offline harita hazırlanamadı", "Depolama alanını kontrol et."); }
  }

  async function feedback(feedbackType: "LOCATION_CORRECT" | "FISHABLE" | "ACCESS_CHANGED" | "PROHIBITED" | "DANGEROUS") {
    if (!state.db) return;
    await saveFeedback(state.db, spotId, feedbackType);
    Alert.alert("Teşekkürler", "Geri bildirimin kuyruğa alındı. Tek rapor noktayı doğrulanmış veya yasak ilan etmez.");
  }

  return <Screen><ScrollView contentContainerStyle={styles.content}>
    <View><Label>{verificationLabels[spot.verificationStatus]}</Label><Title>{spot.canonicalName}</Title><Text style={styles.subtle}>{spot.district}, {spot.province} · {spot.coordinatePrecision === "APPROXIMATE" ? "yaklaşık " : ""}{spot.coordinates.latitude.toFixed(5)}, {spot.coordinates.longitude.toFixed(5)}</Text></View>
    {spot.verificationStatus === "POTENTIAL" && <Card><Text style={styles.warning}>Coğrafi yapısı nedeniyle potansiyel kıyı av noktası. Henüz doğrulanmadı.</Text></Card>}
    {isNight && <Card><Text style={styles.danger}>Gece koşulları erişim, kayalık ve dalga riskini büyütür. Aydınlatma olsa bile yalnız gitme; yerel koşulları sahada kontrol et.</Text></Card>}
    {!safety.allowed && <Card><Text style={styles.danger}>Güvenlik kuralı engeli: {safety.reasonCodes.join(", ")}. Bu nokta bugün önerilmez.</Text></Card>}
    <View style={styles.actions}><Button title={favorite ? "Favoriden çıkar" : "Favoriye ekle"} variant="secondary" onPress={() => state.toggleFavorite(spot.id)} /><Button title="Pusulayla yönel" onPress={() => router.push({ pathname: "/compass", params: { spotId: spot.id } })} /></View>

    <Card><Label>Konum ve mesafe</Label><View style={styles.mapWrap}><Map style={styles.map} mapStyle={process.env.EXPO_PUBLIC_MAP_STYLE_URL ?? fallbackMapStyle}><Camera initialViewState={{ center: [spot.coordinates.longitude, spot.coordinates.latitude], zoom: 12 }} />{!process.env.EXPO_PUBLIC_MAP_STYLE_URL && <BundledBasemapLayers />}<GeoJSONSource id={`detail-marker-${spot.id}`} data={marker}><Layer id={`detail-marker-layer-${spot.id}`} type="circle" paint={{ "circle-radius": 9, "circle-color": colors.primary, "circle-stroke-color": colors.white, "circle-stroke-width": 3 }} /></GeoJSONSource></Map></View><Text style={styles.value}>{distanceKm === null ? "Mesafe için cihaz konumu gerekli" : `Kuş uçuşu ${distanceKm.toFixed(1)} km`}</Text><Text style={styles.subtle}>Yol mesafesi ve güvenli rota hesabı sunulmuyor.</Text>{distanceKm === null && <Button title={location.loading ? "Konum alınıyor…" : "Konumumla mesafeyi hesapla"} variant="secondary" disabled={location.loading} onPress={location.request} />}</Card>

    <Card><Label>Mera özeti</Label><Text style={styles.value}>Hedef türler: {speciesNames}</Text><Text style={styles.subtle}>{spot.coastlineType} · erişim {spot.accessType} · acemi uygunluğu {spot.beginnerSuitability}</Text><Text style={styles.subtle}>{spot.terrain}</Text><Text style={styles.subtle}>Park: {spot.parkingNotes ?? "Bilinmiyor"}</Text><Text style={styles.subtle}>Yürüme: {spot.walkingDistanceM !== undefined ? `${spot.walkingDistanceM} m` : "Bilinmiyor"}</Text><Text style={styles.subtle}>Güven skoru: %{Math.round(spot.confidenceScore * 100)}; geri bildirimlerle küçük adımlarla güncellenir.</Text></Card>

    {spot.photoPaths && spot.photoPaths.length > 0 && <Card><Label>Fotoğraflar</Label><ScrollView horizontal contentContainerStyle={styles.photos}>{spot.photoPaths.filter((path) => path.startsWith("file:") || path.startsWith("content:")).map((path) => <Image key={path} source={{ uri: path }} style={styles.photo} />)}</ScrollView><Text style={styles.subtle}>Cloud fotoğrafları özel depoda tutulur; bu sürüm yalnızca cihazdaki kopyaları gösterir.</Text></Card>}

    <Card><Label>Bilinen riskler / uyarılar</Label>{[...spot.knownHazards, ...spot.accessWarnings].map((item) => <Text key={item} style={styles.warning}>• {item}</Text>)}<Text style={styles.disclaimer}>Bu uygulama güvenli rota veya deniz güvenliği garantisi vermez. Yerel koşulları ve resmî kısıtları kontrol et.</Text></Card>
    <Card><Label>Hava ve deniz</Label>{condition ? <><Text style={styles.value}>Dalga {condition.waveHeightM ?? "—"} m · Rüzgâr {condition.windSpeedKmh ?? "—"} km/s · Hamle {condition.windGustKmh ?? "—"} km/s</Text><Text style={styles.subtle}>{stalenessLabelTr(condition.fetchedAt)}</Text>{safety.severity === "CAUTION" && <Text style={styles.warning}>Dikkat: {safety.reasonCodes.join(", ")}</Text>}</> : <Text style={styles.warning}>Güncel koşul verisi yok. Uygulama eski veriyi güncelmiş gibi göstermiyor.</Text>}</Card>
    <Card><Label>Bugün için uygunluk pencereleri</Label><Text style={styles.value}>{condition?.sunrise ? `${formatTime(condition.sunrise)}–${formatTime(new Date(new Date(condition.sunrise).getTime() + 3 * 3_600_000).toISOString())} · daha uygun` : "Gün doğumu çevresi — veri gelince hesaplanır"}</Text><Text style={styles.value}>{condition?.sunset ? `${formatTime(new Date(new Date(condition.sunset).getTime() - 3 * 3_600_000).toISOString())}–${formatTime(condition.sunset)} · orta` : "Gün batımı çevresi — veri gelince hesaplanır"}</Text><Text style={styles.subtle}>Tahmini değerlendirmedir; av garantisi değildir.</Text></Card>
    {gearRule && <Card><Label>Takım uyumu</Label><Text style={styles.value}>{gearMatch.reasonCode === "GEAR_GOOD_MATCH" ? "Seçili takım iyi eşleşiyor" : gearMatch.reasonCode === "GEAR_POOR_MATCH" ? "Seçili takım zayıf eşleşiyor" : "Takım uyumu sınırlı veriden değerlendirildi"}</Text><Text style={styles.subtle}>{gearRule.suggestionTr}</Text><Text style={styles.subtle}>Yapılandırılmış kural veritabanından; yapay zekâ gramaj üretmez.</Text></Card>}

    <Card><Label>Son yerel av raporları</Label>{reports.length === 0 ? <Text style={styles.subtle}>Bu cihazda bu meraya bağlı rapor yok.</Text> : reports.map((report) => <View key={report.id} style={styles.report}><Text style={styles.value}>{String(report.payload.result ?? "—")} · {String(report.payload.quantity ?? 0)} adet</Text><Text style={styles.subtle}>{new Date(report.createdAt).toLocaleString("tr-TR")} · {report.syncStatus}</Text><Text style={styles.subtle}>{String(report.payload.note ?? "Not yok")}</Text></View>)}</Card>

    <Card><Label>Resmî amatör avcılık kural özeti</Label>{regulation ? <Text style={styles.value}>Asgari boy {regulation.minimumLengthCm} cm · toplam limit {regulation.limit} kg</Text> : <Text style={styles.warning}>Bu hedef tür için uygulamada özel boy satırı bulunmuyor; genel kurallar yine geçerli.</Text>}<Text style={styles.subtle}>{regulation?.noteTr}</Text><Text style={styles.subtle}>{GENERAL_SEA_REGULATION_TR}</Text>{regulationAgeDays > 90 && <Text style={styles.danger}>Resmî kural kontrolü {regulationAgeDays} gün önce yapılmış; güncel metni açmadan karar verme.</Text>}<Text style={styles.disclaimer}>Son resmî kontrol: {new Date(REGULATION_VERSION.checkedAt).toLocaleDateString("tr-TR")}. Sahadaki levha, geçici karar ve güncel resmî metin önceliklidir.</Text><Text style={styles.link} onPress={() => Linking.openURL(REGULATION_VERSION.sourceUrl)}>Resmî tebliği aç ↗</Text></Card>
    <Card><Label>Offline harita</Label><Text style={styles.subtle}>{"Sakarya–Kocaeli yol, kıyı ve yer adları ODbL lisanslı OpenStreetMap extract'i olarak uygulamaya gömülüdür. Yapılandırılmış özel vector tile paketi varsa daha ayrıntılı bölge ayrıca indirilebilir."}</Text>{progress !== null && <Text style={styles.value}>%{Math.round(progress)}</Text>}<Button title="Sakarya Kuzey Sahili — Offline hazırla" variant="secondary" onPress={offline} /></Card>
    <Card><Label>Topluluk doğrulaması</Label><Text style={styles.subtle}>Geri bildirim güven skorunu yalnızca sınırlı ölçüde etkiler; tek başına “doğrulandı” veya “yasak” durumu yaratmaz.</Text><Button title="Konum doğru" variant="secondary" onPress={() => feedback("LOCATION_CORRECT")} /><Button title="Burada av yapılabiliyor" variant="secondary" onPress={() => feedback("FISHABLE")} /><Button title="Erişim değişti" variant="secondary" onPress={() => feedback("ACCESS_CHANGED")} /><Button title="Yasak bildir" variant="danger" onPress={() => feedback("PROHIBITED")} /><Button title="Tehlike bildir" variant="danger" onPress={() => feedback("DANGEROUS")} /></Card>
    <Card><Label>Kaynaklar</Label>{spot.sources.length === 0 ? <Text style={styles.subtle}>Kullanıcı kaydı; harici kaynak eklenmedi.</Text> : spot.sources.map((source) => <Text key={`${source.url}-${source.evidenceType}`} style={styles.link} onPress={() => Linking.openURL(source.url)}>• {source.title} ↗</Text>)}</Card>
  </ScrollView></Screen>;
}

function formatTime(value: string) { return new Date(value).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }); }

const styles = StyleSheet.create({ content: { padding: spacing.md, gap: spacing.md, paddingBottom: 80 }, subtle: { color: colors.muted, lineHeight: 20 }, value: { color: colors.ink, fontSize: 17, fontWeight: "800", lineHeight: 24 }, warning: { color: colors.warning, lineHeight: 21, fontWeight: "700" }, danger: { color: colors.danger, lineHeight: 21, fontWeight: "900" }, disclaimer: { color: colors.danger, lineHeight: 20, fontWeight: "800", marginTop: spacing.sm }, actions: { gap: spacing.sm }, link: { color: colors.water, lineHeight: 22, textDecorationLine: "underline" }, mapWrap: { height: 210, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: colors.border }, map: { flex: 1 }, photos: { gap: spacing.sm }, photo: { width: 220, height: 160, borderRadius: 12, backgroundColor: colors.border }, report: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: 2 } });
