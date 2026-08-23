export type FeedbackType =
  | "LOCATION_CORRECT"
  | "FISHABLE"
  | "ACCESS_CHANGED"
  | "PROHIBITED"
  | "DANGEROUS"
  | "SPECIES_WRONG";

const feedbackDelta: Record<FeedbackType, number> = {
  LOCATION_CORRECT: 0.02,
  FISHABLE: 0.02,
  ACCESS_CHANGED: -0.02,
  SPECIES_WRONG: -0.02,
  PROHIBITED: -0.08,
  DANGEROUS: -0.08,
};

export function feedbackConfidenceScore(
  current: number,
  type: FeedbackType,
): number {
  return Math.round(
    Math.min(0.9, Math.max(0.05, current + feedbackDelta[type])) * 100,
  ) / 100;
}
