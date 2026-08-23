import { OfflineManager } from "@maplibre/maplibre-react-native";
import type { Spot } from "@mera/types";
import type { FeatureCollection } from "geojson";
import bundledBasemapJson from "../assets/sakarya-kocaeli-basemap.json";
import { trackEvent, type Database } from "./db";

export const SAKARYA_NORTH_BOUNDS: [number, number, number, number] = [30.55, 41.02, 31.08, 41.17];
export const KOCAELI_NORTH_BOUNDS: [number, number, number, number] = [29.90, 41.05, 30.40, 41.24];
export const BUNDLED_NORTH_COAST_BOUNDS: [number, number, number, number] = [29.95, 40.95, 31.65, 41.35];
export const BUNDLED_BASEMAP = bundledBasemapJson as unknown as FeatureCollection;
export const BUNDLED_ROADS = {
  type: "FeatureCollection" as const,
  features: BUNDLED_BASEMAP.features.filter((feature) => feature.properties?.kind === "road" && ["trunk", "primary", "secondary", "tertiary"].includes(String(feature.properties.class)))
};
export const BUNDLED_COAST = {
  type: "FeatureCollection" as const,
  features: BUNDLED_BASEMAP.features.filter((feature) => feature.properties?.kind === "coastline")
};
export const BUNDLED_LAND = {
  type: "FeatureCollection" as const,
  features: [{
    type: "Feature" as const,
    properties: { kind: "approximate-land-mask" },
    geometry: {
      type: "Polygon" as const,
      coordinates: [[
        [29.90, 40.80], [31.75, 40.80], [31.75, 41.38], [31.60, 41.34],
        [31.43, 41.29], [31.38, 41.18], [31.12, 41.09], [30.85, 41.055],
        [30.70, 41.105], [30.45, 41.16], [30.25, 41.20], [30.00, 41.14],
        [29.90, 41.12], [29.90, 40.80]
      ]]
    }
  }]
};
const labelNames = new Set(["Akçakoca", "Ereğli", "Alaplı", "Yığılca", "Kaynarca", "Kocaali", "Kandıra", "Karasu"]);
export const BUNDLED_PLACE_LABELS = [...labelNames].flatMap((name) => {
  const feature = BUNDLED_BASEMAP.features.find((entry) => entry.properties?.kind === "place" && entry.properties.name === name && entry.geometry.type === "Point");
  return feature && feature.geometry.type === "Point" ? [{ name, coordinates: feature.geometry.coordinates as [number, number] }] : [];
});
export const BUNDLED_BASEMAP_VERSION = "osm-north-coast-20260823-v1";
export const BUNDLED_BASEMAP_SHA256 = "729171b256531279313224f10e3f2fe79764a08751c4882b9fa21033c5d4a590";

export const fallbackMapStyle = {
  version: 8 as const,
  name: "Mera offline fallback",
  sources: {},
  layers: [{ id: "background", type: "background" as const, paint: { "background-color": "#B9DCE3" } }]
};

export function spotsGeoJson(spots: Spot[]) {
  return {
    type: "FeatureCollection" as const,
    features: spots.filter((spot) => spot.coordinatePrecision !== "UNKNOWN").map((spot) => ({
      type: "Feature" as const,
      id: spot.id,
      geometry: { type: "Point" as const, coordinates: [spot.coordinates.longitude, spot.coordinates.latitude] },
      properties: { id: spot.id, name: spot.canonicalName, verification: spot.verificationStatus, prohibited: spot.prohibitedStatus }
    }))
  };
}

export async function downloadOfflineRegion(
  db: Database,
  region: { id: string; name: string; bounds: [number, number, number, number] },
  onProgress: (percentage: number) => void
): Promise<string> {
  const mapStyle = process.env.EXPO_PUBLIC_MAP_STYLE_URL;
  await trackEvent(db, "offline_region_downloaded", { regionId: region.id });
  const now = new Date().toISOString();
  if (!mapStyle) {
    const packId = `bundled:${BUNDLED_BASEMAP_VERSION}`;
    await db.runAsync(
      "INSERT INTO offline_regions(id,name,pack_id,state,progress,style_url,bounds_json,package_version,checksum,updated_at) VALUES(?,?,?,'COMPLETE',100,'bundled://osm-north-coast',?,?,?,?) ON CONFLICT(id) DO UPDATE SET pack_id=excluded.pack_id,state='COMPLETE',progress=100,style_url=excluded.style_url,bounds_json=excluded.bounds_json,package_version=excluded.package_version,checksum=excluded.checksum,updated_at=excluded.updated_at",
      region.id, region.name, packId, JSON.stringify(BUNDLED_NORTH_COAST_BOUNDS), BUNDLED_BASEMAP_VERSION, BUNDLED_BASEMAP_SHA256, now
    );
    onProgress(100);
    return packId;
  }
  OfflineManager.setTileCountLimit(80_000);
  await db.runAsync("INSERT INTO offline_regions(id,name,state,progress,style_url,bounds_json,updated_at) VALUES(?,?,'DOWNLOADING',0,?,?,?) ON CONFLICT(id) DO UPDATE SET state='DOWNLOADING',progress=0,style_url=excluded.style_url,bounds_json=excluded.bounds_json,updated_at=excluded.updated_at", region.id, region.name, mapStyle, JSON.stringify(region.bounds), now);
  const pack = await OfflineManager.createPack(
    { mapStyle, bounds: region.bounds, minZoom: 6, maxZoom: 14, metadata: { regionId: region.id, name: region.name, sourcePolicy: "offline-permitted-self-hosted" } },
    async (offlinePack, status) => {
      onProgress(status.percentage);
      await db.runAsync("UPDATE offline_regions SET pack_id=?,state=?,progress=?,updated_at=? WHERE id=?", offlinePack.id, status.state === "complete" ? "COMPLETE" : "DOWNLOADING", status.percentage, new Date().toISOString(), region.id);
    },
    async (_offlinePack, error) => {
      await db.runAsync("UPDATE offline_regions SET state='FAILED',updated_at=? WHERE id=?", new Date().toISOString(), region.id);
      console.error("offline_pack_failed", { regionId: region.id, code: error.message });
    }
  );
  await pack.resume();
  return pack.id;
}
