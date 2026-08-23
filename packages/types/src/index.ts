export type UUID = string;

export type ExperienceLevel = "FIRST_TIME" | "BEGINNER" | "INTERMEDIATE" | "EXPERIENCED";
export type FishingType = "SHORE" | "BOAT" | "FRESHWATER";
export type VerificationStatus = "VERIFIED" | "COMMUNITY" | "WEB_DISCOVERED" | "POTENTIAL";
export type PublicationLevel = "PUBLIC" | "PRIVATE" | "APPROXIMATE";
export type CoordinatePrecision = "EXACT" | "APPROXIMATE" | "UNKNOWN";
export type ProhibitedStatus = "NONE" | "UNKNOWN" | "PROHIBITED" | "SECURITY_AREA";
export type BeginnerSuitability = "SUITABLE" | "CAUTION" | "UNSUITABLE" | "UNKNOWN";

export type SpeciesId =
  | "ISTAVRIT"
  | "LUFER"
  | "CINEKOP"
  | "SARIKANAT"
  | "PALAMUT"
  | "LEVREK"
  | "MEZGIT"
  | "ZARGANA"
  | "HAMSI";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GearProfile {
  id: UUID;
  name: string;
  rodType?: "SPIN" | "SURF" | "TELESCOPIC" | "OTHER" | "UNKNOWN";
  rodLengthCm?: number;
  castingWeightMinG?: number;
  castingWeightMaxG?: number;
  reelSize?: number;
  mainLine?: "BRAID" | "MONO" | "FLUOROCARBON" | "OTHER" | "UNKNOWN";
  lineDiameterMm?: number;
  peRating?: number;
}

export interface SourceEvidence {
  url: string;
  title: string;
  publishedAt?: string;
  accessedAt: string;
  evidenceType: "COORDINATE" | "FISHING" | "ACCESS" | "HAZARD" | "REGULATION";
  excerpt?: string;
}

export interface Spot {
  id: UUID;
  canonicalName: string;
  localNames: string[];
  coordinates: Coordinates;
  coordinatePrecision: CoordinatePrecision;
  uncertaintyRadiusM?: number;
  province: string;
  district: string;
  country: "TR";
  coastlineType: "BEACH" | "ROCK" | "BREAKWATER" | "HARBOUR" | "RIVER_MOUTH" | "MIXED" | "UNKNOWN";
  accessType: "WALK" | "VEHICLE" | "MIXED" | "UNKNOWN";
  beginnerSuitability: BeginnerSuitability;
  terrain: string;
  parkingNotes?: string;
  walkingDistanceM?: number;
  knownHazards: string[];
  accessWarnings: string[];
  prohibitedStatus: ProhibitedStatus;
  targetSpecies: SpeciesId[];
  techniques: string[];
  recommendedGearTags: string[];
  sourceType: "SEED" | "COMMUNITY" | "WEB" | "GEOGRAPHIC";
  verificationStatus: VerificationStatus;
  confidenceScore: number;
  publicationLevel: PublicationLevel;
  ownerId?: UUID;
  sources: SourceEvidence[];
  createdAt: string;
  updatedAt: string;
}

export interface ConditionSnapshot {
  spotId: UUID;
  airTemperatureC?: number;
  precipitationMm?: number;
  windSpeedKmh?: number;
  windDirectionDeg?: number;
  windGustKmh?: number;
  waveHeightM?: number;
  waveDirectionDeg?: number;
  wavePeriodS?: number;
  swellHeightM?: number;
  seaSurfaceTemperatureC?: number;
  currentSpeedKmh?: number;
  currentDirectionDeg?: number;
  sunrise?: string;
  sunset?: string;
  observedAt: string;
  fetchedAt: string;
  expiresAt: string;
  provider: "OPEN_METEO" | "OTHER";
}

export interface RecentReportSummary {
  speciesId: SpeciesId;
  reportCount: number;
  positiveCount: number;
  lastReportedAt?: string;
}

export interface RecommendationInput {
  userCoordinates: Coordinates;
  experience: ExperienceLevel;
  targetSpecies: SpeciesId;
  gear?: GearProfile;
  maxDistanceKm: number;
  now: string;
}

export type ScoreFactor =
  | "SPECIES"
  | "CONDITIONS"
  | "GEAR"
  | "SAFETY"
  | "SEASON"
  | "REPORTS"
  | "DISTANCE";

export interface FactorScore {
  factor: ScoreFactor;
  raw: number;
  weight: number;
  contribution: number;
  reasonCode: string;
  details?: Record<string, string | number | boolean>;
}

export interface SafetyDecision {
  allowed: boolean;
  scoreCap?: number;
  severity: "NONE" | "CAUTION" | "BLOCK";
  reasonCodes: string[];
}

export interface RecommendationResult {
  spot: Spot;
  score: number;
  straightLineDistanceKm: number;
  factors: FactorScore[];
  safety: SafetyDecision;
  explanationCodes: string[];
  conditionAgeMinutes?: number;
}

export interface SyncQueueItem {
  id: UUID;
  entityId: UUID;
  entityType: "CATCH_REPORT" | "USER_SPOT" | "FAVORITE" | "FEEDBACK";
  operation: "UPSERT" | "DELETE";
  payload: Record<string, unknown>;
  idempotencyKey: string;
  state: "PENDING" | "PROCESSING" | "BLOCKED";
  attempts: number;
  nextAttemptAt: string;
  createdAt: string;
}

