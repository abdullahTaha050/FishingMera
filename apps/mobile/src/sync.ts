import { isRetryableStatus, retryDelayMs } from "@mera/domain";
import type { Database } from "./db";
import { dueSyncItems, setSetting } from "./db";
import { guestAccessToken } from "./auth";

let running = false;

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
        const result = await fetch(`${base}/functions/v1/api/sync`, {
          method: "POST",
          headers: { apikey: anonKey, authorization: `Bearer ${accessToken}`, "content-type": "application/json", "x-idempotency-key": item.idempotencyKey },
          body: JSON.stringify(item)
        });
        if (result.ok) {
          await db.runAsync("DELETE FROM sync_queue WHERE id=?", item.id);
          if (item.entityType === "CATCH_REPORT") await db.runAsync("UPDATE catch_reports SET sync_status='SYNCED',updated_at=? WHERE id=?", new Date().toISOString(), item.entityId);
          if (item.entityType === "USER_SPOT") await db.runAsync("UPDATE user_spots SET sync_status='SYNCED',updated_at=? WHERE id=?", new Date().toISOString(), item.entityId);
          sent += 1;
        } else if (result.status === 401 || result.status === 403 || result.status === 422) {
          await db.runAsync("UPDATE sync_queue SET state='BLOCKED',last_error=? WHERE id=?", `HTTP_${result.status}`, item.id);
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
