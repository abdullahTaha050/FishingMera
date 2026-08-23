import { describe, expect, it } from "vitest";
import { REGULATION_VERSION, SPECIES_REGULATIONS, weightsForExperience } from "./index";

describe("versioned configuration", () => {
  it.each(["FIRST_TIME", "BEGINNER", "INTERMEDIATE", "EXPERIENCED"] as const)("keeps %s weights normalized", (experience) => {
    expect(Object.values(weightsForExperience(experience)).reduce((sum, value) => sum + value, 0)).toBe(100);
  });

  it("keeps the regulation cache inside its effective interval", () => {
    expect(REGULATION_VERSION.checkedAt.slice(0, 10) >= REGULATION_VERSION.effectiveFrom).toBe(true);
    expect(REGULATION_VERSION.checkedAt.slice(0, 10) <= REGULATION_VERSION.effectiveTo).toBe(true);
  });

  it("does not invent a special zargana minimum", () => {
    expect(SPECIES_REGULATIONS.ZARGANA).toBeUndefined();
    expect(SPECIES_REGULATIONS.ISTAVRIT?.minimumLengthCm).toBe(13);
    expect(SPECIES_REGULATIONS.LUFER?.minimumLengthCm).toBe(20);
  });
});
