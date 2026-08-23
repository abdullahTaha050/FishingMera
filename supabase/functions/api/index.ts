import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };
const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers":
    "authorization, apikey, content-type, x-idempotency-key",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...jsonHeaders, ...corsHeaders },
  });

const candidateSchema = z.object({
  candidates: z.array(z.object({
    canonicalName: z.string().min(2).max(160),
    localNames: z.array(z.string()).max(10),
    province: z.string().nullable(),
    district: z.string().nullable(),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    coordinatePrecision: z.enum(["EXACT", "APPROXIMATE", "UNKNOWN"]),
    coordinateEvidence: z.string().nullable(),
    targetSpecies: z.array(z.string()).max(20),
    accessEvidence: z.string().nullable(),
    confidenceScore: z.number().min(0).max(1),
    sources: z.array(z.object({
      url: z.string().url(),
      title: z.string().min(1),
      sourceDate: z.string().nullable(),
      supportsCoordinate: z.boolean(),
      supportsFishing: z.boolean(),
    })).min(1).max(12),
  })).max(25),
});

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

function roundedCoordinate(value: number): number {
  return Math.round(value * 20) / 20;
}

function readNumber(url: URL, name: string, min: number, max: number): number {
  const value = Number(url.searchParams.get(name));
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`INVALID_${name.toUpperCase()}`);
  }
  return value;
}

function currentIndex(times: string[]): number {
  const now = Date.now();
  return times.reduce(
    (best, value, index) =>
      Math.abs(new Date(value).getTime() - now) <
          Math.abs(new Date(times[best]!).getTime() - now)
        ? index
        : best,
    0,
  );
}

async function conditions(url: URL) {
  const lat = readNumber(url, "lat", -90, 90);
  const lon = readNumber(url, "lon", -180, 180);
  const roundedLat = roundedCoordinate(lat);
  const roundedLon = roundedCoordinate(lon);
  const hour = new Date().toISOString().slice(0, 13);
  const cacheKey = `${roundedLat}:${roundedLon}:${hour}`;
  const db = serviceClient();
  const cached = await db.from("condition_snapshots").select("*").eq(
    "cache_key",
    cacheKey,
  ).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (cached.data) return response({ source: "cache", snapshot: cached.data });

  const weatherBase = Deno.env.get("OPEN_METEO_BASE_URL") ??
    "https://api.open-meteo.com";
  const marineBase = Deno.env.get("OPEN_METEO_MARINE_BASE_URL") ??
    "https://marine-api.open-meteo.com";
  const weatherUrl =
    `${weatherBase}/v1/forecast?latitude=${roundedLat}&longitude=${roundedLon}&hourly=temperature_2m,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m&daily=sunrise,sunset&timezone=UTC&forecast_days=2`;
  const marineUrl =
    `${marineBase}/v1/marine?latitude=${roundedLat}&longitude=${roundedLon}&hourly=wave_height,wave_direction,wave_period,swell_wave_height,sea_surface_temperature,ocean_current_velocity,ocean_current_direction&timezone=UTC&forecast_days=2&cell_selection=sea`;
  const [weatherResult, marineResult] = await Promise.allSettled([
    fetch(weatherUrl, { signal: AbortSignal.timeout(8_000) }).then((item) =>
      item.ok
        ? item.json()
        : Promise.reject(new Error(`WEATHER_${item.status}`))
    ),
    fetch(marineUrl, { signal: AbortSignal.timeout(8_000) }).then((item) =>
      item.ok ? item.json() : Promise.reject(new Error(`MARINE_${item.status}`))
    ),
  ]);
  if (
    weatherResult.status === "rejected" && marineResult.status === "rejected"
  ) {
    const stalePrefix = `${roundedLat}:${roundedLon}:`;
    const stale = await db.from("condition_snapshots").select("*").like(
      "cache_key",
      `${stalePrefix}%`,
    ).order("fetched_at", { ascending: false }).limit(1).maybeSingle();
    return stale.data
      ? response({ source: "stale_cache", stale: true, snapshot: stale.data })
      : response({ code: "CONDITIONS_UNAVAILABLE", retryable: true }, 503);
  }

  const weather = weatherResult.status === "fulfilled"
    ? weatherResult.value
    : undefined;
  const marine = marineResult.status === "fulfilled"
    ? marineResult.value
    : undefined;
  const weatherAt = weather?.hourly?.time
    ? currentIndex(weather.hourly.time)
    : -1;
  const marineAt = marine?.hourly?.time ? currentIndex(marine.hourly.time) : -1;
  const now = new Date();
  const row = {
    cache_key: cacheKey,
    rounded_location: `POINT(${roundedLon} ${roundedLat})`,
    air_temperature_c: weather?.hourly?.temperature_2m?.[weatherAt] ?? null,
    precipitation_mm: weather?.hourly?.precipitation?.[weatherAt] ?? null,
    wind_speed_kmh: weather?.hourly?.wind_speed_10m?.[weatherAt] ?? null,
    wind_direction_deg: weather?.hourly?.wind_direction_10m?.[weatherAt] ??
      null,
    wind_gust_kmh: weather?.hourly?.wind_gusts_10m?.[weatherAt] ?? null,
    wave_height_m: marine?.hourly?.wave_height?.[marineAt] ?? null,
    wave_direction_deg: marine?.hourly?.wave_direction?.[marineAt] ?? null,
    wave_period_s: marine?.hourly?.wave_period?.[marineAt] ?? null,
    swell_height_m: marine?.hourly?.swell_wave_height?.[marineAt] ?? null,
    sea_surface_temperature_c:
      marine?.hourly?.sea_surface_temperature?.[marineAt] ?? null,
    current_speed_kmh: marine?.hourly?.ocean_current_velocity?.[marineAt] ??
      null,
    current_direction_deg:
      marine?.hourly?.ocean_current_direction?.[marineAt] ?? null,
    sunrise: weather?.daily?.sunrise?.[0] ?? null,
    sunset: weather?.daily?.sunset?.[0] ?? null,
    provider: "OPEN_METEO",
    raw_payload: {
      weatherAvailable: Boolean(weather),
      marineAvailable: Boolean(marine),
    },
    observed_at: weather?.hourly?.time?.[weatherAt] ??
      marine?.hourly?.time?.[marineAt] ?? now.toISOString(),
    fetched_at: now.toISOString(),
    expires_at: new Date(now.getTime() + 6 * 60 * 60_000).toISOString(),
  };
  const saved = await db.from("condition_snapshots").upsert(row, {
    onConflict: "cache_key",
  }).select("*").single();
  if (saved.error) {
    return response({ code: "CACHE_WRITE_FAILED", retryable: true }, 503);
  }
  return response({
    source: "live",
    partial: !weather || !marine,
    snapshot: saved.data,
  });
}

async function nearby(url: URL) {
  const lat = readNumber(url, "lat", -90, 90);
  const lon = readNumber(url, "lon", -180, 180);
  const radiusKm = readNumber(url, "radiusKm", 1, 200);
  const result = await serviceClient().rpc("nearby_spots", {
    lat,
    lon,
    radius_m: Math.round(radiusKm * 1000),
    result_limit: 100,
  });
  return result.error
    ? response({ code: "NEARBY_QUERY_FAILED" }, 503)
    : response({ spots: result.data, distanceType: "STRAIGHT_LINE" });
}

async function authenticatedUser(request: Request): Promise<string | null> {
  const token = request.headers.get("authorization")?.replace(
    /^Bearer\s+/i,
    "",
  );
  if (!token) return null;
  const auth = await serviceClient().auth.getUser(token);
  return auth.data.user?.id ?? null;
}

async function discover(request: Request) {
  const userId = await authenticatedUser(request);
  if (!userId) return response({ code: "AUTH_REQUIRED" }, 401);
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) {
    return response({
      code: "DISCOVERY_TEMPORARILY_UNAVAILABLE",
      existingDataStillAvailable: true,
    }, 503);
  }
  const requestBody = z.object({
    regionKey: z.string().min(3).max(100),
    regionDescription: z.string().min(3).max(300),
    radiusKm: z.number().int().min(25).max(200),
    targetSpecies: z.string().min(2).max(40),
    force: z.boolean().default(false),
  }).parse(await request.json());
  const db = serviceClient();
  const recent = await db.from("discovery_runs").select("id,status,started_at")
    .eq("region_key", requestBody.regionKey).eq("status", "COMPLETED").gt(
      "started_at",
      new Date(Date.now() - 30 * 86400_000).toISOString(),
    ).order("started_at", { ascending: false }).limit(1).maybeSingle();
  if (recent.data && !requestBody.force) {
    return response({ source: "cached", runId: recent.data.id });
  }

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const usage = await db.from("discovery_runs").select(
    "search_calls,estimated_cost_usd",
  ).gte("started_at", startOfDay.toISOString());
  const calls = usage.data?.reduce((sum, item) => sum + item.search_calls, 0) ??
    0;
  const dailyLimit = Number(Deno.env.get("DISCOVERY_DAILY_SEARCH_LIMIT") ?? 25);
  if (calls >= dailyLimit) {
    return response({
      code: "DISCOVERY_BUDGET_BLOCKED",
      existingDataStillAvailable: true,
    }, 429);
  }

  const run = await db.from("discovery_runs").insert({
    region_key: requestBody.regionKey,
    radius_km: requestBody.radiusKm,
    species_id: requestBody.targetSpecies,
    status: "RUNNING",
  }).select("id").single();
  if (run.error) return response({ code: "DISCOVERY_LOCK_FAILED" }, 409);
  try {
    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      signal: AbortSignal.timeout(120_000),
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_DISCOVERY_MODEL") ?? "gpt-5-mini",
        store: false,
        max_tool_calls: 4,
        tools: [{ type: "web_search" }],
        include: ["web_search_call.action.sources"],
        input:
          `Türkiye kıyı balıkçılığı için yalnızca web kaynaklarında gerçekten geçen aday noktaları araştır. Bölge: ${requestBody.regionDescription}. Yarıçap: ${requestBody.radiusKm} km. Hedef: ${requestBody.targetSpecies}. Exact koordinat için açık koordinat/harita kanıtı yoksa latitude ve longitude null, coordinatePrecision UNKNOWN olmalı. İşletme adı benzerliğinden koordinat çıkarma. Potansiyeli gerçek av kanıtı gibi sunma.`,
        text: {
          format: {
            type: "json_schema",
            name: "fishing_spot_candidates",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["candidates"],
              properties: {
                candidates: {
                  type: "array",
                  maxItems: 25,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: [
                      "canonicalName",
                      "localNames",
                      "province",
                      "district",
                      "latitude",
                      "longitude",
                      "coordinatePrecision",
                      "coordinateEvidence",
                      "targetSpecies",
                      "accessEvidence",
                      "confidenceScore",
                      "sources",
                    ],
                    properties: {
                      canonicalName: { type: "string" },
                      localNames: { type: "array", items: { type: "string" } },
                      province: { type: ["string", "null"] },
                      district: { type: ["string", "null"] },
                      latitude: { type: ["number", "null"] },
                      longitude: { type: ["number", "null"] },
                      coordinatePrecision: {
                        type: "string",
                        enum: ["EXACT", "APPROXIMATE", "UNKNOWN"],
                      },
                      coordinateEvidence: { type: ["string", "null"] },
                      targetSpecies: {
                        type: "array",
                        items: { type: "string" },
                      },
                      accessEvidence: { type: ["string", "null"] },
                      confidenceScore: { type: "number" },
                      sources: {
                        type: "array",
                        items: {
                          type: "object",
                          additionalProperties: false,
                          required: [
                            "url",
                            "title",
                            "sourceDate",
                            "supportsCoordinate",
                            "supportsFishing",
                          ],
                          properties: {
                            url: { type: "string" },
                            title: { type: "string" },
                            sourceDate: { type: ["string", "null"] },
                            supportsCoordinate: { type: "boolean" },
                            supportsFishing: { type: "boolean" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    });
    if (!openaiResponse.ok) throw new Error(`OPENAI_${openaiResponse.status}`);
    const result = await openaiResponse.json() as {
      output?: Array<
        { type: string; content?: Array<{ type: string; text?: string }> }
      >;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const outputText = result.output?.flatMap((item) =>
      item.type === "message" ? item.content ?? [] : []
    ).find((item) => item.type === "output_text")?.text;
    if (!outputText) throw new Error("OPENAI_EMPTY_OUTPUT");
    const parsed = candidateSchema.parse(JSON.parse(outputText));
    const accepted = parsed.candidates.filter((candidate) => {
      const hasCoordinates = candidate.latitude !== null &&
        candidate.longitude !== null;
      const hasCoordinateSource = candidate.sources.some((source) =>
        source.supportsCoordinate
      );
      return candidate.coordinatePrecision === "UNKNOWN"
        ? !hasCoordinates
        : hasCoordinates && hasCoordinateSource &&
          Boolean(candidate.coordinateEvidence);
    });
    await db.from("discovery_runs").update({
      status: "COMPLETED",
      completed_at: new Date().toISOString(),
      search_calls: 1,
      input_tokens: result.usage?.input_tokens ?? 0,
      output_tokens: result.usage?.output_tokens ?? 0,
    }).eq("id", run.data.id);
    return response({
      source: "live",
      runId: run.data.id,
      candidates: accepted,
      rejectedCandidateCount: parsed.candidates.length - accepted.length,
    });
  } catch (error) {
    await db.from("discovery_runs").update({
      status: "FAILED",
      completed_at: new Date().toISOString(),
      error_code: error instanceof Error ? error.name : "UNKNOWN",
    }).eq("id", run.data.id);
    return response({
      code: "DISCOVERY_FAILED",
      retryable: true,
      existingDataStillAvailable: true,
    }, 503);
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^.*\/api/, "") || "/";
    if (request.method === "GET" && path === "/health") {
      return response({ ok: true, service: "mera-api" });
    }
    if (request.method === "GET" && path === "/nearby") return nearby(url);
    if (request.method === "GET" && path === "/conditions") {
      return conditions(url);
    }
    if (request.method === "POST" && path === "/discover") {
      return discover(request);
    }
    return response({ code: "NOT_FOUND" }, 404);
  } catch (error) {
    const code = error instanceof z.ZodError
      ? "VALIDATION_ERROR"
      : error instanceof Error
      ? error.message
      : "INTERNAL_ERROR";
    return response(
      { code },
      code.startsWith("INVALID_") || code === "VALIDATION_ERROR" ? 400 : 500,
    );
  }
});
