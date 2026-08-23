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
    const cachedCandidates = await db.from("discovery_candidates").select(
      "*,discovery_sources(*)",
    ).eq("run_id", recent.data.id).order("confidence_score", {
      ascending: false,
    });
    return cachedCandidates.error
      ? response({ code: "DISCOVERY_CACHE_READ_FAILED" }, 503)
      : response({
        source: "cached",
        runId: recent.data.id,
        candidates: cachedCandidates.data.map((candidate) => {
          const coordinates = candidate.candidate_location?.coordinates as
            | [number, number]
            | undefined;
          return {
            canonicalName: candidate.canonical_name,
            localNames: [],
            province: candidate.province,
            district: candidate.district,
            latitude: coordinates?.[1] ?? null,
            longitude: coordinates?.[0] ?? null,
            coordinatePrecision: candidate.coordinate_precision,
            coordinateEvidence: candidate.coordinate_evidence,
            targetSpecies: candidate.target_species,
            accessEvidence: candidate.access_evidence,
            confidenceScore: candidate.confidence_score,
            sources: (candidate.discovery_sources ?? []).map((
              source: Record<string, unknown>,
            ) => ({
              url: source.url,
              title: source.title,
              sourceDate: source.source_date,
              supportsCoordinate: source.supports_coordinate,
              supportsFishing: source.supports_fishing,
            })),
          };
        }),
      });
  }

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const usage = await db.from("discovery_runs").select(
    "search_calls,estimated_cost_usd",
  ).gte("started_at", startOfDay.toISOString());
  const calls = usage.data?.reduce((sum, item) => sum + item.search_calls, 0) ??
    0;
  const dailyLimit = Number(Deno.env.get("DISCOVERY_DAILY_SEARCH_LIMIT") ?? 25);
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);
  const monthlyUsage = await db.from("discovery_runs").select(
    "estimated_cost_usd",
  ).gte("started_at", startOfMonth.toISOString());
  const monthlyCost = monthlyUsage.data?.reduce(
    (sum, item) => sum + Number(item.estimated_cost_usd),
    0,
  ) ?? 0;
  const monthlyLimit = Number(
    Deno.env.get("DISCOVERY_MONTHLY_USD_LIMIT") ?? 10,
  );
  if (calls >= dailyLimit || monthlyCost >= monthlyLimit) {
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
    for (const candidate of accepted) {
      const insertedCandidate = await db.from("discovery_candidates").insert({
        run_id: run.data.id,
        canonical_name: candidate.canonicalName,
        district: candidate.district,
        province: candidate.province,
        candidate_location: candidate.latitude === null ||
            candidate.longitude === null
          ? null
          : `POINT(${candidate.longitude} ${candidate.latitude})`,
        coordinate_precision: candidate.coordinatePrecision,
        coordinate_evidence: candidate.coordinateEvidence,
        target_species: candidate.targetSpecies,
        access_evidence: candidate.accessEvidence,
        confidence_score: candidate.confidenceScore,
      }).select("id").single();
      if (insertedCandidate.error) throw new Error("CANDIDATE_WRITE_FAILED");
      const insertedSources = await db.from("discovery_sources").insert(
        candidate.sources.map((source) => ({
          candidate_id: insertedCandidate.data.id,
          url: source.url,
          title: source.title,
          source_date: source.sourceDate && /^\d{4}-\d{2}-\d{2}$/.test(
              source.sourceDate,
            )
            ? source.sourceDate
            : null,
          supports_coordinate: source.supportsCoordinate,
          supports_fishing: source.supportsFishing,
        })),
      );
      if (insertedSources.error) {
        throw new Error("CANDIDATE_SOURCE_WRITE_FAILED");
      }
    }
    const searchCalls = Math.max(
      1,
      result.output?.filter((item) => item.type === "web_search_call").length ??
        0,
    );
    const inputTokens = result.usage?.input_tokens ?? 0;
    const outputTokens = result.usage?.output_tokens ?? 0;
    const estimatedCost = searchCalls * Number(
          Deno.env.get("DISCOVERY_WEB_SEARCH_USD_PER_CALL") ?? 0.01,
        ) +
      inputTokens / 1_000_000 * Number(
          Deno.env.get("DISCOVERY_INPUT_USD_PER_MILLION") ?? 0.25,
        ) +
      outputTokens / 1_000_000 * Number(
          Deno.env.get("DISCOVERY_OUTPUT_USD_PER_MILLION") ?? 2,
        );
    await db.from("discovery_runs").update({
      status: "COMPLETED",
      completed_at: new Date().toISOString(),
      search_calls: searchCalls,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_usd: estimatedCost,
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

const syncItemSchema = z.object({
  id: z.string().uuid(),
  entityId: z.string().uuid(),
  entityType: z.enum([
    "CATCH_REPORT",
    "USER_SPOT",
    "GEAR_PROFILE",
    "FAVORITE",
    "FEEDBACK",
  ]),
  operation: z.enum(["UPSERT", "DELETE"]),
  payload: z.record(z.string(), z.unknown()),
  idempotencyKey: z.string().min(10).max(300),
});

async function syncMutation(request: Request) {
  const userId = await authenticatedUser(request);
  if (!userId) return response({ code: "AUTH_REQUIRED" }, 401);
  const item = syncItemSchema.parse(await request.json());
  const headerKey = request.headers.get("x-idempotency-key");
  if (headerKey !== item.idempotencyKey) {
    return response({ code: "IDEMPOTENCY_KEY_MISMATCH" }, 400);
  }
  const db = serviceClient();
  const previous = await db.from("sync_operations").select("response_payload")
    .eq("owner_id", userId).eq("idempotency_key", item.idempotencyKey)
    .maybeSingle();
  if (previous.data) {
    return response({
      ok: true,
      replayed: true,
      result: previous.data.response_payload,
    });
  }

  let mutationError: { message: string; code?: string } | null = null;
  if (item.entityType === "FAVORITE") {
    if (item.operation === "DELETE" || item.payload.favorite === false) {
      mutationError =
        (await db.from("favorites").delete().eq("owner_id", userId).eq(
          "spot_id",
          String(item.payload.spotId),
        )).error;
    } else {mutationError = (await db.from("favorites").upsert({
        owner_id: userId,
        spot_id: String(item.payload.spotId),
        updated_at: new Date().toISOString(),
      }, { onConflict: "owner_id,spot_id" })).error;}
  } else if (item.entityType === "GEAR_PROFILE") {
    const gear = z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(80),
      rodType: z.string().optional(),
      rodLengthCm: z.number().optional(),
      castingWeightMinG: z.number().optional(),
      castingWeightMaxG: z.number().optional(),
      reelSize: z.number().optional(),
      mainLine: z.string().optional(),
      lineDiameterMm: z.number().optional(),
      peRating: z.number().optional(),
    }).parse(item.payload.gear);
    mutationError = (await db.from("gear_profiles").upsert({
      id: gear.id,
      owner_id: userId,
      name: gear.name,
      rod_type: gear.rodType ?? null,
      rod_length_cm: gear.rodLengthCm ?? null,
      casting_weight_min_g: gear.castingWeightMinG ?? null,
      casting_weight_max_g: gear.castingWeightMaxG ?? null,
      reel_size: gear.reelSize ?? null,
      main_line: gear.mainLine ?? null,
      line_diameter_mm: gear.lineDiameterMm ?? null,
      pe_rating: gear.peRating ?? null,
      updated_at: new Date().toISOString(),
    })).error;
  } else if (item.entityType === "CATCH_REPORT") {
    const report = z.object({
      id: z.string().uuid(),
      startedAt: z.string().datetime(),
      targetSpecies: z.string(),
      caughtSpecies: z.array(z.unknown()).default([]),
      quantity: z.number().int().min(0).default(0),
      result: z.enum(["NONE", "LOW", "MEDIUM", "GOOD"]),
      gearProfileId: z.string().uuid().nullable().optional(),
      note: z.string().max(5000).optional(),
      spotId: z.string().uuid().nullable().optional(),
    }).parse(item.payload);
    let snapshotId: string | null = null;
    if (report.spotId) {
      const snapshot = await db.from("condition_snapshots").select("id").eq(
        "spot_id",
        report.spotId,
      ).lte("observed_at", report.startedAt).order("observed_at", {
        ascending: false,
      }).limit(1).maybeSingle();
      snapshotId = snapshot.data?.id ?? null;
    }
    mutationError = (await db.from("catch_reports").upsert({
      id: report.id,
      owner_id: userId,
      spot_id: report.spotId ?? null,
      started_at: report.startedAt,
      target_species_id: report.targetSpecies,
      caught_species: report.caughtSpecies,
      quantity: report.quantity,
      result: report.result,
      gear_profile_id: report.gearProfileId ?? null,
      note: report.note ?? null,
      condition_snapshot_id: snapshotId,
      updated_at: new Date().toISOString(),
    })).error;
  } else if (item.entityType === "USER_SPOT") {
    if (item.operation === "DELETE") {
      mutationError = (await db.from("spots").delete().eq("id", item.entityId)
        .eq("owner_id", userId)).error;
    } else {
      const userSpot = z.object({
        id: z.string().uuid(),
        canonicalName: z.string().min(2).max(160),
        coordinates: z.object({
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
        }),
        publicationLevel: z.enum(["PUBLIC", "PRIVATE", "APPROXIMATE"]),
        targetSpecies: z.array(z.string().min(2).max(40)).max(20),
        coastlineType: z.string().min(2).max(40),
        accessType: z.string().min(2).max(40),
        terrain: z.string().max(1000),
        knownHazards: z.array(z.string().max(300)).max(20),
        accessWarnings: z.array(z.string().max(300)).max(20),
      }).parse(item.payload.spot);
      const isPrivate = userSpot.publicationLevel === "PRIVATE";
      const isApproximate = userSpot.publicationLevel === "APPROXIMATE";
      const displayLatitude = isApproximate
        ? Math.round(userSpot.coordinates.latitude * 100) / 100
        : userSpot.coordinates.latitude;
      const displayLongitude = isApproximate
        ? Math.round(userSpot.coordinates.longitude * 100) / 100
        : userSpot.coordinates.longitude;
      const publicLocation = isPrivate
        ? null
        : `POINT(${displayLongitude} ${displayLatitude})`;
      mutationError = (await db.from("spots").upsert({
        id: userSpot.id,
        owner_id: userId,
        canonical_name: userSpot.canonicalName,
        location: publicLocation,
        coordinate_precision: isPrivate
          ? "UNKNOWN"
          : isApproximate
          ? "APPROXIMATE"
          : "EXACT",
        uncertainty_radius_m: isApproximate ? 1500 : null,
        province: "Bilinmiyor",
        district: "Bilinmiyor",
        country: "TR",
        coastline_type: userSpot.coastlineType,
        access_type: userSpot.accessType,
        beginner_suitability: "UNKNOWN",
        terrain: userSpot.terrain,
        known_hazards: userSpot.knownHazards,
        access_warnings: userSpot.accessWarnings,
        prohibited_status: "UNKNOWN",
        techniques: [],
        recommended_gear_tags: [],
        source_type: "COMMUNITY",
        verification_status: "COMMUNITY",
        confidence_score: 0.35,
        publication_level: userSpot.publicationLevel,
        updated_at: new Date().toISOString(),
      })).error;
      if (!mutationError) {
        if (isPrivate || isApproximate) {
          mutationError = (await db.from("private_spot_locations").upsert({
            spot_id: userSpot.id,
            owner_id: userId,
            exact_location:
              `POINT(${userSpot.coordinates.longitude} ${userSpot.coordinates.latitude})`,
          })).error;
        } else {
          mutationError = (await db.from("private_spot_locations").delete().eq(
            "spot_id",
            userSpot.id,
          ).eq("owner_id", userId)).error;
        }
      }
      if (!mutationError) {
        mutationError = (await db.from("spot_species").delete().eq(
          "spot_id",
          userSpot.id,
        )).error;
      }
      if (!mutationError && userSpot.targetSpecies.length > 0) {
        mutationError = (await db.from("spot_species").insert(
          userSpot.targetSpecies.map((speciesId) => ({
            spot_id: userSpot.id,
            species_id: speciesId,
            evidence_level: 0.35,
          })),
        )).error;
      }
    }
  } else if (item.entityType === "FEEDBACK") {
    const feedback = z.object({
      id: z.string().uuid(),
      spotId: z.string().uuid(),
      feedbackType: z.enum([
        "LOCATION_CORRECT",
        "FISHABLE",
        "ACCESS_CHANGED",
        "PROHIBITED",
        "DANGEROUS",
        "SPECIES_WRONG",
      ]),
      note: z.string().max(1000).optional(),
    }).parse(item.payload);
    const windowStart = new Date(Date.now() - 60 * 60_000).toISOString();
    const recentFeedback = await db.from("spot_feedback").select("id").eq(
      "owner_id",
      userId,
    ).gte("created_at", windowStart).limit(5);
    if (recentFeedback.error) mutationError = recentFeedback.error;
    else if ((recentFeedback.data?.length ?? 0) >= 5) {
      return response({
        code: "FEEDBACK_RATE_LIMITED",
        retryAfterSeconds: 3600,
      }, 429);
    } else {
      mutationError = (await db.from("spot_feedback").insert({
        id: feedback.id,
        owner_id: userId,
        spot_id: feedback.spotId,
        feedback_type: feedback.feedbackType,
        note: feedback.note ?? null,
      })).error;
    }
  } else {
    return response({ code: "SYNC_ENTITY_NOT_IMPLEMENTED" }, 422);
  }
  if (mutationError) {
    return response({
      code: "SYNC_MUTATION_FAILED",
      detail: mutationError.code ?? "DATABASE",
    }, 503);
  }
  const resultPayload = {
    entityId: item.entityId,
    appliedAt: new Date().toISOString(),
  };
  const ledger = await db.from("sync_operations").insert({
    owner_id: userId,
    idempotency_key: item.idempotencyKey,
    entity_type: item.entityType,
    entity_id: item.entityId,
    operation: item.operation,
    response_payload: resultPayload,
  });
  if (ledger.error?.code !== "23505" && ledger.error) {
    return response({ code: "SYNC_LEDGER_FAILED" }, 503);
  }
  return response({
    ok: true,
    replayed: ledger.error?.code === "23505",
    result: resultPayload,
  });
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
    if (request.method === "POST" && path === "/sync") {
      return syncMutation(request);
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
