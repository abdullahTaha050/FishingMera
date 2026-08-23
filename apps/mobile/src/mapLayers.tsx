import { GeoJSONSource, Layer, Marker } from "@maplibre/maplibre-react-native";
import { StyleSheet, Text, View } from "react-native";
import { BUNDLED_COAST, BUNDLED_LAND, BUNDLED_PLACE_LABELS, BUNDLED_ROADS } from "./map";

export function BundledBasemapLayers() {
  return <>
    <GeoJSONSource id="bundled-land" data={BUNDLED_LAND}><Layer id="bundled-land-fill" type="fill" paint={{ "fill-color": "#E8E4D6", "fill-opacity": 1 }} /></GeoJSONSource>
    <GeoJSONSource id="bundled-roads-source" data={BUNDLED_ROADS} tolerance={0.25}><Layer id="bundled-roads" type="line" paint={{ "line-color": ["match", ["get", "class"], "trunk", "#B85E34", "primary", "#CA8150", "secondary", "#9D8768", "#AAA08B"], "line-width": ["match", ["get", "class"], "trunk", 3.4, "primary", 2.8, "secondary", 2.2, 1.4], "line-opacity": 1 }} /></GeoJSONSource>
    <GeoJSONSource id="bundled-coast-source" data={BUNDLED_COAST} tolerance={0.1}><Layer id="bundled-coast" type="line" paint={{ "line-color": "#245D69", "line-width": 3.2 }} /></GeoJSONSource>
    {BUNDLED_PLACE_LABELS.map((place) => <Marker id={`place-${place.name}`} key={place.name} lngLat={place.coordinates}><View pointerEvents="none" style={styles.label}><Text style={styles.labelText}>{place.name}</Text></View></Marker>)}
  </>;
}

const styles = StyleSheet.create({ label: { backgroundColor: "rgba(244,242,234,0.9)", borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 }, labelText: { color: "#18221D", fontSize: 11, fontWeight: "800" } });
