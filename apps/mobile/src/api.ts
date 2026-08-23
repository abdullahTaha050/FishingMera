import type { ConditionSnapshot, Spot } from "@mera/types";

function apiBase(): string | null {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
  return base ? `${base}/functions/v1/api` : null;
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

