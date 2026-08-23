import { Camera, GeoJSONSource, Layer, Map, UserLocation } from "@maplibre/maplibre-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { Button, Loading, Screen } from "@/components";
import { fallbackMapStyle, spotsGeoJson } from "@/map";
import { BundledBasemapLayers } from "@/mapLayers";
import { useAppState } from "@/store";
import { colors, spacing } from "@/theme";

export default function MapScreen() {
  const state = useAppState();
  const { spotId } = useLocalSearchParams<{ spotId?: string }>();
  const geoJson = useMemo(() => spotsGeoJson(state.spots), [state.spots]);
  if (!state.ready) return <Loading />;
  const selectedSpot = state.spots.find((spot) => spot.id === spotId);
  const style = process.env.EXPO_PUBLIC_MAP_STYLE_URL ?? fallbackMapStyle;
  return <Screen><View style={styles.mapWrap}><Map style={styles.map} mapStyle={style} attribution logo compass>
    <Camera initialViewState={{ center: selectedSpot ? [selectedSpot.coordinates.longitude, selectedSpot.coordinates.latitude] : [30.45, 41.08], zoom: selectedSpot ? 12 : 7.2 }} />
    <UserLocation accuracy heading />
    {!process.env.EXPO_PUBLIC_MAP_STYLE_URL && <BundledBasemapLayers />}
    <GeoJSONSource id="seed-spots" data={geoJson} onPress={(event) => { const id = event.nativeEvent.features?.[0]?.properties?.id; if (typeof id === "string") router.push({ pathname: "/spot/[id]", params: { id } }); }}><Layer id="spot-circles" type="circle" paint={{ "circle-radius": 7, "circle-color": ["match", ["get", "verification"], "WEB_DISCOVERED", colors.primary, colors.moss], "circle-stroke-color": colors.white, "circle-stroke-width": 2 }} /></GeoJSONSource>
  </Map><View style={styles.add}><Button title="+ Mera ekle" onPress={() => router.push("/spot/new")} /></View>{!process.env.EXPO_PUBLIC_MAP_STYLE_URL && <View style={styles.notice}><Text style={styles.noticeText}>Sakarya–Kocaeli yol, kıyı, yer adı ve mera verisi pakete gömülü; internet gerekmez.</Text><Text accessibilityRole="link" style={styles.attribution} onPress={() => Linking.openURL("https://www.openstreetmap.org/copyright")}>© OpenStreetMap katkıcıları · ODbL</Text></View>}</View></Screen>;
}

const styles = StyleSheet.create({ mapWrap: { flex: 1 }, map: { flex: 1 }, add: { position: "absolute", right: spacing.md, top: spacing.md }, notice: { position: "absolute", left: spacing.md, right: spacing.md, bottom: spacing.md, padding: spacing.md, borderRadius: 14, backgroundColor: colors.offline }, noticeText: { color: colors.white, fontWeight: "700", lineHeight: 20 }, attribution: { color: colors.white, marginTop: spacing.xs, textDecorationLine: "underline", fontSize: 12 } });
