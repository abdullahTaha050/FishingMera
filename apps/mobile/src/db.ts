import { SEED_SPOTS, SEED_VERSION } from "@mera/seed-data";
import { GENERAL_SEA_REGULATION_TR, REGULATION_VERSION, SPECIES_REGULATIONS } from "@mera/config";
import { summarizeRecentReports, type CatchReportForSummary } from "@mera/domain";
import type { ConditionSnapshot, GearProfile, PublicationLevel, RecentReportSummary, SpeciesId, Spot, SyncQueueItem } from "@mera/types";
import * as SQLite from "expo-sqlite";
import type { LocalPhoto } from "./photos";

export type Database = SQLite.SQLiteDatabase;

export async function openDatabase(): Promise<Database> {
  const db = await SQLite.openDatabaseAsync("mera.db");
  await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  await migrate(db);
  await seedIfNeeded(db);
  return db;
}

async function migrate(db: Database): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS spots (id TEXT PRIMARY KEY, payload TEXT NOT NULL, server_updated_at TEXT, downloaded_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS favorites (spot_id TEXT PRIMARY KEY, updated_at TEXT NOT NULL, pending_sync INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS spot_notes (spot_id TEXT PRIMARY KEY, note TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS gear_profiles (id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL, pending_sync INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS cached_conditions (spot_id TEXT PRIMARY KEY, payload TEXT NOT NULL, fetched_at TEXT NOT NULL, expires_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS offline_regions (id TEXT PRIMARY KEY, name TEXT NOT NULL, pack_id TEXT, state TEXT NOT NULL, progress REAL NOT NULL DEFAULT 0, style_url TEXT, bounds_json TEXT NOT NULL, package_version TEXT, checksum TEXT, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS catch_reports (id TEXT PRIMARY KEY, payload TEXT NOT NULL, sync_status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS user_spots (id TEXT PRIMARY KEY, payload TEXT NOT NULL, sync_status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS vehicle_location (singleton INTEGER PRIMARY KEY CHECK(singleton = 1), latitude REAL NOT NULL, longitude REAL NOT NULL, accuracy REAL, saved_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sync_queue (id TEXT PRIMARY KEY, entity_id TEXT NOT NULL, entity_type TEXT NOT NULL, operation TEXT NOT NULL, payload TEXT NOT NULL, idempotency_key TEXT NOT NULL UNIQUE, state TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at TEXT NOT NULL, last_error TEXT, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS analytics_events (id TEXT PRIMARY KEY, name TEXT NOT NULL, properties TEXT NOT NULL, created_at TEXT NOT NULL, uploaded_at TEXT);
    CREATE TABLE IF NOT EXISTS regulation_versions (id TEXT PRIMARY KEY, payload TEXT NOT NULL, checked_at TEXT NOT NULL, effective_to TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS sync_queue_due_idx ON sync_queue(state, next_attempt_at);
    INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (1, datetime('now'));
    INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (2, datetime('now'));
    UPDATE sync_queue SET state='PENDING',next_attempt_at=datetime('now'),last_error='RECOVERED_AFTER_RESTART' WHERE state='PROCESSING';
  `);
}

async function seedIfNeeded(db: Database): Promise<void> {
  await db.runAsync(
    "INSERT INTO regulation_versions(id,payload,checked_at,effective_to) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,checked_at=excluded.checked_at,effective_to=excluded.effective_to",
    REGULATION_VERSION.id,
    JSON.stringify({ version: REGULATION_VERSION, generalRuleTr: GENERAL_SEA_REGULATION_TR, species: SPECIES_REGULATIONS }),
    REGULATION_VERSION.checkedAt,
    REGULATION_VERSION.effectiveTo
  );
  const version = await getSetting(db, "seed_version");
  if (version === SEED_VERSION) return;
  await db.withTransactionAsync(async () => {
    for (const spot of SEED_SPOTS) {
      await db.runAsync(
        "INSERT INTO spots(id, payload, server_updated_at, downloaded_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, server_updated_at = excluded.server_updated_at, downloaded_at = excluded.downloaded_at",
        spot.id, JSON.stringify(spot), spot.updatedAt, new Date().toISOString()
      );
    }
    await setSetting(db, "seed_version", SEED_VERSION);
  });
}

export async function listSpots(db: Database): Promise<Spot[]> {
  const rows = await db.getAllAsync<{ payload: string }>("SELECT payload FROM spots ORDER BY id");
  return rows.map((row) => JSON.parse(row.payload) as Spot);
}

export async function getSpot(db: Database, id: string): Promise<Spot | null> {
  const row = await db.getFirstAsync<{ payload: string }>("SELECT payload FROM spots WHERE id = ?", id);
  return row ? JSON.parse(row.payload) as Spot : null;
}

export async function listFavorites(db: Database): Promise<string[]> {
  return (await db.getAllAsync<{ spot_id: string }>("SELECT spot_id FROM favorites ORDER BY updated_at DESC")).map((row) => row.spot_id);
}

export async function setFavorite(db: Database, spotId: string, favorite: boolean): Promise<void> {
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    if (favorite) await db.runAsync("INSERT INTO favorites(spot_id, updated_at, pending_sync) VALUES (?, ?, 1) ON CONFLICT(spot_id) DO UPDATE SET updated_at = excluded.updated_at, pending_sync = 1", spotId, now);
    else await db.runAsync("DELETE FROM favorites WHERE spot_id = ?", spotId);
    await enqueue(db, "FAVORITE", spotId, favorite ? "UPSERT" : "DELETE", { spotId, favorite });
    await trackEvent(db, "spot_saved", { favorite });
  });
}

export async function getSpotNote(db: Database, spotId: string): Promise<string> {
  return (await db.getFirstAsync<{ note: string }>("SELECT note FROM spot_notes WHERE spot_id = ?", spotId))?.note ?? "";
}

export async function saveSpotNote(db: Database, spotId: string, note: string): Promise<void> {
  const normalized = note.trim();
  if (!normalized) {
    await db.runAsync("DELETE FROM spot_notes WHERE spot_id = ?", spotId);
    return;
  }
  await db.runAsync(
    "INSERT INTO spot_notes(spot_id,note,updated_at) VALUES(?,?,?) ON CONFLICT(spot_id) DO UPDATE SET note=excluded.note,updated_at=excluded.updated_at",
    spotId,
    normalized,
    new Date().toISOString()
  );
}

export async function saveGear(db: Database, gear: GearProfile): Promise<void> {
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync("INSERT INTO gear_profiles(id,payload,updated_at,pending_sync) VALUES(?,?,?,1) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at,pending_sync=1", gear.id, JSON.stringify(gear), now);
    await enqueue(db, "GEAR_PROFILE", gear.id, "UPSERT", { gear });
    await setSetting(db, "active_gear_id", gear.id);
  });
}

export async function getActiveGear(db: Database): Promise<GearProfile | null> {
  const id = await getSetting(db, "active_gear_id");
  if (!id) return null;
  const row = await db.getFirstAsync<{ payload: string }>("SELECT payload FROM gear_profiles WHERE id = ?", id);
  return row ? JSON.parse(row.payload) as GearProfile : null;
}

export async function listGearProfiles(db: Database): Promise<GearProfile[]> {
  const rows = await db.getAllAsync<{ payload: string }>("SELECT payload FROM gear_profiles ORDER BY updated_at DESC");
  return rows.map((row) => JSON.parse(row.payload) as GearProfile);
}

export async function setActiveGear(db: Database, gearId: string): Promise<void> {
  const exists = await db.getFirstAsync<{ id: string }>("SELECT id FROM gear_profiles WHERE id=?", gearId);
  if (!exists) throw new Error("GEAR_NOT_FOUND");
  await setSetting(db, "active_gear_id", gearId);
}

export async function cacheCondition(db: Database, condition: ConditionSnapshot): Promise<void> {
  await db.runAsync("INSERT INTO cached_conditions(spot_id,payload,fetched_at,expires_at) VALUES(?,?,?,?) ON CONFLICT(spot_id) DO UPDATE SET payload=excluded.payload,fetched_at=excluded.fetched_at,expires_at=excluded.expires_at", condition.spotId, JSON.stringify(condition), condition.fetchedAt, condition.expiresAt);
}

export async function conditionsMap(db: Database): Promise<Map<string, ConditionSnapshot>> {
  const rows = await db.getAllAsync<{ spot_id: string; payload: string }>("SELECT spot_id,payload FROM cached_conditions");
  return new Map(rows.map((row) => [row.spot_id, JSON.parse(row.payload) as ConditionSnapshot]));
}

export async function saveVehicleLocation(db: Database, latitude: number, longitude: number, accuracy?: number): Promise<void> {
  await db.runAsync("INSERT INTO vehicle_location(singleton,latitude,longitude,accuracy,saved_at) VALUES(1,?,?,?,?) ON CONFLICT(singleton) DO UPDATE SET latitude=excluded.latitude,longitude=excluded.longitude,accuracy=excluded.accuracy,saved_at=excluded.saved_at", latitude, longitude, accuracy ?? null, new Date().toISOString());
}

export async function getVehicleLocation(db: Database): Promise<{ latitude: number; longitude: number; accuracy?: number; savedAt: string } | null> {
  const row = await db.getFirstAsync<{ latitude: number; longitude: number; accuracy: number | null; saved_at: string }>("SELECT latitude,longitude,accuracy,saved_at FROM vehicle_location WHERE singleton=1");
  return row ? { latitude: row.latitude, longitude: row.longitude, accuracy: row.accuracy ?? undefined, savedAt: row.saved_at } : null;
}

export async function saveCatchReport(db: Database, payload: Record<string, unknown>): Promise<string> {
  const id = globalThis.crypto.randomUUID();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync("INSERT INTO catch_reports(id,payload,sync_status,created_at,updated_at) VALUES(?,?,'PENDING',?,?)", id, JSON.stringify({ id, ...payload }), now, now);
    await enqueue(db, "CATCH_REPORT", id, "UPSERT", { id, ...payload });
    await trackEvent(db, "catch_report_created", { offline: true });
  });
  return id;
}

export interface UserSpotInput {
  canonicalName: string;
  latitude: number;
  longitude: number;
  publicationLevel: PublicationLevel;
  targetSpecies: SpeciesId[];
  coastlineType: Spot["coastlineType"];
  accessType: Spot["accessType"];
  beginnerSuitability: Spot["beginnerSuitability"];
  parkingNotes?: string;
  walkingDistanceM?: number;
  knownHazards: string[];
  photos: LocalPhoto[];
  note?: string;
}

export async function saveUserSpot(db: Database, input: UserSpotInput): Promise<string> {
  const id = globalThis.crypto.randomUUID();
  const now = new Date().toISOString();
  const spot: Spot = {
    id,
    canonicalName: input.canonicalName.trim(),
    localNames: [],
    coordinates: { latitude: input.latitude, longitude: input.longitude },
    coordinatePrecision: "EXACT",
    province: "Bilinmiyor",
    district: "Bilinmiyor",
    country: "TR",
    coastlineType: input.coastlineType,
    accessType: input.accessType,
    beginnerSuitability: input.beginnerSuitability,
    terrain: input.note?.trim() || "Kullanıcı kaydı — arazi bilgisi doğrulanmadı",
    parkingNotes: input.parkingNotes?.trim() || undefined,
    walkingDistanceM: input.walkingDistanceM,
    knownHazards: input.knownHazards,
    accessWarnings: ["Topluluk kaydı; erişim, güvenlik ve yasak durumu ayrıca doğrulanmalı."],
    prohibitedStatus: "UNKNOWN",
    targetSpecies: input.targetSpecies,
    techniques: [],
    recommendedGearTags: [],
    sourceType: "COMMUNITY",
    verificationStatus: "COMMUNITY",
    confidenceScore: 0.35,
    publicationLevel: input.publicationLevel,
    ownerId: "local-device-owner",
    sources: [],
    photoPaths: input.photos.map((photo) => photo.uri),
    createdAt: now,
    updatedAt: now
  };
  await db.withTransactionAsync(async () => {
    await db.runAsync("INSERT INTO user_spots(id,payload,sync_status,created_at,updated_at) VALUES(?,?,'PENDING',?,?)", id, JSON.stringify(spot), now, now);
    await db.runAsync("INSERT INTO spots(id,payload,server_updated_at,downloaded_at) VALUES(?,?,NULL,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,downloaded_at=excluded.downloaded_at", id, JSON.stringify(spot), now);
    await enqueue(db, "USER_SPOT", id, "UPSERT", { spot, photos: input.photos });
    await trackEvent(db, "user_spot_created", { publicationLevel: input.publicationLevel });
  });
  return id;
}

export async function saveFeedback(db: Database, spotId: string, feedbackType: "LOCATION_CORRECT" | "FISHABLE" | "ACCESS_CHANGED" | "PROHIBITED" | "DANGEROUS" | "SPECIES_WRONG", note?: string): Promise<void> {
  const id = globalThis.crypto.randomUUID();
  await enqueue(db, "FEEDBACK", id, "UPSERT", { id, spotId, feedbackType, note: note?.trim() || undefined });
  await trackEvent(db, "spot_feedback_created", { feedbackType });
}

export async function listCatchReports(db: Database): Promise<{ id: string; payload: Record<string, unknown>; syncStatus: string; createdAt: string }[]> {
  const rows = await db.getAllAsync<{ id: string; payload: string; sync_status: string; created_at: string }>("SELECT id,payload,sync_status,created_at FROM catch_reports ORDER BY created_at DESC");
  return rows.map((row) => ({ id: row.id, payload: JSON.parse(row.payload), syncStatus: row.sync_status, createdAt: row.created_at }));
}

export async function listCatchReportsForSpot(db: Database, spotId: string, limit = 3): Promise<{ id: string; payload: Record<string, unknown>; syncStatus: string; createdAt: string }[]> {
  return (await listCatchReports(db)).filter((report) => report.payload.spotId === spotId).slice(0, limit);
}

export async function recentReportsMap(db: Database, speciesId: SpeciesId, now = new Date()): Promise<Map<string, RecentReportSummary>> {
  const reports = (await listCatchReports(db)).map((report): CatchReportForSummary => ({
    spotId: typeof report.payload.spotId === "string" ? report.payload.spotId : undefined,
    startedAt: typeof report.payload.startedAt === "string" ? report.payload.startedAt : report.createdAt,
    targetSpecies: typeof report.payload.targetSpecies === "string" ? report.payload.targetSpecies : undefined,
    caughtSpecies: Array.isArray(report.payload.caughtSpecies) ? (report.payload.caughtSpecies as { speciesId?: string }[]) : undefined,
    quantity: typeof report.payload.quantity === "number" ? report.payload.quantity : undefined,
    result: typeof report.payload.result === "string" ? report.payload.result : undefined
  }));
  return summarizeRecentReports(reports, speciesId, now);
}

async function enqueue(db: Database, entityType: SyncQueueItem["entityType"], entityId: string, operation: SyncQueueItem["operation"], payload: Record<string, unknown>): Promise<void> {
  const id = globalThis.crypto.randomUUID();
  const now = new Date().toISOString();
  const key = `${entityType}:${entityId}:${operation}:${id}`;
  await db.runAsync("INSERT INTO sync_queue(id,entity_id,entity_type,operation,payload,idempotency_key,state,attempts,next_attempt_at,created_at) VALUES(?,?,?,?,?,?,'PENDING',0,?,?)", id, entityId, entityType, operation, JSON.stringify(payload), key, now, now);
}

export async function dueSyncItems(db: Database, limit = 20): Promise<SyncQueueItem[]> {
  const rows = await db.getAllAsync<Record<string, string | number>>("SELECT * FROM sync_queue WHERE state='PENDING' AND next_attempt_at <= ? ORDER BY created_at LIMIT ?", new Date().toISOString(), limit);
  return rows.map((row) => ({ id: String(row.id), entityId: String(row.entity_id), entityType: String(row.entity_type) as SyncQueueItem["entityType"], operation: String(row.operation) as SyncQueueItem["operation"], payload: JSON.parse(String(row.payload)), idempotencyKey: String(row.idempotency_key), state: String(row.state) as SyncQueueItem["state"], attempts: Number(row.attempts), nextAttemptAt: String(row.next_attempt_at), createdAt: String(row.created_at) }));
}

export async function retryBlockedAccountItems(db: Database): Promise<void> {
  await db.runAsync(
    "UPDATE sync_queue SET state='PENDING',attempts=0,next_attempt_at=?,last_error=NULL WHERE state='BLOCKED' AND last_error='PERMANENT_ACCOUNT_REQUIRED'",
    new Date().toISOString()
  );
}

export async function deleteLocalAccountData(db: Database): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM spots WHERE id IN (SELECT id FROM user_spots);
      DELETE FROM user_spots;
      DELETE FROM catch_reports;
      DELETE FROM favorites;
      DELETE FROM spot_notes;
      DELETE FROM gear_profiles;
      DELETE FROM sync_queue;
      DELETE FROM analytics_events;
      DELETE FROM cached_conditions;
      DELETE FROM vehicle_location;
      DELETE FROM settings;
    `);
  });
}

export async function getSetting(db: Database, key: string): Promise<string | null> {
  return (await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = ?", key))?.value ?? null;
}

export async function setSetting(db: Database, key: string, value: string): Promise<void> {
  await db.runAsync("INSERT INTO settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at", key, value, new Date().toISOString());
}

const allowedEvents = new Set(["recommendation_requested", "spot_opened", "spot_saved", "offline_region_downloaded", "navigation_compass_opened", "catch_report_created", "user_spot_created", "spot_feedback_created"]);
export async function trackEvent(db: Database, name: string, properties: Record<string, string | number | boolean> = {}): Promise<void> {
  if (!allowedEvents.has(name)) throw new Error("ANALYTICS_EVENT_NOT_ALLOWED");
  if (Object.keys(properties).some((key) => /lat|lon|coordinate|location/i.test(key))) throw new Error("PRECISE_LOCATION_ANALYTICS_FORBIDDEN");
  await db.runAsync("INSERT INTO analytics_events(id,name,properties,created_at) VALUES(?,?,?,?)", globalThis.crypto.randomUUID(), name, JSON.stringify(properties), new Date().toISOString());
}
