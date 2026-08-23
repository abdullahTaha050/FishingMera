import { Camera, GeoJSONSource, Layer, Map, UserLocation } from "@maplibre/maplibre-react-native";
import { router } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, Loading, Screen } from "@/components";
import { fallbackMapStyle, spotsGeoJson } from "@/map";
import { useAppState } from "@/store";
import { colors, spacing } from "@/theme";

export default function MapScreen() {
  const state = useAppState();
  const geoJson = useMemo(() => spotsGeoJson(state.spots), [state.spots]);
  if (!state.ready) return <Loading />;
  const style = process.env.EXPO_PUBLIC_MAP_STYLE_URL ?? fallbackMapStyle;
  return <Screen><View style={styles.mapWrap}><Map style={styles.map} mapStyle={style} attribution logo compass>
    <Camera initialViewState={{ center: [30.45, 41.08], zoom: 7.2 }} />
    <UserLocation accuracy heading />
    <GeoJSONSource id="seed-spots" data={geoJson}><Layer id="spot-circles" type="circle" paint={{ "circle-radius": 7, "circle-color": ["match", ["get", "verification"], "WEB_DISCOVERED", colors.primary, colors.moss], "circle-stroke-color": colors.white, "circle-stroke-width": 2 }} /></GeoJSONSource>
  </Map><View style={styles.add}><Button title="+ Mera ekle" onPress={() => router.push("/spot/new")} /></View>{!process.env.EXPO_PUBLIC_MAP_STYLE_URL && <View style={styles.notice}><Text style={styles.noticeText}>Seed pinleri çevrimdışı açık. Yol/kıyı tabanı için izinli Mera tile paketi yapılandırılmalı.</Text></View>}</View></Screen>;
}

const styles = StyleSheet.create({ mapWrap: { flex: 1 }, map: { flex: 1 }, add: { position: "absolute", right: spacing.md, top: spacing.md }, notice: { position: "absolute", left: spacing.md, right: spacing.md, bottom: spacing.md, padding: spacing.md, borderRadius: 14, backgroundColor: colors.offline }, noticeText: { color: colors.white, fontWeight: "700", lineHeight: 20 } });
