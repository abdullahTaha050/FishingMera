# Build and verification report

Checked on 23 August 2026 at commit working tree for Mera 0.1.0.

## Passed

- ESLint: zero errors and zero warnings.
- TypeScript: all five workspaces plus the Expo application pass strict checking.
- Automated tests: 21 passed (19 configuration/domain/seed tests plus 2 Deno confidence-delta tests).
- PostgreSQL migration: parsed successfully; 11-assertion pgTAP suite contains spatial, privacy, permanent-account, storage, discovery-lock and regulation checks.
- Edge Function: Deno formatting, static checking and tests pass; structured route/latency/cache/provider logs omit sensitive request data.
- Embedded offline basemap: 13,504 road/coast/place features, attribution/licence metadata and SHA-256 all pass reproducible verification.
- Expo prebuild: Android and iOS native projects generated successfully; identifiers resolve to `app.mera.mobile`.
- Expo dependency checks: project dependencies are compatible; the only local doctor failure is missing CocoaPods.
- Production Metro/Hermes exports: Android 7.6 MB and iOS 7.4 MB bundles generated successfully after the embedded basemap, photo, OTP and detail-flow changes.
- Live provider smoke test: Open-Meteo weather and marine endpoints returned current Karasu-area data.
- Dependency audit: 0 critical/high, 11 moderate findings isolated to Expo's Node build/config chain; analysis is in `SECURITY_REVIEW.md`.

## Not executable in the attached environment

- Android APK/AAB native compilation: Android SDK is not installed.
- iOS native compilation/simulator: CocoaPods is absent and CoreSimulatorService has no usable runtime. Homebrew installation was attempted, but this macOS runtime reported unsupported `dunno` CPU architecture for CocoaPods dependencies.
- Local Supabase migration/pgTAP execution: Docker CLI exists but the daemon is unavailable. CI is configured to run `supabase db start` and `supabase test db` on Linux.
- Physical-device acceptance: no iPhone or Android phone is attached. Two Maestro offline flows are included but cannot replace the unrun sensor/privacy/device matrix.
- Backend/mobile deployment: no owner Supabase, Expo/EAS, Apple Developer or Google Play credentials are available.

## Release status

The source-level MVP and unsigned Android/iOS bundles are reproducible and verified. It is not yet a store-ready production release: signed native binaries, deployed backend, pgTAP on a live PostGIS stack and the physical-device checklist remain mandatory gates. The embedded ODbL basemap removes the baseline tile-host dependency; a hosted style is optional for higher detail.
