import type { GearProfile, SpeciesId, Spot } from "@mera/types";

export interface GearMatch {
  score: number;
  reasonCode: string;
}

export function matchGear(gear: GearProfile | undefined, species: SpeciesId, spot: Spot): GearMatch {
  if (!gear) return { score: 0.5, reasonCode: "GEAR_UNKNOWN" };
  if (species === "ISTAVRIT") {
    let points = 0;
    let known = 0;
    if (gear.rodType && gear.rodType !== "UNKNOWN") {
      known += 1;
      if (["SPIN", "TELESCOPIC", "SURF"].includes(gear.rodType)) points += 1;
    }
    if (gear.castingWeightMaxG !== undefined) {
      known += 1;
      if (gear.castingWeightMaxG >= 15) points += 1;
    }
    if (gear.rodLengthCm !== undefined) {
      known += 1;
      if (gear.rodLengthCm >= 240) points += 1;
    }
    if (known === 0) return { score: 0.5, reasonCode: "GEAR_UNKNOWN" };
    const score = points / known;
    return { score, reasonCode: score >= 0.75 ? "GEAR_GOOD_MATCH" : score >= 0.4 ? "GEAR_PARTIAL_MATCH" : "GEAR_POOR_MATCH" };
  }
  const explicit = spot.recommendedGearTags.some((tag) => gear.rodType && tag.toUpperCase().includes(gear.rodType));
  return { score: explicit ? 0.9 : 0.55, reasonCode: explicit ? "GEAR_GOOD_MATCH" : "GEAR_LIMITED_EVIDENCE" };
}

