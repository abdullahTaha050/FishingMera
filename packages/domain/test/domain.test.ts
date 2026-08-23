import { describe, expect, it } from "vitest";
import { compassLabelTr, haversineDistanceKm, initialBearingDegrees, isRetryableStatus, likelySameSpot, matchGear, nameSimilarity, rankRecommendations, recommendSpot, retryDelayMs, stalenessLabelTr, summarizeRecentReports } from "../src";
import { conditions, gear, spot } from "./fixtures";

const input = {
  userCoordinates: { latitude: 40.799, longitude: 30.748 },
  experience: "BEGINNER" as const,
  targetSpecies: "ISTAVRIT" as const,
  gear,
  maxDistanceKm: 100,
  now: "2026-08-23T06:05:00Z"
};

describe("geodesy", () => {
  it("calculates distance and bearing without network", () => {
    expect(haversineDistanceKm(input.userCoordinates, spot.coordinates)).toBeGreaterThan(34);
    expect(haversineDistanceKm(input.userCoordinates, spot.coordinates)).toBeLessThan(36);
    const bearing = initialBearingDegrees(input.userCoordinates, spot.coordinates);
    expect(bearing).toBeGreaterThan(340);
    expect(compassLabelTr(bearing)).toBe("Kuzey");
  });
});

describe("gear matching", () => {
  it("matches the demo spin setup to istavrit", () => {
    expect(matchGear(gear, "ISTAVRIT", spot)).toEqual({ score: 1, reasonCode: "GEAR_GOOD_MATCH" });
  });
  it("does not pretend unknown gear is perfect", () => {
    expect(matchGear(undefined, "ISTAVRIT", spot).score).toBe(0.5);
  });
});

describe("recommendation", () => {
  it("returns an explainable deterministic score", () => {
    const result = recommendSpot(spot, input, conditions, { speciesId: "ISTAVRIT", reportCount: 5, positiveCount: 4 });
    expect(result?.score).toBeGreaterThanOrEqual(80);
    expect(result?.factors).toHaveLength(7);
    expect(result?.straightLineDistanceKm).toBeCloseTo(35, 0);
  });

  it("hard-caps high wave risk for beginners", () => {
    const result = recommendSpot(spot, input, { ...conditions, waveHeightM: 2 }, undefined);
    expect(result?.safety.allowed).toBe(false);
    expect(result?.safety.reasonCodes).toContain("WAVE_TOO_HIGH");
    expect(result?.score).toBeLessThanOrEqual(39);
  });

  it("filters outside radius and ranks allowed before blocked", () => {
    const far = { ...spot, id: "far", coordinates: { latitude: 42, longitude: 32 } };
    const risky = { ...spot, id: "risky", prohibitedStatus: "PROHIBITED" as const };
    const results = rankRecommendations([far, risky, spot], input, new Map([[spot.id, conditions], [risky.id, conditions]]), new Map());
    expect(results.map((entry) => entry.spot.id)).toEqual([spot.id, risky.id]);
  });

  it("summarizes only recent target-species reports for scoring", () => {
    const summaries = summarizeRecentReports([
      { spotId: spot.id, startedAt: "2026-08-20T06:00:00Z", targetSpecies: "ISTAVRIT", quantity: 2, result: "GOOD" },
      { spotId: spot.id, startedAt: "2026-08-19T06:00:00Z", targetSpecies: "ISTAVRIT", quantity: 0, result: "NONE" },
      { spotId: spot.id, startedAt: "2026-01-01T06:00:00Z", targetSpecies: "ISTAVRIT", quantity: 5, result: "GOOD" },
      { spotId: spot.id, startedAt: "2026-08-21T06:00:00Z", targetSpecies: "LUFER", quantity: 1, result: "GOOD" }
    ], "ISTAVRIT", new Date(input.now));
    expect(summaries.get(spot.id)).toEqual({ speciesId: "ISTAVRIT", reportCount: 2, positiveCount: 1, lastReportedAt: "2026-08-20T06:00:00Z" });
  });
});

describe("deduplication", () => {
  it("merges local name variants near the same coordinate", () => {
    expect(nameSimilarity("Harabeler", "Harabeler Lüfer Merası")).toBeGreaterThan(0.65);
    expect(likelySameSpot({ ...spot, canonicalName: "Harabeler", district: "Kandıra" }, { ...spot, id: "other", canonicalName: "Harabeler Lüfer Merası", district: "Kandıra", coordinates: { latitude: spot.coordinates.latitude + 0.001, longitude: spot.coordinates.longitude } })).toBe(true);
  });
});

describe("offline sync and staleness", () => {
  it("uses bounded exponential backoff with jitter", () => {
    expect(retryDelayMs(0, 0.5)).toBe(1000);
    expect(retryDelayMs(20, 0.5)).toBe(900000);
    expect(isRetryableStatus(429)).toBe(true);
    expect(isRetryableStatus(400)).toBe(false);
  });
  it("labels stale data explicitly", () => {
    expect(stalenessLabelTr("2026-08-23T03:05:00Z", new Date("2026-08-23T06:05:00Z"))).toBe("3 saat önce güncellendi");
    expect(stalenessLabelTr("2026-08-20T06:05:00Z", new Date("2026-08-23T06:05:00Z"))).toContain("eski veri");
  });
});
