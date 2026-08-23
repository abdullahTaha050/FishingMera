import { readFile, access } from "node:fs/promises";

const requiredFiles = [
  "ARCHITECTURE.md", "COSTS.md", "DATA_MODEL.md", "OFFLINE_STRATEGY.md", "SECURITY.md", "SECURITY_REVIEW.md",
  "DEPLOYMENT.md", "DEVICE_TEST_CHECKLIST.md", "PRIVACY_POLICY_TR.md", "STORE_RELEASE_CHECKLIST.md", "RELEASE_AUDIT.md", ".maestro/offline-core.yaml", ".maestro/offline-catch.yaml",
  ".github/workflows/ci.yml", ".github/workflows/deploy-backend.yml", ".github/workflows/mobile-build.yml",
  "apps/mobile/app/privacy.tsx", "apps/mobile/assets/icon.png", "apps/mobile/assets/sakarya-kocaeli-basemap.json", "apps/mobile/eas.json",
  "supabase/migrations/202608230001_initial.sql", "supabase/functions/api/index.ts", "supabase/tests/001_spatial_and_privacy.sql"
];
await Promise.all(requiredFiles.map((path) => access(path).catch(() => { throw new Error(`REQUIRED_FILE_MISSING:${path}`); })));

const icon = await readFile("apps/mobile/assets/icon.png");
if (icon.toString("ascii", 1, 4) !== "PNG") throw new Error("APP_ICON_NOT_PNG");
const width = icon.readUInt32BE(16);
const height = icon.readUInt32BE(20);
const colorType = icon[25];
if (width !== height || width < 1024) throw new Error(`APP_ICON_INVALID_SIZE:${width}x${height}`);
if (colorType === 4 || colorType === 6) throw new Error("APP_ICON_MUST_BE_OPAQUE");

const appConfig = await readFile("apps/mobile/app.config.ts", "utf8");
for (const marker of ["app.mera.mobile", "./assets/icon.png", "adaptiveIcon", "expo-splash-screen", "buildNumber", "versionCode", "EAS_PROJECT_ID", "android.permission.RECORD_AUDIO"]) {
  if (!appConfig.includes(marker)) throw new Error(`APP_CONFIG_MARKER_MISSING:${marker}`);
}

const eas = JSON.parse(await readFile("apps/mobile/eas.json", "utf8"));
if (eas.build?.preview?.android?.buildType !== "apk") throw new Error("EAS_PREVIEW_APK_MISSING");
if (eas.build?.production?.android?.buildType !== "app-bundle") throw new Error("EAS_PRODUCTION_AAB_MISSING");
if (!eas.build?.simulator?.ios?.simulator) throw new Error("EAS_IOS_SIMULATOR_PROFILE_MISSING");

const migration = await readFile("supabase/migrations/202608230001_initial.sql", "utf8");
for (const marker of ["create extension if not exists postgis", "nearby_spots", "enable row level security", "spots_publication_requires_permanent_insert", "reports_publication_requires_permanent_insert", "catch-photos", "spot-photos", "on delete cascade"]) {
  if (!migration.toLowerCase().includes(marker.toLowerCase())) throw new Error(`DATABASE_SECURITY_MARKER_MISSING:${marker}`);
}

const envExample = await readFile(".env.example", "utf8");
for (const key of ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY", "EAS_PROJECT_ID", "OPENAI_API_KEY", "DISCOVERY_DAILY_SEARCH_LIMIT", "DISCOVERY_MONTHLY_USD_LIMIT"]) {
  if (!envExample.includes(`${key}=`)) throw new Error(`ENV_TEMPLATE_KEY_MISSING:${key}`);
}

const accountApi = await readFile("supabase/functions/api/index.ts", "utf8");
for (const marker of ["/account/delete", "removeOwnerStorage", "auth.admin.deleteUser", "HESABIMI SIL"]) {
  if (!accountApi.includes(marker)) throw new Error(`ACCOUNT_DELETE_MARKER_MISSING:${marker}`);
}

const profile = await readFile("apps/mobile/app/(tabs)/profile.tsx", "utf8");
for (const marker of ["deleteCloudAccount", "deleteLocalAccountData", "deleteAllLocalPhotos", "/privacy"]) {
  if (!profile.includes(marker)) throw new Error(`MOBILE_PRIVACY_MARKER_MISSING:${marker}`);
}

const localDb = await readFile("apps/mobile/src/db.ts", "utf8");
for (const marker of ["CREATE TABLE IF NOT EXISTS spot_notes", "DELETE FROM spot_notes", "saveSpotNote", "recentReportsMap"]) {
  if (!localDb.includes(marker)) throw new Error(`OFFLINE_NOTE_MARKER_MISSING:${marker}`);
}
const spotDetail = await readFile("apps/mobile/app/spot/[id].tsx", "utf8");
for (const marker of ["saveSpotNote", "Kişisel not", "currentSpeedKmh", "wavePeriodS"]) {
  if (!spotDetail.includes(marker)) throw new Error(`SPOT_DETAIL_MARKER_MISSING:${marker}`);
}

console.log(`Release preflight passed: ${requiredFiles.length} artifacts; opaque ${width}x${height} icon; EAS, PostGIS/RLS/storage, account deletion and environment contracts present.`);
