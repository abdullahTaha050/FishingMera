import Ionicons from "@expo/vector-icons/Ionicons";
import { Camera, type CameraRef, GeoJSONSource, Layer, Map as MapLibreMap, UserLocation } from "@maplibre/maplibre-react-native";
import { haversineDistanceKm } from "@mera/domain";
import type { ConditionSnapshot } from "@mera/types";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Linking, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Loading } from "@/components";
import { conditionsMap } from "@/db";
import { fallbackMapStyle, onlineMapStyle, spotsGeoJson } from "@/map";
import { BundledBasemapLayers } from "@/mapLayers";
import { useCurrentLocation } from "@/location";
import { useAppState } from "@/store";

const fallbackHero = require("../../assets/spot-detail-karasu.png");

export default function DiscoverScreen() {
  const state = useAppState();
  const location = useCurrentLocation();
  const insets = useSafeAreaInsets();
  const { spotId } = useLocalSearchParams<{ spotId?: string }>();
  const [selectedId, setSelectedId] = useState<string | undefined>(spotId);
  const [listVisible, setListVisible] = useState(false);
  const [sheetMode, setSheetMode] = useState<"expanded" | "compact">("expanded");
  const [conditions, setConditions] = useState<globalThis.Map<string, ConditionSnapshot>>(new globalThis.Map());
  const cameraRef = useRef<CameraRef>(null);
  const geoJson = useMemo(() => spotsGeoJson(state.spots), [state.spots]);
  const selectedSpot = state.spots.find((spot) => spot.id === (selectedId ?? spotId)) ?? state.spots[0];
  const configuredOnlineStyle = process.env.EXPO_PUBLIC_MAP_STYLE_URL;
  const isBundledMap = !state.isConnected;
  const style = state.isConnected ? configuredOnlineStyle ?? onlineMapStyle : fallbackMapStyle;

  useEffect(() => { if (spotId) setSelectedId(spotId); }, [spotId]);
  useEffect(() => { if (!selectedId && state.spots[0]) setSelectedId(state.spots[0].id); }, [selectedId, state.spots]);
  useEffect(() => { if (state.db) void conditionsMap(state.db).then(setConditions).catch(() => undefined); }, [state.db]);

  if (!state.ready) return <Loading />;
  const selectedCondition = selectedSpot ? conditions.get(selectedSpot.id) : undefined;
  const score = selectedSpot ? Math.round(selectedSpot.confidenceScore * 100) : 0;
  const scoreLabel = score >= 80 ? "Çok uygun" : score >= 60 ? "Uygun" : "Kontrol et";
  const selectedGeoJson = selectedSpot ? spotsGeoJson([selectedSpot]) : { type: "FeatureCollection" as const, features: [] };
  const distanceKm = selectedSpot && location.coordinates ? haversineDistanceKm(location.coordinates, selectedSpot.coordinates) : null;

  async function focusCurrentLocation() {
    const coordinates = location.coordinates ?? await location.request();
    if (!coordinates) return;
    cameraRef.current?.flyTo({ center: [coordinates.longitude, coordinates.latitude], zoom: 11.5, duration: 700, easing: "ease" });
  }

  return <View style={styles.screen}><View style={styles.page}>
    <MapLibreMap style={styles.map} mapStyle={style} attribution logo compass={false}>
      <Camera ref={cameraRef} initialViewState={{ center: selectedSpot ? [selectedSpot.coordinates.longitude, selectedSpot.coordinates.latitude] : [30.72, 41.10], zoom: selectedSpot ? 9.8 : 8.0 }} {...(isBundledMap ? { minZoom: 8.45 } : {})} />
      <UserLocation accuracy heading />
      {isBundledMap && <BundledBasemapLayers />}
      <GeoJSONSource id="discover-spots" data={geoJson} onPress={(event) => { const id = event.nativeEvent.features?.[0]?.properties?.id; if (typeof id === "string") { setSelectedId(id); setSheetMode("expanded"); } }}><Layer id="discover-markers" type="circle" paint={{ "circle-radius": 10, "circle-color": ["match", ["get", "verification"], "WEB_DISCOVERED", "#F59A35", "COMMUNITY", "#3D7EDB", "#51AE67"], "circle-stroke-color": "#FFFFFF", "circle-stroke-width": 3 }} /></GeoJSONSource>
      <GeoJSONSource id="discover-selected" data={selectedGeoJson}><Layer id="discover-selected-halo" type="circle" paint={{ "circle-radius": 24, "circle-color": "#51AE67", "circle-opacity": 0.2, "circle-stroke-color": "#51AE67", "circle-stroke-width": 1, "circle-stroke-opacity": 0.4 }} /><Layer id="discover-selected-marker" type="circle" paint={{ "circle-radius": 12, "circle-color": "#51AE67", "circle-stroke-color": "#FFFFFF", "circle-stroke-width": 4 }} /></GeoJSONSource>
    </MapLibreMap>
    <View pointerEvents="box-none" style={[styles.header, compact.header, { paddingTop: insets.top + 10 }]}>
      <View style={styles.titleRow}><Text style={[styles.title, compact.title]}>Keşfet</Text><Pressable accessibilityRole="button" accessibilityLabel="Bildirimler" style={[styles.iconButton, compact.iconButton]}><Ionicons name="notifications-outline" size={22} color="#0B2440" /></Pressable></View>
      <Pressable accessibilityRole="search" accessibilityLabel="Bölge veya mera ara" style={[styles.search, compact.search]}><Ionicons name="search-outline" size={23} color="#68768A" /><Text style={[styles.searchPlaceholder, compact.searchPlaceholder]}>Bölge veya mera ara</Text><View style={[styles.searchDivider, compact.searchDivider]} /><Ionicons name="options-outline" size={23} color="#0B2440" /></Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filters, compact.filters]}><Filter icon="fish-outline" label="İstavrit" /><Filter icon="bar-chart-outline" label="Acemi" /><Filter icon="locate-outline" label="≤100 km" /><Filter icon="calendar-outline" label="Bugün uygun" /></ScrollView>
      <View style={[styles.segmented, compact.segmented, layout.segmented]}><Pressable accessibilityRole="button" accessibilityState={{ selected: !listVisible }} onPress={() => setListVisible(false)} style={[styles.segment, !listVisible && styles.segmentActive]}><Ionicons name="map-outline" size={22} color="#0B2440" /><Text style={[styles.segmentText, compact.segmentText]}>Harita</Text></Pressable><Pressable accessibilityRole="button" accessibilityState={{ selected: listVisible }} onPress={() => setListVisible(true)} style={[styles.segment, listVisible && styles.segmentActive]}><Ionicons name="list-outline" size={24} color="#0B2440" /><Text style={[styles.segmentText, compact.segmentText]}>Liste</Text></Pressable></View>
    </View>
    {!listVisible && <View style={[styles.mapControls, compact.mapControls, layout.mapControls]}><Legend /><View style={[styles.mapActionRow, compact.mapActionRow, layout.mapActionWithoutSearch, sheetMode === "compact" ? layout.mapActionCompact : layout.mapActionExpanded]}>{/* Search action intentionally deferred.\n      <Pressable accessibilityRole="button" style={[styles.searchArea, compact.searchArea]}><Ionicons name="search-outline" size={22} color="#0B2440" /><Text style={[styles.searchAreaText, compact.searchAreaText]}>Ara</Text></Pressable> */}<Pressable accessibilityRole="button" accessibilityLabel="Mevcut konumuma odaklan" onPress={() => void focusCurrentLocation()} style={[styles.locationButton, compact.locationButton]}><Ionicons name="locate-outline" size={24} color="#0B2440" /></Pressable></View></View>}
    {listVisible && <View style={styles.listPanel}><ScrollView contentContainerStyle={styles.listContent}>{state.spots.map((spot) => <Pressable key={spot.id} accessibilityRole="button" onPress={() => { setSelectedId(spot.id); setListVisible(false); }} style={styles.listSpot}><View style={[styles.listDot, { backgroundColor: markerColor(spot.verificationStatus) }]} /><View style={styles.listCopy}><Text style={styles.listName}>{spot.canonicalName}</Text><Text style={styles.listMeta}>{spot.district} · {Math.round(spot.confidenceScore * 100)} uygunluk</Text></View><Ionicons name="chevron-forward" size={20} color="#68768A" /></Pressable>)}</ScrollView></View>}
    {!listVisible && selectedSpot && <SpotSheet key={selectedSpot.id} spot={selectedSpot} distanceKm={distanceKm} score={score} scoreLabel={scoreLabel} wave={selectedCondition?.waveHeightM} wind={selectedCondition?.windSpeedKmh} saved={state.favoriteIds.includes(selectedSpot.id)} onModeChange={setSheetMode} onOpen={() => router.push({ pathname: "/spot/[id]", params: { id: selectedSpot.id } })} onDirections={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${selectedSpot.coordinates.latitude},${selectedSpot.coordinates.longitude}`)} onSave={() => state.toggleFavorite(selectedSpot.id)} />}
  </View></View>;
}

function Filter({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) { return <Pressable accessibilityRole="button" style={[styles.filter, compact.filter]}><Ionicons name={icon} size={20} color="#0B2440" /><Text style={[styles.filterText, compact.filterText]}>{label}</Text></Pressable>; }
function Legend() { return <View style={[styles.legend, compact.legend]}><LegendItem color="#51AE67" label="Doğrulanmış" /><LegendItem color="#3D7EDB" label="Topluluk" /><LegendItem color="#F59A35" label="Web'den bulundu" /><Ionicons name="information-circle-outline" size={20} color="#68768A" /></View>; }
function LegendItem({ color, label }: { color: string; label: string }) { return <View style={[styles.legendItem, compact.legendItem]}><View style={[styles.legendDot, compact.legendDot, { backgroundColor: color }]} /><Text style={[styles.legendText, compact.legendText]}>{label}</Text></View>; }
function SpotSheet({ spot, distanceKm, score, scoreLabel, wave, wind, saved, onModeChange, onOpen, onDirections, onSave }: { spot: { canonicalName: string; district: string; photoPaths?: string[] }; distanceKm: number | null; score: number; scoreLabel: string; wave?: number; wind?: number; saved: boolean; onModeChange: (mode: "expanded" | "compact") => void; onOpen: () => void; onDirections: () => void; onSave: () => void }) {
  const [mode, setMode] = useState<"expanded" | "compact">("expanded");
  const translateY = useRef(new Animated.Value(0)).current;
  const photoPath = spot.photoPaths?.find((path) => path.startsWith("file:") || path.startsWith("content:"));
  const locationLabel = `${spot.district} · ${distanceKm === null ? "— km" : `${distanceKm.toFixed(0)} km`}`;
  const setSheetMode = (nextMode: "expanded" | "compact") => { setMode(nextMode); onModeChange(nextMode); };
  const finishDrag = (nextMode: "expanded" | "compact", target: number) => Animated.timing(translateY, { toValue: target, duration: 180, useNativeDriver: true }).start(() => { setSheetMode(nextMode); translateY.setValue(0); });
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dy) > 4,
    onPanResponderMove: (_event, gesture) => translateY.setValue(mode === "expanded" ? Math.max(0, Math.min(132, gesture.dy)) : Math.min(0, Math.max(-132, gesture.dy))),
    onPanResponderRelease: (_event, gesture) => {
      if (mode === "expanded" && (gesture.dy > 22 || gesture.vy > 0.3)) finishDrag("compact", 132);
      else if (mode === "compact" && (gesture.dy < -22 || gesture.vy < -0.3)) finishDrag("expanded", -132);
      else Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
    },
    onPanResponderTerminate: () => Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8 }).start()
  }), [mode, translateY]);
  const handle = <View accessibilityLabel="Spot kartını sürükle" {...panResponder.panHandlers} style={[styles.handle, compact.handle]} />;
  const sheetStyle = [styles.sheet, compact.sheet, { transform: [{ translateY }] }];
  if (mode === "compact") return <Animated.View style={[sheetStyle, styles.compactSheet]}>{handle}<Pressable accessibilityRole="button" onPress={() => setSheetMode("expanded")} style={styles.compactRow}>{photoPath ? <Image source={{ uri: photoPath }} style={styles.compactPhoto} /> : <Image source={fallbackHero} style={styles.compactPhoto} />}<View style={styles.compactCopy}><Text numberOfLines={1} style={styles.compactName}>{spot.canonicalName}</Text><Text style={styles.compactMeta}>{locationLabel}</Text></View><View style={styles.compactScore}><Text style={styles.compactScoreNumber}>{score}</Text><Text style={styles.compactScoreLabel}>{scoreLabel}</Text></View><Ionicons name="chevron-up" size={22} color="#0B2440" /></Pressable></Animated.View>;
  return <Animated.View style={sheetStyle}>{handle}<View style={[styles.sheetTop, compact.sheetTop]}>{photoPath ? <Image source={{ uri: photoPath }} style={[styles.photo, compact.photo]} /> : <Image source={fallbackHero} style={[styles.photo, compact.photo]} />}<View style={styles.spotCopy}><Text numberOfLines={1} style={[styles.spotName, compact.spotName]}>{spot.canonicalName}</Text><Text style={[styles.spotMeta, compact.spotMeta]}>{locationLabel}</Text><View style={[styles.metrics, compact.metrics]}><Metric icon="water-outline" text={`Dalga ${wave === undefined ? "—" : `${wave.toFixed(1).replace(".", ",")} m`}`} /><Metric icon="speedometer-outline" text={`Rüzgâr ${wind === undefined ? "—" : `${Math.round(wind)} km/s`}`} /></View></View><View style={styles.score}><Text style={[styles.scoreNumber, compact.scoreNumber]}>{score}</Text><Text style={[styles.scoreLabel, compact.scoreLabel]}>{scoreLabel}</Text></View></View><View style={[styles.sheetActions, compact.sheetActions]}><Pressable accessibilityRole="button" onPress={onOpen} style={[styles.detailButton, compact.detailButton]}><Text style={[styles.detailText, compact.detailText]}>Detayları gör</Text><Ionicons name="chevron-forward" size={20} color="#FFFFFF" /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Yol tarifi" onPress={onDirections} style={[styles.directionButton, compact.directionButton]}><Ionicons name="navigate-outline" size={19} color="#0B2440" /><Text style={[styles.directionText, compact.directionText]}>Yol tarifi</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={saved ? "Kaydı kaldır" : "Kaydet"} onPress={onSave} style={[styles.saveButton, compact.saveButton]}><Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={21} color="#0B2440" /><Text style={styles.saveText}>{saved ? "Kaydedildi" : "Kaydet"}</Text></Pressable></View></Animated.View>;
}
function Metric({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) { return <View style={styles.metric}><Ionicons name={icon} size={18} color="#49637E" /><Text numberOfLines={1} style={styles.metricText}>{text}</Text></View>; }
function markerColor(status: string) { return status === "WEB_DISCOVERED" ? "#F59A35" : status === "COMMUNITY" ? "#3D7EDB" : "#51AE67"; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#CBEAF8" },
  compactSheet: { minHeight: 76 },
  compactRow: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 2 },
  compactPhoto: { width: 46, height: 46, borderRadius: 9 },
  compactCopy: { flex: 1, minWidth: 0 },
  compactName: { color: "#0B2440", fontFamily: "serif", fontSize: 18, fontWeight: "700" },
  compactMeta: { color: "#68768A", fontSize: 12, marginTop: 2 },
  compactScore: { alignItems: "center", minWidth: 38 },
  compactScoreNumber: { color: "#0B2440", fontFamily: "serif", fontSize: 24, fontWeight: "700" },
  compactScoreLabel: { color: "#68768A", fontSize: 10 },
  page: { flex: 1, overflow: "hidden", backgroundColor: "#CBEAF8" }, map: { flex: 1 }, header: { position: "absolute", top: 0, left: 0, right: 0, gap: 16, paddingHorizontal: 16, paddingBottom: 14, backgroundColor: "#FCFCFD" }, titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, title: { color: "#0B2440", fontFamily: "serif", fontSize: 42, lineHeight: 48, fontWeight: "700" }, iconButton: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#DEE4EA", backgroundColor: "#FFFFFF", shadowColor: "#0B2440", shadowOpacity: 0.08, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 2 }, search: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 20, borderWidth: 1, borderColor: "#DCE2E8", borderRadius: 20, backgroundColor: "#FFFFFF" }, searchPlaceholder: { flex: 1, color: "#718096", fontSize: 18 }, searchDivider: { height: 40, width: 1, backgroundColor: "#E1E6EB" }, filters: { gap: 12, paddingRight: 16 }, filter: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, borderWidth: 1, borderColor: "#DDE4EA", borderRadius: 24, backgroundColor: "#FFFFFF" }, filterText: { color: "#0B2440", fontSize: 16, fontWeight: "500" }, segmented: { height: 72, flexDirection: "row", padding: 5, borderRadius: 21, backgroundColor: "#F0F3F6", borderWidth: 1, borderColor: "#DCE2E8" }, segment: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, borderRadius: 17 }, segmentActive: { backgroundColor: "#FFFFFF", shadowColor: "#0B2440", shadowOpacity: 0.06, shadowRadius: 5, shadowOffset: { width: 0, height: 1 }, elevation: 1 }, segmentText: { color: "#0B2440", fontSize: 17, fontWeight: "600" }, mapControls: { position: "absolute", top: 390, left: 16, right: 16, bottom: 16, justifyContent: "space-between" }, legend: { alignSelf: "flex-end", flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 16, minHeight: 58, borderRadius: 19, backgroundColor: "#FFFFFF", shadowColor: "#0B2440", shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 }, legendItem: { flexDirection: "row", alignItems: "center", gap: 6 }, legendDot: { width: 14, height: 14, borderRadius: 7 }, legendText: { color: "#4D5969", fontSize: 12 }, mapActionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 190 }, searchArea: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 21, borderRadius: 21, backgroundColor: "#FFFFFF", shadowColor: "#0B2440", shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 }, searchAreaText: { color: "#0B2440", fontSize: 17, fontWeight: "500" }, locationButton: { width: 62, height: 62, alignItems: "center", justifyContent: "center", borderRadius: 31, backgroundColor: "#FFFFFF", shadowColor: "#0B2440", shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 }, sheet: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: "#FFFFFF", shadowColor: "#0B2440", shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: -2 }, elevation: 5 }, handle: { alignSelf: "center", width: 42, height: 5, borderRadius: 3, backgroundColor: "#D7DDE4", marginBottom: 15 }, sheetTop: { flexDirection: "row", alignItems: "center", gap: 14 }, photo: { width: 112, height: 112, borderRadius: 13 }, spotCopy: { flex: 1, minWidth: 0 }, spotName: { color: "#0B2440", fontFamily: "serif", fontSize: 27, lineHeight: 32, fontWeight: "700" }, spotMeta: { color: "#68768A", fontSize: 16, marginTop: 4 }, metrics: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 }, metric: { maxWidth: "100%", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 7, borderRadius: 10, backgroundColor: "#F0F4FA" }, metricText: { color: "#49637E", fontSize: 12 }, score: { minWidth: 66, alignItems: "center" }, scoreNumber: { color: "#0B2440", fontFamily: "serif", fontSize: 42, lineHeight: 47, fontWeight: "700" }, scoreLabel: { color: "#68768A", fontSize: 13, textAlign: "center" }, sheetActions: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 }, detailButton: { minHeight: 58, flex: 1.3, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 10, borderRadius: 15, backgroundColor: "#0B2440" }, detailText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" }, directionButton: { minHeight: 58, flex: 1.08, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 8, borderWidth: 1, borderColor: "#AAB6C3", borderRadius: 15 }, directionText: { color: "#0B2440", fontSize: 15, fontWeight: "500" }, saveButton: { alignItems: "center", justifyContent: "center", minWidth: 58, minHeight: 58 }, saveText: { color: "#0B2440", fontSize: 10, marginTop: 2 }, listPanel: { position: "absolute", top: 350, left: 16, right: 16, bottom: 16, borderRadius: 20, overflow: "hidden", backgroundColor: "#FFFFFF", shadowColor: "#0B2440", shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 }, listContent: { padding: 8 }, listSpot: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#EDF0F3" }, listDot: { width: 13, height: 13, borderRadius: 7 }, listCopy: { flex: 1 }, listName: { color: "#0B2440", fontSize: 16, fontWeight: "700" }, listMeta: { color: "#68768A", marginTop: 3, fontSize: 13 }
});

const compact = StyleSheet.create({
  header: { gap: 12, paddingBottom: 10 }, title: { fontSize: 32, lineHeight: 38 }, iconButton: { width: 46, height: 46, borderRadius: 23 }, search: { minHeight: 52, gap: 12, paddingHorizontal: 16, borderRadius: 16 }, searchPlaceholder: { fontSize: 16 }, searchDivider: { height: 30 }, filters: { gap: 10 }, filter: { minHeight: 42, gap: 8, paddingHorizontal: 14, borderRadius: 20 }, filterText: { fontSize: 14 }, segmented: { height: 50, borderRadius: 16 }, segmentText: { fontSize: 16 }, mapControls: { top: 250 }, legend: { minHeight: 42, gap: 8, paddingHorizontal: 11, borderRadius: 15 }, legendItem: { gap: 4 }, legendDot: { width: 10, height: 10, borderRadius: 5 }, legendText: { fontSize: 9 }, mapActionRow: { position: "absolute", left: 0, right: 0, bottom: 220, marginBottom: 0 }, searchArea: { minHeight: 52, paddingHorizontal: 16, borderRadius: 17 }, searchAreaText: { fontSize: 16 }, locationButton: { width: 52, height: 52, borderRadius: 26 }, sheet: { paddingTop: 8, paddingBottom: 10, borderTopLeftRadius: 24, borderTopRightRadius: 24 }, handle: { marginBottom: 9 }, sheetTop: { gap: 11 }, photo: { width: 88, height: 88, borderRadius: 12 }, spotName: { fontSize: 22, lineHeight: 27 }, spotMeta: { fontSize: 14 }, metrics: { gap: 5, marginTop: 7 }, scoreNumber: { fontSize: 33, lineHeight: 38 }, scoreLabel: { fontSize: 11 }, sheetActions: { gap: 8, marginTop: 10 }, detailButton: { minHeight: 48, borderRadius: 13 }, detailText: { fontSize: 14 }, directionButton: { minHeight: 48, borderRadius: 13 }, directionText: { fontSize: 13 }, saveButton: { minWidth: 48, minHeight: 48 }
});

const layout = StyleSheet.create({
  segmented: { marginTop: 6 },
  mapControls: { top: 300 },
  mapActionWithoutSearch: { justifyContent: "flex-end" },
  mapActionExpanded: { bottom: 220 },
  mapActionCompact: { bottom: 90 }
});
