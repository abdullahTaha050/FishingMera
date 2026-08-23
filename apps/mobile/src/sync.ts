import { isRetryableStatus, retryDelayMs } from "@mera/domain";
import type { SyncQueueItem } from "@mera/types";
import { File } from "expo-file-system";
import { fetch as expoFetch } from "expo/fetch";
import type { Database } from "./db";
import { dueSyncItems, setSetting } from "./db";
import { guestAccessToken } from "./auth";

let running = false;

function jwtSubject(token: string): string {
  const encoded = token.split(".")[1];
  if (!encoded) throw new Error("INVALID_ACCESS_TOKEN");
  const normalized = encoded.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(encoded.length / 4) * 4, "=");
  const payload = JSON.parse(globalThis.atob(normalized)) as { sub?: string };
  if (!payload.sub) throw new Error("ACCESS_TOKEN_SUBJECT_MISSING");
  return payload.sub;
}

async function uploadLocalPhotos(base: string, anonKey: string, accessToken: string, item: SyncQueueItem, bucket: "catch-photos" | "spot-photos"): Promise<string[]> {
  const photos = Array.isArray(item.payload.photos) ? item.payload.photos as { id?: unknown; uri?: unknown; mimeType?: unknown }[] : [];
  if (photos.length === 0) return [];
  const ownerId = jwtSubject(accessToken);
  const photoPaths: string[] = [];
  for (const photo of photos) {
    if (typeof photo.id !== "string" || typeof photo.uri !== "string") throw new Error("INVALID_LOCAL_PHOTO");
    const file = new File(photo.uri);
    if (!file.exists || (file.size ?? 0) > 10 * 1024 * 1024) throw new Error("LOCAL_PHOTO_UNAVAILABLE");
    const path = `${ownerId}/${item.entityId}/${photo.id}.jpg`;
    const upload = await expoFetch(`${base}/storage/v1/object/${bucket}/${path}`, {
      method: "POST",
      headers: { apikey: anonKey, authorization: `Bearer ${accessToken}`, "content-type": "image/jpeg", "x-upsert": "false" },
      body: file
    });
    if (!upload.ok && upload.status !== 409) throw new Error(`PHOTO_UPLOAD_${upload.status}`);
    photoPaths.push(path);
  }
  return photoPaths;
}

async function preparePayload(base: string, anonKey: string, accessToken: string, item: SyncQueueItem): Promise<Record<string, unknown>> {
  if (item.entityType === "CATCH_REPORT") {
    const photoPaths = await uploadLocalPhotos(base, anonKey, accessToken, item, "catch-photos");
    return { ...item.payload, photos: undefined, photoPaths };
  }
  if (item.entityType === "USER_SPOT") {
    const photoPaths = await uploadLocalPhotos(base, anonKey, accessToken, item, "spot-photos");
    const spot = item.payload.spot as Record<string, unknown> | undefined;
    return { ...item.payload, photos: undefined, spot: spot ? { ...spot, photoPaths } : spot };
  }
  return item.payload;
}

export async function runSync(db: Database): Promise<{ sent: number; pending: number }> {
  if (running) return { sent: 0, pending: 0 };
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !anonKey) return { sent: 0, pending: (await dueSyncItems(db)).length };
  const accessToken = await guestAccessToken();
  if (!accessToken) return { sent: 0, pending: (await dueSyncItems(db)).length };
  running = true;
  let sent = 0;
  try {
    const items = await dueSyncItems(db);
    for (const item of items) {
      await db.runAsync("UPDATE sync_queue SET state='PROCESSING' WHERE id=? AND state='PENDING'", item.id);
      try {
        const outboundPayload = await preparePayload(base, anonKey, accessToken, item);
        const result = await fetch(`${base}/functions/v1/api/sync`, {
          method: "POST",
          headers: { apikey: anonKey, authorization: `Bearer ${accessToken}`, "content-type": "application/json", "x-idempotency-key": item.idempotencyKey },
          body: JSON.stringify({ ...item, payload: outboundPayload })
        });
        if (result.ok) {
          const success = await result.json().catch(() => ({})) as { result?: { confidenceScore?: number } };
          await db.runAsync("DELETE FROM sync_queue WHERE id=?", item.id);
          if (item.entityType === "CATCH_REPORT") {
            const row = await db.getFirstAsync<{ payload: string }>("SELECT payload FROM catch_reports WHERE id=?", item.entityId);
            const localPayload = row ? JSON.parse(row.payload) as Record<string, unknown> : {};
            const localPhotos = Array.isArray(localPayload.photos) ? localPayload.photos.map((photo) => ({ ...(photo as Record<string, unknown>), syncStatus: "SYNCED" })) : [];
            await db.runAsync("UPDATE catch_reports SET payload=?,sync_status='SYNCED',updated_at=? WHERE id=?", JSON.stringify({ ...localPayload, photos: localPhotos, photoPaths: outboundPayload.photoPaths }), new Date().toISOString(), item.entityId);
          }
          if (item.entityType === "USER_SPOT") await db.runAsync("UPDATE user_spots SET sync_status='SYNCED',updated_at=? WHERE id=?", new Date().toISOString(), item.entityId);
          if (item.entityType === "FEEDBACK" && typeof success.result?.confidenceScore === "number" && typeof item.payload.spotId === "string") {
            const spotRow = await db.getFirstAsync<{ payload: string }>("SELECT payload FROM spots WHERE id=?", item.payload.spotId);
            if (spotRow) {
              const spot = JSON.parse(spotRow.payload) as Record<string, unknown>;
              await db.runAsync("UPDATE spots SET payload=?,server_updated_at=? WHERE id=?", JSON.stringify({ ...spot, confidenceScore: success.result.confidenceScore, updatedAt: new Date().toISOString() }), new Date().toISOString(), item.payload.spotId);
            }
          }
          sent += 1;
        } else if (result.status === 401 || result.status === 403 || result.status === 422) {
          const failure = await result.json().catch(() => ({})) as { code?: string };
          await db.runAsync("UPDATE sync_queue SET state='BLOCKED',last_error=? WHERE id=?", failure.code ?? `HTTP_${result.status}`, item.id);
        } else if (isRetryableStatus(result.status)) {
          const next = new Date(Date.now() + retryDelayMs(item.attempts)).toISOString();
          await db.runAsync("UPDATE sync_queue SET state='PENDING',attempts=attempts+1,next_attempt_at=?,last_error=? WHERE id=?", next, `HTTP_${result.status}`, item.id);
        } else {
          await db.runAsync("UPDATE sync_queue SET state='BLOCKED',last_error=? WHERE id=?", `HTTP_${result.status}`, item.id);
        }
      } catch (error) {
        const next = new Date(Date.now() + retryDelayMs(item.attempts)).toISOString();
        await db.runAsync("UPDATE sync_queue SET state='PENDING',attempts=attempts+1,next_attempt_at=?,last_error=? WHERE id=?", next, error instanceof Error ? error.name : "NETWORK_ERROR", item.id);
      }
    }
    await setSetting(db, "last_sync_at", new Date().toISOString());
    return { sent, pending: (await dueSyncItems(db)).length };
  } finally { running = false; }
}
