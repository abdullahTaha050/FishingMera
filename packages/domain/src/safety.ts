import { SAFETY_THRESHOLDS } from "@mera/config";
import type { ConditionSnapshot, ExperienceLevel, SafetyDecision, Spot } from "@mera/types";

export function evaluateSafety(
  spot: Spot,
  conditions: ConditionSnapshot | undefined,
  experience: ExperienceLevel,
  atIso = new Date().toISOString()
): SafetyDecision {
  const blockReasons: string[] = [];
  const cautionReasons: string[] = [];
  const date = new Date(atIso);
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const swimmingRestrictionSeason = month > 4 && month < 11 || month === 4 || month === 11 && day <= 15;
  const warningText = spot.accessWarnings.join(" ");
  const explicitSwimmingProhibition = /(?:y[uü]zme|plaj).{0,80}(?:av\s*yap[ıi]lmaz|avc[ıi]l[ıi]k\s*yasak|bal[ıi]k\s*tutmak\s*yasak)/i.test(warningText)
    || /(?:av\s*yap[ıi]lmaz|avc[ıi]l[ıi]k\s*yasak|bal[ıi]k\s*tutmak\s*yasak).{0,80}(?:y[uü]zme|plaj)/i.test(warningText);
  const swimmingAreaMentioned = /y[uü]zme|plaj\s*kullan[ıi]m|şamand[ıi]ra/i.test(warningText);

  if (spot.prohibitedStatus === "PROHIBITED") blockReasons.push("AREA_PROHIBITED");
  if (spot.prohibitedStatus === "SECURITY_AREA") blockReasons.push("HARBOUR_SECURITY_AREA");
  if (spot.coordinatePrecision !== "EXACT") blockReasons.push("COORDINATE_NOT_EXACT");
  if (spot.accessWarnings.some((warning) => /closed|kapalı/i.test(warning))) blockReasons.push("ACCESS_CLOSED");
  if (swimmingRestrictionSeason && explicitSwimmingProhibition) blockReasons.push("SWIMMING_ZONE_SEASONAL_PROHIBITION");
  else if (swimmingRestrictionSeason && swimmingAreaMentioned) cautionReasons.push("SWIMMING_ZONE_STATUS_UNVERIFIED");

  const beginner = experience === "FIRST_TIME" || experience === "BEGINNER";
  if (beginner && spot.beginnerSuitability === "UNSUITABLE") blockReasons.push("BEGINNER_UNSUITABLE");
  if (beginner && spot.coastlineType === "ROCK" && spot.accessType === "WALK") blockReasons.push("BEGINNER_RISKY_ROCKS");

  const limits = beginner ? SAFETY_THRESHOLDS.beginner : SAFETY_THRESHOLDS.experienced;
  if (conditions?.waveHeightM !== undefined && conditions.waveHeightM >= limits.blockWaveHeightM) {
    blockReasons.push("WAVE_TOO_HIGH");
  }
  if (conditions?.windGustKmh !== undefined && conditions.windGustKmh >= limits.blockWindGustKmh) {
    blockReasons.push("GUST_TOO_HIGH");
  }
  if (blockReasons.length > 0) return { allowed: false, scoreCap: 39, severity: "BLOCK", reasonCodes: blockReasons };

  if (conditions?.waveHeightM !== undefined && conditions.waveHeightM >= limits.cautionWaveHeightM) {
    cautionReasons.push("WAVE_CAUTION");
  }
  if (conditions?.windGustKmh !== undefined && conditions.windGustKmh >= limits.cautionWindGustKmh) {
    cautionReasons.push("GUST_CAUTION");
  }
  if (spot.prohibitedStatus === "UNKNOWN") cautionReasons.push("PROHIBITION_UNKNOWN");
  if (spot.accessType === "UNKNOWN") cautionReasons.push("ACCESS_UNKNOWN");

  return cautionReasons.length > 0
    ? { allowed: true, scoreCap: cautionReasons.includes("SWIMMING_ZONE_STATUS_UNVERIFIED") ? 49 : 69, severity: "CAUTION", reasonCodes: cautionReasons }
    : { allowed: true, severity: "NONE", reasonCodes: [] };
}
