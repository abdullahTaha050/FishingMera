import { createClient } from "@supabase/supabase-js";

const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!base || !anonKey) throw new Error("Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY");

const health = await fetch(`${base}/functions/v1/api/health`, { headers: { apikey: anonKey } });
if (!health.ok) throw new Error(`HEALTH_HTTP_${health.status}`);
const nearby = await fetch(`${base}/functions/v1/api/nearby?lat=40.799&lon=30.748&radiusKm=100`, { headers: { apikey: anonKey } });
const nearbyBody = await nearby.json();
if (!nearby.ok || nearbyBody.distanceType !== "STRAIGHT_LINE" || !Array.isArray(nearbyBody.spots) || nearbyBody.spots.length < 12) throw new Error("NEARBY_CONTRACT_FAILED");
const conditionSpotId = nearbyBody.spots[0]?.id;
if (typeof conditionSpotId !== "string") throw new Error("NEARBY_SPOT_ID_MISSING");
const conditions = await fetch(`${base}/functions/v1/api/conditions?lat=41.1031224&lon=30.7122799&spotId=${encodeURIComponent(conditionSpotId)}`, { headers: { apikey: anonKey } });
if (!conditions.ok || !(await conditions.json()).snapshot) throw new Error("CONDITIONS_CONTRACT_FAILED");

const supabase = createClient(base, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const auth = await supabase.auth.signInAnonymously();
if (auth.error || !auth.data.session?.access_token) throw new Error("ANONYMOUS_AUTH_FAILED");
const entityId = crypto.randomUUID();
const queueId = crypto.randomUUID();
const idempotencyKey = `CATCH_REPORT:${entityId}:UPSERT:${queueId}`;
const syncBody = { id: queueId, entityId, entityType: "CATCH_REPORT", operation: "UPSERT", idempotencyKey, payload: { id: entityId, startedAt: new Date().toISOString(), targetSpecies: "ISTAVRIT", caughtSpecies: [], quantity: 0, result: "NONE", photoPaths: [], sharePublicly: false, spotId: conditionSpotId } };
const headers = { apikey: anonKey, authorization: `Bearer ${auth.data.session.access_token}`, "content-type": "application/json", "x-idempotency-key": idempotencyKey };
const first = await fetch(`${base}/functions/v1/api/sync`, { method: "POST", headers, body: JSON.stringify(syncBody) });
if (!first.ok) throw new Error(`SYNC_HTTP_${first.status}`);
const replay = await fetch(`${base}/functions/v1/api/sync`, { method: "POST", headers, body: JSON.stringify(syncBody) });
const replayBody = await replay.json();
if (!replay.ok || replayBody.replayed !== true) throw new Error("SYNC_IDEMPOTENCY_FAILED");
const storedReport = await supabase.from("catch_reports").select("condition_snapshot_id").eq("id", entityId).single();
if (storedReport.error || !storedReport.data.condition_snapshot_id) throw new Error("REPORT_CONDITION_SNAPSHOT_FAILED");

const publicEntityId = crypto.randomUUID();
const publicQueueId = crypto.randomUUID();
const publicKey = `CATCH_REPORT:${publicEntityId}:UPSERT:${publicQueueId}`;
const publicAttempt = await fetch(`${base}/functions/v1/api/sync`, {
  method: "POST",
  headers: { ...headers, "x-idempotency-key": publicKey },
  body: JSON.stringify({ ...syncBody, id: publicQueueId, entityId: publicEntityId, idempotencyKey: publicKey, payload: { ...syncBody.payload, id: publicEntityId, sharePublicly: true } })
});
const publicAttemptBody = await publicAttempt.json();
if (publicAttempt.status !== 403 || publicAttemptBody.code !== "PERMANENT_ACCOUNT_REQUIRED") throw new Error("ANONYMOUS_PUBLIC_REPORT_NOT_REJECTED");

const discovery = await fetch(`${base}/functions/v1/api/discover`, {
  method: "POST",
  headers: { apikey: anonKey, authorization: `Bearer ${auth.data.session.access_token}`, "content-type": "application/json" },
  body: JSON.stringify({ regionKey: "smoke-karasu-20260823-d", regionDescription: "Sakarya Karasu kıyısı, Türkiye", radiusKm: 25, targetSpecies: "ISTAVRIT", force: false })
});
const discoveryBody = await discovery.json();
const discoveryContract = Array.isArray(discoveryBody.candidates) && discoveryBody.candidates.length > 0 && discoveryBody.candidates.every((candidate) => {
  const sourceContract = Array.isArray(candidate.sources) && candidate.sources.length > 0;
  const coordinateContract = candidate.coordinatePrecision === "UNKNOWN"
    ? candidate.latitude === null && candidate.longitude === null
    : Number.isFinite(candidate.latitude) && Number.isFinite(candidate.longitude) && candidate.sources.some((source) => source.supportsCoordinate === true);
  return sourceContract && coordinateContract;
});
if (!discovery.ok || !["live", "cached"].includes(discoveryBody.source) || !discoveryContract) throw new Error("DISCOVERY_CONTRACT_FAILED");

const rejectedDeletion = await fetch(`${base}/functions/v1/api/account/delete`, { method: "POST", headers: { apikey: anonKey, authorization: `Bearer ${auth.data.session.access_token}`, "content-type": "application/json" }, body: JSON.stringify({ confirmation: "SIL" }) });
if (rejectedDeletion.status !== 400) throw new Error(`ACCOUNT_DELETE_CONFIRMATION_${rejectedDeletion.status}`);
const deletion = await fetch(`${base}/functions/v1/api/account/delete`, { method: "POST", headers: { apikey: anonKey, authorization: `Bearer ${auth.data.session.access_token}`, "content-type": "application/json" }, body: JSON.stringify({ confirmation: "HESABIMI SIL" }) });
if (!deletion.ok) throw new Error(`ACCOUNT_DELETE_HTTP_${deletion.status}`);
const deletedSession = await fetch(`${base}/functions/v1/api/sync`, { method: "POST", headers, body: JSON.stringify(syncBody) });
if (deletedSession.status !== 401) throw new Error(`DELETED_SESSION_STILL_ACTIVE_${deletedSession.status}`);
console.log(`Backend health, ${nearbyBody.spots.length} nearby seeds, conditions/report snapshot, guest/publication rules, idempotent sync, ${discoveryBody.source} discovery, deletion confirmation and deleted-session smoke tests passed.`);
