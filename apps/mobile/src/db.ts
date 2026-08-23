import { SEED_SPOTS, SEED_VERSION } from "@mera/seed-data";
import type { ConditionSnapshot, GearProfile, Spot, SyncQueueItem } from "@mera/types";
import * as SQLite from "expo-sqlite";

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
    CREATE TABLE IF NOT EXISTS gear_profiles (id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL, pending_sync INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS cached_conditions (spot_id TEXT PRIMARY KEY, payload TEXT NOT NULL, fetched_at TEXT NOT NULL, expires_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS offline_regions (id TEXT PRIMARY KEY, name TEXT NOT NULL, pack_id TEXT, state TEXT NOT NULL, progress REAL NOT NULL DEFAULT 0, style_url TEXT, bounds_json TEXT NOT NULL, package_version TEXT, checksum TEXT, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS catch_reports (id TEXT PRIMARY KEY, payload TEXT NOT NULL, sync_status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS user_spots (id TEXT PRIMARY KEY, payload TEXT NOT NULL, sync_status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS vehicle_location (singleton INTEGER PRIMARY KEY CHECK(singleton = 1), latitude REAL NOT NULL, longitude REAL NOT NULL, accuracy REAL, saved_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sync_queue (id TEXT PRIMARY KEY, entity_id TEXT NOT NULL, entity_type TEXT NOT NULL, operation TEXT NOT NULL, payload TEXT NOT NULL, idempotency_key TEXT NOT NULL UNIQUE, state TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at TEXT NOT NULL, last_error TEXT, created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS sync_queue_due_idx ON sync_queue(state, next_attempt_at);
    INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (1, datetime('now'));
  `);
}

async function seedIfNeeded(db: Database): Promise<void> {
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
  });
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
  });
  return id;
}

export async function listCatchReports(db: Database): Promise<Array<{ id: string; payload: Record<string, unknown>; syncStatus: string; createdAt: string }>> {
  const rows = await db.getAllAsync<{ id: string; payload: string; sync_status: string; created_at: string }>("SELECT id,payload,sync_status,created_at FROM catch_reports ORDER BY created_at DESC");
  return rows.map((row) => ({ id: row.id, payload: JSON.parse(row.payload), syncStatus: row.sync_status, createdAt: row.created_at }));
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

export async function getSetting(db: Database, key: string): Promise<string | null> {
  return (await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = ?", key))?.value ?? null;
}

export async function setSetting(db: Database, key: string, value: string): Promise<void> {
  await db.runAsync("INSERT INTO settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at", key, value, new Date().toISOString());
}
