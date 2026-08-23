import { GeoJSONSource, Layer } from "@maplibre/maplibre-react-native";
import { BUNDLED_BASEMAP } from "./map";

export function BundledBasemapLayers() {
  return <GeoJSONSource id="bundled-basemap" data={BUNDLED_BASEMAP} tolerance={0.5}>
    <Layer id="bundled-roads" type="line" filter={["==", ["get", "kind"], "road"]} paint={{ "line-color": ["match", ["get", "class"], "motorway", "#C97445", "trunk", "#C97445", "primary", "#D19A61", "secondary", "#B8A88C", "#C8C4B8"], "line-width": ["match", ["get", "class"], "motorway", 3.2, "trunk", 3, "primary", 2.5, "secondary", 2, "tertiary", 1.5, 0.8], "line-opacity": 0.9 }} />
    <Layer id="bundled-coast" type="line" filter={["==", ["get", "kind"], "coastline"]} paint={{ "line-color": "#386D78", "line-width": 2.4 }} />
    <Layer id="bundled-places" type="symbol" filter={["==", ["get", "kind"], "place"]} minzoom={7} layout={{ "text-field": ["get", "name"], "text-size": ["match", ["get", "class"], "city", 16, "town", 14, 11], "text-allow-overlap": false }} paint={{ "text-color": "#18221D", "text-halo-color": "#F4F2EA", "text-halo-width": 1.5 }} />
  </GeoJSONSource>;
}
