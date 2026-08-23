import { haversineDistanceKm } from "@mera/domain";
import { describe, expect, it } from "vitest";
import { SEED_SPOTS } from "../src";

describe("Sakarya/Kocaeli seed dataset", () => {
  it("contains 15–30 sourced, unique and non-verified records", () => {
    expect(SEED_SPOTS.length).toBeGreaterThanOrEqual(15);
    expect(SEED_SPOTS.length).toBeLessThanOrEqual(30);
    expect(new Set(SEED_SPOTS.map((spot) => spot.id)).size).toBe(SEED_SPOTS.length);
    expect(SEED_SPOTS.every((spot) => spot.sources.length > 0)).toBe(true);
    expect(SEED_SPOTS.some((spot) => spot.verificationStatus === "VERIFIED")).toBe(false);
  });

  it("never presents potential records as confirmed species evidence", () => {
    expect(SEED_SPOTS.filter((spot) => spot.verificationStatus === "POTENTIAL").every((spot) => spot.sourceType === "GEOGRAPHIC")).toBe(true);
  });

  it("has useful candidates within the Hendek 100 km demo radius", () => {
    const hendek = { latitude: 40.799, longitude: 30.748 };
    const nearby = SEED_SPOTS.filter((spot) => haversineDistanceKm(hendek, spot.coordinates) <= 100 && spot.prohibitedStatus !== "SECURITY_AREA");
    expect(nearby.length).toBeGreaterThanOrEqual(12);
    expect(nearby.some((spot) => spot.targetSpecies.includes("ISTAVRIT"))).toBe(true);
  });

  it("keeps private coordinates out of the bundled public seed", () => {
    expect(SEED_SPOTS.every((spot) => spot.publicationLevel === "PUBLIC" && !spot.ownerId)).toBe(true);
  });
});

