import { createClient } from "@supabase/supabase-js";

const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!base || !anonKey) throw new Error("Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY");

const health = await fetch(`${base}/functions/v1/api/health`, { headers: { apikey: anonKey } });
if (!health.ok) throw new Error(`HEALTH_HTTP_${health.status}`);
const nearby = await fetch(`${base}/functions/v1/api/nearby?lat=40.799&lon=30.748&radiusKm=100`, { headers: { apikey: anonKey } });
if (!nearby.ok || (await nearby.json()).distanceType !== "STRAIGHT_LINE") throw new Error("NEARBY_CONTRACT_FAILED");
const conditions = await fetch(`${base}/functions/v1/api/conditions?lat=41.1&lon=30.7`, { headers: { apikey: anonKey } });
if (!conditions.ok || !(await conditions.json()).snapshot) throw new Error("CONDITIONS_CONTRACT_FAILED");

const supabase = createClient(base, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const auth = await supabase.auth.signInAnonymously();
if (auth.error || !auth.data.session?.access_token) throw new Error("ANONYMOUS_AUTH_FAILED");
const entityId = crypto.randomUUID();
const queueId = crypto.randomUUID();
const idempotencyKey = `CATCH_REPORT:${entityId}:UPSERT:${queueId}`;
const syncBody = { id: queueId, entityId, entityType: "CATCH_REPORT", operation: "UPSERT", idempotencyKey, payload: { id: entityId, startedAt: new Date().toISOString(), targetSpecies: "ISTAVRIT", caughtSpecies: [], quantity: 0, result: "NONE", photoPaths: [], sharePublicly: false, spotId: null } };
const headers = { apikey: anonKey, authorization: `Bearer ${auth.data.session.access_token}`, "content-type": "application/json", "x-idempotency-key": idempotencyKey };
const first = await fetch(`${base}/functions/v1/api/sync`, { method: "POST", headers, body: JSON.stringify(syncBody) });
if (!first.ok) throw new Error(`SYNC_HTTP_${first.status}`);
const replay = await fetch(`${base}/functions/v1/api/sync`, { method: "POST", headers, body: JSON.stringify(syncBody) });
const replayBody = await replay.json();
if (!replay.ok || replayBody.replayed !== true) throw new Error("SYNC_IDEMPOTENCY_FAILED");
const rejectedDeletion = await fetch(`${base}/functions/v1/api/account/delete`, { method: "POST", headers: { apikey: anonKey, authorization: `Bearer ${auth.data.session.access_token}`, "content-type": "application/json" }, body: JSON.stringify({ confirmation: "SIL" }) });
if (rejectedDeletion.status !== 400) throw new Error(`ACCOUNT_DELETE_CONFIRMATION_${rejectedDeletion.status}`);
const deletion = await fetch(`${base}/functions/v1/api/account/delete`, { method: "POST", headers: { apikey: anonKey, authorization: `Bearer ${auth.data.session.access_token}`, "content-type": "application/json" }, body: JSON.stringify({ confirmation: "HESABIMI SIL" }) });
if (!deletion.ok) throw new Error(`ACCOUNT_DELETE_HTTP_${deletion.status}`);
const deletedSession = await fetch(`${base}/functions/v1/api/sync`, { method: "POST", headers, body: JSON.stringify(syncBody) });
if (deletedSession.status !== 401) throw new Error(`DELETED_SESSION_STILL_ACTIVE_${deletedSession.status}`);
console.log("Backend health, nearby, conditions, guest auth, idempotent sync, deletion confirmation and deleted-session smoke tests passed.");
