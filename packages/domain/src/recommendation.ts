import { SPECIES, weightsForExperience } from "@mera/config";
import type {
  ConditionSnapshot,
  FactorScore,
  RecentReportSummary,
  RecommendationInput,
  RecommendationResult,
  ScoreFactor,
  Spot
} from "@mera/types";
import { matchGear } from "./gear";
import { haversineDistanceKm } from "./geo";
import { evaluateSafety } from "./safety";
import { ageMinutes } from "./staleness";

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function conditionsScore(snapshot: ConditionSnapshot | undefined): { score: number; code: string } {
  if (!snapshot) return { score: 0.4, code: "CONDITIONS_MISSING" };
  let score = 1;
  if (snapshot.waveHeightM !== undefined) score -= clamp((snapshot.waveHeightM - 0.3) / 2.2) * 0.55;
  if (snapshot.windGustKmh !== undefined) score -= clamp((snapshot.windGustKmh - 15) / 60) * 0.35;
  if (snapshot.precipitationMm !== undefined) score -= clamp(snapshot.precipitationMm / 10) * 0.1;
  return { score: clamp(score), code: score >= 0.75 ? "CONDITIONS_RELATIVELY_SUITABLE" : "CONDITIONS_ADVERSE" };
}

function buildFactor(factor: ScoreFactor, raw: number, weight: number, reasonCode: string): FactorScore {
  return { factor, raw, weight, contribution: raw * weight, reasonCode };
}

export function recommendSpot(
  spot: Spot,
  input: RecommendationInput,
  conditions?: ConditionSnapshot,
  reports?: RecentReportSummary
): RecommendationResult | null {
  const distanceKm = haversineDistanceKm(input.userCoordinates, spot.coordinates);
  if (distanceKm > input.maxDistanceKm) return null;
  if (spot.publicationLevel === "PRIVATE" && !spot.ownerId) return null;

  const weights = weightsForExperience(input.experience);
  const safety = evaluateSafety(spot, conditions, input.experience, input.now);
  const speciesRaw = spot.targetSpecies.includes(input.targetSpecies) ? 1 : spot.verificationStatus === "POTENTIAL" ? 0.25 : 0;
  const gear = matchGear(input.gear, input.targetSpecies, spot);
  const condition = conditionsScore(conditions);
  const safetyRaw = safety.severity === "NONE" ? 1 : safety.severity === "CAUTION" ? 0.45 : 0;
  const speciesConfig = SPECIES.find((entry) => entry.id === input.targetSpecies);
  const month = new Date(input.now).getUTCMonth() + 1;
  const seasonalRaw = speciesConfig?.activeMonths.includes(month) ? 1 : 0.35;
  const reportsRaw = reports && reports.reportCount > 0 ? clamp(reports.positiveCount / reports.reportCount) : 0.45;
  const distanceRaw = clamp(1 - distanceKm / input.maxDistanceKm);

  const factors = [
    buildFactor("SPECIES", speciesRaw, weights.SPECIES, speciesRaw === 1 ? "SPECIES_REPORTED" : "SPECIES_EVIDENCE_WEAK"),
    buildFactor("CONDITIONS", condition.score, weights.CONDITIONS, condition.code),
    buildFactor("GEAR", gear.score, weights.GEAR, gear.reasonCode),
    buildFactor("SAFETY", safetyRaw, weights.SAFETY, safety.severity === "NONE" ? "NO_MODEL_RISK_FLAG" : "SAFETY_FLAGGED"),
    buildFactor("SEASON", seasonalRaw, weights.SEASON, seasonalRaw === 1 ? "SEASON_MATCH" : "OUTSIDE_PRIMARY_SEASON"),
    buildFactor("REPORTS", reportsRaw, weights.REPORTS, reports ? "RECENT_REPORTS_AVAILABLE" : "RECENT_REPORTS_MISSING"),
    buildFactor("DISTANCE", distanceRaw, weights.DISTANCE, "STRAIGHT_LINE_DISTANCE")
  ];

  const weighted = Math.round(factors.reduce((sum, factor) => sum + factor.contribution, 0));
  const score = Math.min(weighted, safety.scoreCap ?? 100);
  return {
    spot,
    score,
    straightLineDistanceKm: Number(distanceKm.toFixed(1)),
    factors,
    safety,
    explanationCodes: [...factors.map((factor) => factor.reasonCode), ...safety.reasonCodes],
    conditionAgeMinutes: conditions ? ageMinutes(conditions.fetchedAt, new Date(input.now)) : undefined
  };
}

export function rankRecommendations(
  spots: Spot[],
  input: RecommendationInput,
  conditionsBySpot: ReadonlyMap<string, ConditionSnapshot>,
  reportsBySpot: ReadonlyMap<string, RecentReportSummary>
): RecommendationResult[] {
  return spots
    .map((spot) => recommendSpot(spot, input, conditionsBySpot.get(spot.id), reportsBySpot.get(spot.id)))
    .filter((result): result is RecommendationResult => result !== null)
    .sort((left, right) => Number(right.safety.allowed) - Number(left.safety.allowed) || right.score - left.score || left.straightLineDistanceKm - right.straightLineDistanceKm);
}
