import type { ExperienceLevel, ScoreFactor, SpeciesId } from "@mera/types";

export interface SpeciesConfig {
  id: SpeciesId;
  nameTr: string;
  activeMonths: number[];
}

export const SPECIES: SpeciesConfig[] = [
  { id: "ISTAVRIT", nameTr: "İstavrit", activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  { id: "LUFER", nameTr: "Lüfer", activeMonths: [9, 10, 11, 12] },
  { id: "CINEKOP", nameTr: "Çinekop", activeMonths: [9, 10, 11, 12, 1] },
  { id: "SARIKANAT", nameTr: "Sarıkanat", activeMonths: [9, 10, 11, 12] },
  { id: "PALAMUT", nameTr: "Palamut", activeMonths: [8, 9, 10, 11] },
  { id: "LEVREK", nameTr: "Levrek", activeMonths: [1, 2, 3, 4, 10, 11, 12] },
  { id: "MEZGIT", nameTr: "Mezgit", activeMonths: [1, 2, 3, 4, 11, 12] },
  { id: "ZARGANA", nameTr: "Zargana", activeMonths: [5, 6, 7, 8, 9, 10] },
  { id: "HAMSI", nameTr: "Hamsi", activeMonths: [10, 11, 12, 1, 2] }
];

const DEFAULT_WEIGHTS: Record<ScoreFactor, number> = {
  SPECIES: 25,
  CONDITIONS: 20,
  GEAR: 15,
  SAFETY: 15,
  SEASON: 10,
  REPORTS: 10,
  DISTANCE: 5
};

const BEGINNER_WEIGHTS: Record<ScoreFactor, number> = {
  SPECIES: 22,
  CONDITIONS: 20,
  GEAR: 13,
  SAFETY: 25,
  SEASON: 8,
  REPORTS: 7,
  DISTANCE: 5
};

export function weightsForExperience(experience: ExperienceLevel): Record<ScoreFactor, number> {
  return experience === "FIRST_TIME" || experience === "BEGINNER" ? BEGINNER_WEIGHTS : DEFAULT_WEIGHTS;
}

export const SAFETY_THRESHOLDS = {
  beginner: {
    blockWaveHeightM: 1.5,
    cautionWaveHeightM: 0.8,
    blockWindGustKmh: 55,
    cautionWindGustKmh: 35
  },
  experienced: {
    blockWaveHeightM: 2.5,
    cautionWaveHeightM: 1.5,
    blockWindGustKmh: 75,
    cautionWindGustKmh: 50
  }
} as const;

export const GEAR_RULES = [
  {
    speciesId: "ISTAVRIT" as const,
    rodTypes: ["SPIN", "TELESCOPIC"],
    minCastingMaxG: 15,
    maxCastingMinG: 25,
    suggestionTr: "5–7 iğneli kısa istavrit çaparisi ve 15 g kurşunla başla. Rüzgâr artarsa, kamış atar sınırını aşmadan 20 g deneyebilirsin."
  }
];

