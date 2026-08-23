import { SAFETY_THRESHOLDS } from "@mera/config";
import type { ConditionSnapshot, ExperienceLevel, SafetyDecision, Spot } from "@mera/types";

export function evaluateSafety(
  spot: Spot,
  conditions: ConditionSnapshot | undefined,
  experience: ExperienceLevel
): SafetyDecision {
  const reasons: string[] = [];
  if (spot.prohibitedStatus === "PROHIBITED") reasons.push("AREA_PROHIBITED");
  if (spot.prohibitedStatus === "SECURITY_AREA") reasons.push("HARBOUR_SECURITY_AREA");
  if (spot.coordinatePrecision !== "EXACT") reasons.push("COORDINATE_NOT_EXACT");
  if (spot.accessWarnings.some((warning) => /closed|kapalı/i.test(warning))) reasons.push("ACCESS_CLOSED");

  const beginner = experience === "FIRST_TIME" || experience === "BEGINNER";
  if (beginner && spot.beginnerSuitability === "UNSUITABLE") reasons.push("BEGINNER_UNSUITABLE");
  if (beginner && spot.coastlineType === "ROCK" && spot.accessType === "WALK") reasons.push("BEGINNER_RISKY_ROCKS");

  const limits = beginner ? SAFETY_THRESHOLDS.beginner : SAFETY_THRESHOLDS.experienced;
  if (conditions?.waveHeightM !== undefined && conditions.waveHeightM >= limits.blockWaveHeightM) {
    reasons.push("WAVE_TOO_HIGH");
  }
  if (conditions?.windGustKmh !== undefined && conditions.windGustKmh >= limits.blockWindGustKmh) {
    reasons.push("GUST_TOO_HIGH");
  }
  if (reasons.length > 0) return { allowed: false, scoreCap: 39, severity: "BLOCK", reasonCodes: reasons };

  if (conditions?.waveHeightM !== undefined && conditions.waveHeightM >= limits.cautionWaveHeightM) {
    reasons.push("WAVE_CAUTION");
  }
  if (conditions?.windGustKmh !== undefined && conditions.windGustKmh >= limits.cautionWindGustKmh) {
    reasons.push("GUST_CAUTION");
  }
  if (spot.prohibitedStatus === "UNKNOWN") reasons.push("PROHIBITION_UNKNOWN");
  if (spot.accessType === "UNKNOWN") reasons.push("ACCESS_UNKNOWN");

  return reasons.length > 0
    ? { allowed: true, scoreCap: 69, severity: "CAUTION", reasonCodes: reasons }
    : { allowed: true, severity: "NONE", reasonCodes: [] };
}

