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

export const REGULATION_VERSION = {
  id: "TR-6-2-2024-21-AMENDED-2025-12",
  title: "6/2 Numaralı Amatör Amaçlı Su Ürünleri Avcılığı Tebliği (2024/21), 2025/12 değişikliği işlenmiş sürüm",
  effectiveFrom: "2024-09-01",
  effectiveTo: "2028-08-31",
  checkedAt: "2026-08-23T00:00:00.000Z",
  sourceUrl: "https://yalova.tarimorman.gov.tr/Duyuru/513/6_2-Numarali-Amator-Amacli-Su-Urunleri-Avciliginin-Duzenlenmesi-Hakkinda-Teblig-_no-2024_21_",
  amendmentUrl: "https://www.tarimorman.gov.tr/HHGM/Haber/142/"
} as const;

export const GENERAL_SEA_REGULATION_TR = "Denizde kg ile sınırlanan türlerde toplam alıkonulabilir miktar 5 kg'dır. En fazla 4 olta (olta başına en çok 6 iğne) veya en çok 15 iğneli bir çapari kullanılabilir. 1 Nisan–15 Kasım arasında şamandıralarla çevrili yüzme alanlarında, kıyıdan 200 metre içinde avcılık yasaktır.";

export const SPECIES_REGULATIONS: Partial<Record<SpeciesId, { minimumLengthCm: number; limit: number; limitUnit: "KG"; noteTr?: string }>> = {
  ISTAVRIT: { minimumLengthCm: 13, limit: 5, limitUnit: "KG" },
  LUFER: { minimumLengthCm: 20, limit: 5, limitUnit: "KG" },
  CINEKOP: { minimumLengthCm: 20, limit: 5, limitUnit: "KG", noteTr: "Çinekop, lüferin büyüme evresidir; 20 cm altındaki birey alıkonulmamalıdır." },
  SARIKANAT: { minimumLengthCm: 20, limit: 5, limitUnit: "KG", noteTr: "Sarıkanat, lüferin büyüme evresidir; 20 cm altındaki birey alıkonulmamalıdır." },
  PALAMUT: { minimumLengthCm: 25, limit: 5, limitUnit: "KG" },
  LEVREK: { minimumLengthCm: 25, limit: 5, limitUnit: "KG" },
  MEZGIT: { minimumLengthCm: 13, limit: 5, limitUnit: "KG" },
  HAMSI: { minimumLengthCm: 9, limit: 5, limitUnit: "KG" }
};
