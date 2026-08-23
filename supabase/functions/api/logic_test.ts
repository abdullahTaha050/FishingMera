import { feedbackConfidenceScore } from "./logic.ts";

function assertEquals(actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`Expected ${expected}, received ${actual}`);
  }
}

Deno.test("positive feedback moves confidence only slightly and is capped", () => {
  assertEquals(feedbackConfidenceScore(0.35, "FISHABLE"), 0.37);
  assertEquals(feedbackConfidenceScore(0.9, "LOCATION_CORRECT"), 0.9);
});

Deno.test("safety feedback lowers confidence conservatively and is floored", () => {
  assertEquals(feedbackConfidenceScore(0.35, "DANGEROUS"), 0.27);
  assertEquals(feedbackConfidenceScore(0.05, "PROHIBITED"), 0.05);
});
