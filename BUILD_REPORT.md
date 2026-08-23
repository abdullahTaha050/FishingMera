# Build and verification report

Checked on 23 August 2026 at commit `1860cc2` for Mera 0.1.0.

## Passed

- GitHub CI is green. ESLint reports zero errors/warnings, all five workspaces and the Expo application pass strict TypeScript checking, and all 22 automated tests pass (20 configuration/domain/seed tests plus 2 Deno confidence-delta tests).
- The 16-assertion pgTAP suite passes in CI against a real local Supabase/PostGIS stack. It covers spatial queries, privacy, permanent-account behavior, storage policies, account cascade deletion, discovery locking, regulation data, the 18 production seed spots, source provenance and the 100 km Hendek result contract.
- The Edge Function passes Deno formatting, static checking and tests. Structured route/latency/cache/provider logs omit sensitive request data, and provider failures expose only sanitized error codes.
- Supabase production is deployed to project `dwpiuyasffstbjanzfxj` in `eu-west-1`: both migrations, all 18 source-backed PostGIS seed spots, authentication configuration, storage policy and the `api` Edge Function are live. Seed migration upserts never promote a point to `VERIFIED`.
- Hosted backend smoke tests pass for health, 17 security-filtered nearby seeds within 100 km of Hendek, spot-scoped conditions and report snapshots, anonymous/publication rules, idempotent sync, cached discovery, deletion confirmation and permanent account deletion. A deleted session correctly receives HTTP 401.
- OpenAI-backed live discovery passes using `gpt-5-mini`: a forced Karasu/ISTAVRIT request produced six candidates with two to four sources each. Repeating the request returned the same run from cache while preserving source and coordinate contracts.
- Embedded offline basemap verification passes for 13,504 road/coast/place features, attribution/licence metadata and SHA-256.
- Release preflight passes for 24 required artifacts, the opaque 1254×1254 icon, adaptive icon/splash references, EAS remote versioning/profiles, Android contrast-safe adaptive palette, PostGIS/RLS/storage/cascade, account deletion and environment contracts.
- Expo prebuild generates Android and iOS native projects successfully with identifier `app.mera.mobile`. Production Metro/Hermes exports pass for both platforms after pinning Expo-compatible Reanimated/Worklets versions.
- Expo dependency checks pass 18/18 in GitHub CI. The dependency audit has no critical/high findings; the 12 moderate findings are isolated to Expo's Node build/config chain and documented in `SECURITY_REVIEW.md`.
- EAS project `@beardtech/mera` is linked. Development, preview and production environments contain the public Supabase endpoint and sensitive anonymous key.
- The iOS Simulator EAS build `a6f13852-e8c9-418d-a18c-2fb2b4c4e340` finished successfully. Its 60 MB archive was downloaded and verified as SHA-256 `20873ae1aa5c8968a885934d935d44b74a6d481ea06a9f19098d0dfea7d1e24b`.
- The current signed Android preview EAS build `d30ce475-b4af-4855-a575-367c12fab36c` finished successfully from commit `1860cc2` with the Expo-managed remote Android keystore and remote versionCode 3. The 152,827,914-byte APK was downloaded, its ZIP structure passes without errors, it contains an APK Signing Block, and its SHA-256 is `fbe5ae25242aba5193af7f34a90c0067e80ccdb8710935a272ba5df209faef54`.
- The production Android App Bundle EAS build `a0cc1b81-cf5e-4f71-9a50-f068c0a67db9` finished successfully from the same commit with remote versionCode 4. The 94,793,731-byte AAB was downloaded, its ZIP structure passes without errors, `jarsigner` reports `jar verified`, and its SHA-256 is `eb2c98e9818ada09550a261a30471ea9758602c636bf532b033a7ca794a7840c`.

## Remaining release gates

- Android physical testing has started on a Samsung Galaxy A30s (`SM-A307FN`, Android 11/API 30). It exposed and closed an immediate-launch `PlatformColor` crash, then exposed an unreadable Android theme-resource contrast defect; commit `1860cc2` replaces runtime Android resource colors with the explicit system-selected light/dark palette. The current APK still requires installation and the complete airplane-mode, restart, reconnect, duplicate-prevention, sensor and privacy scenario before the MVP can be declared complete.
- The successful iOS artifact is simulator-only. A physical iPhone build still requires the project owner's Apple Developer signing credentials.
- Local iOS compilation remains unavailable because this Mac's Xcode 26.6 installation cannot load a required `DVTDownloads` symbol and requests `xcodebuild -runFirstLaunch`. This does not affect the successful remote EAS Simulator build.
- Local Supabase execution remains unavailable because Docker Desktop's daemon is not running; CI and the deployed Supabase project provide the database coverage above.

## Release status

The backend and production seed data are deployed, OpenAI discovery is live, CI is green, the current Android preview APK and production AAB are signed and structurally verified, and the iOS Simulator package is reproducible. The MVP is not yet declared complete: the current APK must pass the full Android real-device offline/reconnect scenario, the same required coverage must be recorded on the iPhone, and physical iOS distribution requires Apple Developer signing.
