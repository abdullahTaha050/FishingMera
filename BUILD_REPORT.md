# Build and verification report

Checked on 23 August 2026 at commit `44b1f82` for Mera 0.1.0.

## Passed

- GitHub CI is green. ESLint reports zero errors/warnings, all five workspaces and the Expo application pass strict TypeScript checking, and all 22 automated tests pass (20 configuration/domain/seed tests plus 2 Deno confidence-delta tests).
- The 12-assertion pgTAP suite passes in CI against a real local Supabase/PostGIS stack. It covers spatial queries, privacy, permanent-account behavior, storage policies, account cascade deletion, discovery locking and regulation data.
- The Edge Function passes Deno formatting, static checking and tests. Structured route/latency/cache/provider logs omit sensitive request data, and provider failures expose only sanitized error codes.
- Supabase production is deployed to project `dwpiuyasffstbjanzfxj` in `eu-west-1`: migration, authentication configuration, storage policy and the `api` Edge Function are live.
- Hosted backend smoke tests pass for health, nearby-place search, conditions, anonymous authentication, idempotent sync, deletion confirmation and permanent account deletion. A deleted session correctly receives HTTP 401.
- OpenAI-backed live discovery passes using `gpt-5-mini`: a forced Karasu/ISTAVRIT request produced six candidates with two to four sources each. Repeating the request returned the same run from cache while preserving source and coordinate contracts.
- Embedded offline basemap verification passes for 13,504 road/coast/place features, attribution/licence metadata and SHA-256.
- Release preflight passes for 23 required artifacts, the opaque 1254×1254 icon, adaptive icon/splash references, EAS profiles, PostGIS/RLS/storage/cascade, account deletion and environment contracts.
- Expo prebuild generates Android and iOS native projects successfully with identifier `app.mera.mobile`. Production Metro/Hermes exports pass for both platforms after pinning Expo-compatible Reanimated/Worklets versions.
- Expo dependency checks pass 18/18 in GitHub CI. The dependency audit has no critical/high findings; the 12 moderate findings are isolated to Expo's Node build/config chain and documented in `SECURITY_REVIEW.md`.
- EAS project `@beardtech/mera` is linked. Development, preview and production environments contain the public Supabase endpoint and sensitive anonymous key.
- The iOS Simulator EAS build `a6f13852-e8c9-418d-a18c-2fb2b4c4e340` finished successfully. Its 60 MB archive was downloaded and verified as SHA-256 `20873ae1aa5c8968a885934d935d44b74a6d481ea06a9f19098d0dfea7d1e24b`.
- The signed Android preview EAS build `1a0aa534-71ea-4161-955c-ed71f6e2d551` finished successfully with the Expo-managed remote Android keystore. The 152,793,518-byte APK was downloaded, its ZIP structure passes without errors, it contains an APK Signing Block, and its SHA-256 is `5393b936a29609d1ddb81c447c571ea8e441048fe3a58504fb455a2f4eb963a1`.

## Remaining release gates

- Physical-device acceptance has not run because no Android phone or iPhone is attached. The required airplane-mode capture, process restart, reconnect sync, duplicate prevention and privacy checks must pass on a real device before the MVP can be declared complete. Included Maestro flows assist the run but do not replace the device evidence.
- The successful iOS artifact is simulator-only. A physical iPhone build still requires the project owner's Apple Developer signing credentials.
- Local iOS compilation remains unavailable because this Mac's Xcode 26.6 installation cannot load a required `DVTDownloads` symbol and requests `xcodebuild -runFirstLaunch`. This does not affect the successful remote EAS Simulator build.
- Local Supabase execution remains unavailable because Docker Desktop's daemon is not running; CI and the deployed Supabase project provide the database coverage above.

## Release status

The backend is deployed, OpenAI discovery is live, CI is green, the Android preview APK is signed and the iOS Simulator package is reproducible. The MVP is not yet declared complete: the real-device offline/reconnect acceptance scenario must be proven. Physical iOS distribution additionally requires Apple Developer signing.
