import type { ConditionSnapshot, GearProfile, Spot } from "@mera/types";

export const gear: GearProfile = {
  id: "gear-1",
  name: "Alesta Spin",
  rodType: "SPIN",
  rodLengthCm: 270,
  castingWeightMinG: 10,
  castingWeightMaxG: 30,
  reelSize: 3000,
  mainLine: "BRAID"
};

export const spot: Spot = {
  id: "spot-1",
  canonicalName: "Karasu Yenimahalle",
  localNames: ["Yenimahalle mendirek"],
  coordinates: { latitude: 41.111, longitude: 30.684 },
  coordinatePrecision: "EXACT",
  province: "Sakarya",
  district: "Karasu",
  country: "TR",
  coastlineType: "BREAKWATER",
  accessType: "MIXED",
  beginnerSuitability: "SUITABLE",
  terrain: "Düz kıyı ve mendirek çevresi",
  knownHazards: [],
  accessWarnings: [],
  prohibitedStatus: "NONE",
  targetSpecies: ["ISTAVRIT"],
  techniques: ["Çapari", "Spin"],
  recommendedGearTags: ["SPIN"],
  sourceType: "SEED",
  verificationStatus: "WEB_DISCOVERED",
  confidenceScore: 0.75,
  publicationLevel: "PUBLIC",
  sources: [],
  createdAt: "2026-08-23T00:00:00Z",
  updatedAt: "2026-08-23T00:00:00Z"
};

export const conditions: ConditionSnapshot = {
  spotId: spot.id,
  windSpeedKmh: 8,
  windGustKmh: 14,
  waveHeightM: 0.4,
  wavePeriodS: 5,
  observedAt: "2026-08-23T05:00:00Z",
  fetchedAt: "2026-08-23T05:05:00Z",
  expiresAt: "2026-08-23T11:05:00Z",
  provider: "OPEN_METEO"
};

