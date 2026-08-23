import { OfflineManager } from "@maplibre/maplibre-react-native";
import type { Spot } from "@mera/types";
import type { Database } from "./db";

export const SAKARYA_NORTH_BOUNDS: [number, number, number, number] = [30.55, 41.02, 31.08, 41.17];
export const KOCAELI_NORTH_BOUNDS: [number, number, number, number] = [29.90, 41.05, 30.40, 41.24];

export const fallbackMapStyle = {
  version: 8 as const,
  name: "Mera offline fallback",
  sources: {},
  layers: [{ id: "background", type: "background" as const, paint: { "background-color": "#E8E4D6" } }]
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
  if (!mapStyle) throw new Error("OFFLINE_STYLE_NOT_CONFIGURED");
  OfflineManager.setTileCountLimit(80_000);
  const now = new Date().toISOString();
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
