# Release completion audit

Audit date: 23 August 2026. This file separates implemented source, automated evidence and external release gates. `PASS` never means a physical-device behavior was observed unless the evidence column names that device run.

## Requirement coverage

| Scope | Status | Authoritative evidence |
| --- | --- | --- |
| Native iOS + Android Expo/React Native application | PASS — source/build export | `apps/mobile`, successful Android/iOS Metro exports, Expo prebuild, `app.mera.mobile` native identifiers |
| Offline-first SQLite bootstrap and bundled regional data | PASS — automated/source | `apps/mobile/src/db.ts`; seed/config/domain tests; 18 sourced spots in `packages/seed-data` |
| Offline roads, coastline, place names and mera pins | PASS — automated/source | 13,504-feature bundled GeoJSON; `npm run basemap:verify`; MapLibre layers and visible OSM/ODbL attribution |
| GPS, heading, bearing, distance and vehicle waypoint | PASS — unit/source; DEVICE GATE for sensors | `location.ts`, `compass.tsx`, geodesy tests; physical magnetometer/GPS accuracy still unobserved |
| Multi-gear profile, experience, fishing type, species and radius preferences | PASS — source/typecheck | onboarding/profile/store/SQLite implementations; nine configured species |
| Deterministic recommendation, explanations and hard safety rules | PASS — automated/source | config/domain tests; structured factor codes; last-90-day local report summaries feed the report factor; AI excluded from scoring |
| Weather/marine cache, staleness and fishing-time windows | PASS — contract/source | live provider smoke test; condition cache Edge route; timestamp/staleness UI |
| Condition snapshot attached to catch report | PASS — hosted integration | Hosted smoke creates a spot-scoped condition row and proves the synced report retains its `condition_snapshot_id` |
| Evidence-preserving server-side web discovery | PASS — live integration | Forced OpenAI discovery returned six Karasu/İSTAVRİT candidates with two-to-four sources each; cached replay preserved source and coordinate contracts |
| Spot detail, sources, photos, reports, personal notes, full conditions, regulation and offline actions | PASS — source/export | `app/spot/[id].tsx`; local-only SQLite notes; all cached weather/marine fields; versioned regulation dataset; local report/photo display |
| Offline photo/report/spot queues and reconnect/foreground sync | PASS — source/unit; DEVICE GATE | durable JPEG copies, EXIF removal, outbox recovery, idempotency/backoff tests; reconnect still needs real device/backend |
| Guest mode, OTP upgrade and account deletion | PASS — hosted deletion; EMAIL/DEVICE GATE for OTP | Hosted smoke proves anonymous auth, exact deletion confirmation, Auth/data removal and deleted-session rejection; ownership-preserving OTP upgrade still needs the real email/device run |
| Public/private/approximate coordinate privacy | PASS — pgTAP/hosted rules; DEVICE GATE for cross-account UI | Separate exact-coordinate table, public radius filter, RLS and 16-assertion pgTAP suite; hosted smoke rejects anonymous public reports, while the cross-account device flow remains pending |
| Community feedback, abuse limit and confidence update | PASS — automated/source | five/hour server limit, conservative ± deltas with Deno tests, acknowledged score returned to SQLite |
| Privacy-friendly analytics and observability | PASS — source | local event allowlist rejects location-like keys; structured request/cache/provider/cost logs omit bodies and coordinates |
| Cost controls and operational documentation | PASS — docs/source | `COSTS.md`, discovery budgets/cache, graceful no-key/no-budget fallback |
| CI/CD and reproducible release configuration | PASS — configuration | CI, pgTAP job, backend deploy+smoke workflow, manual EAS signed-build workflow, preview APK/production AAB/iOS profiles |
| Store-ready branding/configuration | PASS — static/prebuild | opaque square icon, adaptive icon, splash, bundle/package IDs and build numbers; `npm run release:preflight` |
| Privacy disclosure and store submission inventory | PASS — draft/source; OWNER/LEGAL GATE | in-app Turkish disclosure, owner-fielded policy draft, account deletion and platform checklists; public URL/legal identity/review pending |
| Deployed production backend | PASS — live integration | Supabase project `dwpiuyasffstbjanzfxj` in `eu-west-1`; migrations/functions/secrets deployed; expanded hosted smoke and live OpenAI discovery pass |
| Signed Android APK/AAB and iOS IPA/TestFlight build | PARTIAL — Android APK/AAB + iOS Simulator | Signed preview APK `d30ce475-b4af-4855-a575-367c12fab36c` and production AAB `a0cc1b81-cf5e-4f71-9a50-f068c0a67db9` are downloaded and structurally/signature verified; physical iOS signing remains owner-gated |
| Full real-device airplane-mode/reconnect acceptance | DEVICE GATE — IN PROGRESS | Galaxy A30s/Android 11 testing found and closed launch/theme defects; current APK installation and the full Android+iPhone scenario remain unproven |

## Required 23-step MVP scenario

| Steps | Implementation state | Completion evidence |
| --- | --- | --- |
| 1–4: launch, beginner, 270 cm 10–30 g spin, İstavrit | Source ready | Defaults/onboarding and SQLite persistence; not yet observed on a phone |
| 5–8: location permission, Hendek detection, 100 km, CTA | Source ready | Permission/GPS flow and demo fallback; real Hendek GPS run pending |
| 9–11: regional results, deterministic scores and reasons | Automated/source ready | Seed/domain tests and production JS export; rendered device flow pending |
| 12–13: favorite and offline region | Source ready | SQLite favorite and embedded/checksummed map region; restart test pending |
| 14–19: airplane mode, force-close, map/GPS/compass/distance | Source ready | `.maestro/offline-core.yaml` covers repeatable UI subset; physical GPS/heading run pending |
| 20–21: save car and return after movement | Source ready | Device-only waypoint/bearing implementation; movement test pending |
| 22–23: offline report and one reconnect sync | Source/automation ready | `.maestro/offline-catch.yaml`, outbox/idempotency logic; hosted backend/device reconnect run pending |

## Current blockers to declaring MVP complete

1. Install commit `1860cc2` on the connected Galaxy A30s and run/record all of `DEVICE_TEST_CHECKLIST.md`, including airplane-mode restart, GPS/compass, vehicle movement, photo queue, OTP and reconnect idempotency.
2. Provision physical iOS signing and produce the iPhone IPA/TestFlight build.
3. Repeat and record the required physical-device coverage on the supported iPhone, including OTP ownership continuity and account deletion.

Until all three are evidenced, the product is release-candidate source, not a completed production MVP.
