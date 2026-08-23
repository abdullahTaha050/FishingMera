import type { ConditionSnapshot, Spot } from "@mera/types";
import { guestAccessToken } from "./auth";

function apiBase(): string | null {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
  return base ? `${base}/functions/v1/api` : null;
}

export interface DiscoveryCandidate {
  canonicalName: string;
  province: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  coordinatePrecision: "EXACT" | "APPROXIMATE" | "UNKNOWN";
  coordinateEvidence: string | null;
  accessEvidence: string | null;
  confidenceScore: number;
  sources: { url: string; title: string; supportsCoordinate: boolean; supportsFishing: boolean }[];
}

export async function discoverMoreSpots(input: { latitude: number; longitude: number; radiusKm: number; targetSpecies: string }): Promise<{ candidates: DiscoveryCandidate[]; cached: boolean }> {
  const base = apiBase();
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !anonKey) throw new Error("BACKEND_NOT_CONFIGURED");
  const token = await guestAccessToken();
  if (!token) throw new Error("AUTH_UNAVAILABLE");
  const result = await fetch(`${base}/discover`, {
    method: "POST",
    headers: { apikey: anonKey, authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      regionKey: `tr:${input.latitude.toFixed(1)}:${input.longitude.toFixed(1)}:${input.radiusKm}:${input.targetSpecies}`,
      regionDescription: `Merkez koordinatı ${input.latitude.toFixed(3)}, ${input.longitude.toFixed(3)} olan Türkiye kıyı bölgesi`,
      radiusKm: Math.max(25, Math.min(200, Math.round(input.radiusKm))),
      targetSpecies: input.targetSpecies,
      force: false
    })
  });
  const body = await result.json() as { source?: string; candidates?: DiscoveryCandidate[]; code?: string };
  if (!result.ok) throw new Error(body.code ?? `DISCOVERY_HTTP_${result.status}`);
  return { candidates: body.candidates ?? [], cached: body.source === "cached" };
}

export async function fetchConditions(spot: Spot): Promise<ConditionSnapshot | null> {
  const base = apiBase();
  if (!base) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const result = await fetch(`${base}/conditions?lat=${spot.coordinates.latitude}&lon=${spot.coordinates.longitude}`, {
      headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "" }, signal: controller.signal
    });
    if (!result.ok) return null;
    const body = await result.json() as { snapshot?: Record<string, unknown> };
    const row = body.snapshot;
    if (!row) return null;
    const numberOrUndefined = (key: string) => typeof row[key] === "number" ? row[key] as number : undefined;
    return {
      spotId: spot.id,
      airTemperatureC: numberOrUndefined("air_temperature_c"), precipitationMm: numberOrUndefined("precipitation_mm"),
      windSpeedKmh: numberOrUndefined("wind_speed_kmh"), windDirectionDeg: numberOrUndefined("wind_direction_deg"), windGustKmh: numberOrUndefined("wind_gust_kmh"),
      waveHeightM: numberOrUndefined("wave_height_m"), waveDirectionDeg: numberOrUndefined("wave_direction_deg"), wavePeriodS: numberOrUndefined("wave_period_s"), swellHeightM: numberOrUndefined("swell_height_m"),
      seaSurfaceTemperatureC: numberOrUndefined("sea_surface_temperature_c"), currentSpeedKmh: numberOrUndefined("current_speed_kmh"), currentDirectionDeg: numberOrUndefined("current_direction_deg"),
      sunrise: typeof row.sunrise === "string" ? row.sunrise : undefined, sunset: typeof row.sunset === "string" ? row.sunset : undefined,
      observedAt: String(row.observed_at), fetchedAt: String(row.fetched_at), expiresAt: String(row.expires_at), provider: "OPEN_METEO"
    };
  } finally { clearTimeout(timeout); }
}
