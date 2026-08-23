# Mera

Offline-first iOS and Android assistant for amateur shore anglers in Türkiye. It answers “Ben buradayım. Bu takımla, bu seviyede, bugün nereye gitmeliyim?” with deterministic, explainable scoring and conservative safety gates.

## Current MVP

- Expo SDK 57 / React Native / TypeScript / Expo Router development build.
- MapLibre native map with an embedded 13,504-feature OSM road/coast/place basemap plus optional licensed native packs; no public OSM tile bulk download.
- Persistent Expo SQLite bootstrap with 18 sourced Sakarya/Kocaeli-area seed locations.
- GPS, heading/magnetometer fallback, straight-line distance/bearing and local vehicle waypoint.
- Offline favorites, multiple gear profiles, photo catch reports, cached conditions, outbox queue and reconnect sync.
- Offline user-created spots with private, approximate or public publication levels and owner-only exact coordinate isolation.
- Guest-to-email-OTP account upgrade, community feedback queue, conservative confidence deltas and per-user abuse limits.
- Open-Meteo Weather/Marine cache with partial/stale fallback.
- PostgreSQL/PostGIS radius queries, Auth/RLS, storage policy and idempotency ledger.
- Budgeted server-only OpenAI Responses web discovery with strict schema and coordinate-evidence rejection.
- Dated offline cache of the current 6/2 amateur fishing communiqué and 2025/12 amendment summary.
- Deterministic recommendation/safety/gear/distance/dedupe rules covered by tests.

## Repository

```text
apps/mobile          Expo mobile application
packages/types       Shared contracts
packages/config      Species, weights, safety and gear rules
packages/domain      Pure recommendation/geodesy/dedupe/sync logic
packages/seed-data   Bundled regional data and provenance
supabase             PostGIS migration, pgTAP and Edge Function API
```

Read [ARCHITECTURE.md](./ARCHITECTURE.md), [OFFLINE_STRATEGY.md](./OFFLINE_STRATEGY.md), [DATA_MODEL.md](./DATA_MODEL.md), [COSTS.md](./COSTS.md), [SEED_DATA.md](./SEED_DATA.md), [REGULATIONS.md](./REGULATIONS.md), [SECURITY.md](./SECURITY.md), [PRIVACY_POLICY_TR.md](./PRIVACY_POLICY_TR.md), [STORE_RELEASE_CHECKLIST.md](./STORE_RELEASE_CHECKLIST.md), [BUILD_REPORT.md](./BUILD_REPORT.md), and [RELEASE_AUDIT.md](./RELEASE_AUDIT.md) before changing platform boundaries or claiming completion.

## Local setup

Node 24.19+ is required.

```bash
cp .env.example .env
npm ci
npm run typecheck
npm test
npm run basemap:verify
npm run mobile
```

MapLibre is native and does not run in Expo Go. Build a development client:

```bash
cd apps/mobile
npx expo prebuild --clean
npx expo run:ios     # macOS/Xcode/CocoaPods
npx expo run:android # Android SDK/JDK
```

Without environment variables, the app still opens, seeds SQLite, recommends from local data, saves favorites/reports/car position, and shows the embedded offline roads/coast/place map and pins. Conditions, cloud sync, discovery and optional higher-detail downloadable tiles degrade visibly.

## Backend locally

Docker-compatible runtime with at least 7 GB available is required.

```bash
npx supabase start
npx supabase db reset
npx supabase test db
npx supabase functions serve api --env-file .env
```

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run db:parse
npm run deno:check
npm run deno:test
npm run mobile:export
cd apps/mobile && npx expo-doctor
```

Metro production exports validate Android/iOS JavaScript bundles; they are not signed APK/AAB/IPA files. See [DEPLOYMENT.md](./DEPLOYMENT.md) and [DEVICE_TEST_CHECKLIST.md](./DEVICE_TEST_CHECKLIST.md) for native/store gates.

`npm run test:integration:providers` performs a live, read-only Open-Meteo Weather/Marine contract check. After backend deployment, `npm run test:integration:backend` verifies health, PostGIS nearby results, condition caching, anonymous auth and idempotent private-report sync using the configured public Supabase URL/key.

## Environment variables

Only `EXPO_PUBLIC_*` values enter the mobile bundle. The Supabase anon key is publishable by design and protected by RLS; the service-role key and `OPENAI_API_KEY` are server-only. `EXPO_PUBLIC_MAP_STYLE_URL` must be an offline-permitted, Mera-controlled MapLibre style.

## Safety language

Mera is not a marine navigation or life-safety system. It never claims the sea, access or route is safe. Bearings are straight-line guidance; users must check local conditions, restrictions and physical access.
