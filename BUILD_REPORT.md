# Build and verification report

Checked on 23 August 2026 at commit working tree for Mera 0.1.0.

## Passed

- ESLint: zero errors and zero warnings.
- TypeScript: all five workspaces plus the Expo application pass strict checking.
- Unit tests: 19 passed (configuration/regulation, scoring/safety/geodesy/sync and seed provenance).
- PostgreSQL migration: parsed successfully; pgTAP suite contains spatial, privacy, discovery-lock and regulation assertions.
- Edge Function: Deno formatting and static checking pass.
- Expo prebuild: Android and iOS native projects generated successfully; identifiers resolve to `app.mera.mobile`.
- Expo dependency checks: project dependencies are compatible; the only local doctor failure is missing CocoaPods.
- Production Metro/Hermes exports: Android 4.8 MB and iOS 4.6 MB bundles generated successfully after the final feature changes.
- Live provider smoke test: Open-Meteo weather and marine endpoints returned current Karasu-area data.
- Dependency audit: 0 critical/high, 11 moderate findings isolated to Expo's Node build/config chain; analysis is in `SECURITY_REVIEW.md`.

## Not executable in the attached environment

- Android APK/AAB native compilation: Android SDK is not installed.
- iOS native compilation/simulator: CocoaPods is absent and CoreSimulatorService has no usable runtime. Homebrew installation was attempted, but this macOS runtime reported unsupported `dunno` CPU architecture for CocoaPods dependencies.
- Local Supabase migration/pgTAP execution: Docker CLI exists but the daemon is unavailable. CI is configured to run `supabase db start` and `supabase test db` on Linux.
- Physical-device acceptance: no iPhone or Android phone is attached.
- Hosted offline basemap: public OpenStreetMap bulk/offline tiles are prohibited, so no unlicensed placeholder endpoint is used. A Mera-controlled, offline-permitted vector-tile URL/package must be provisioned and tested.
- Backend/mobile deployment: no owner Supabase, Expo/EAS, Apple Developer or Google Play credentials are available.

## Release status

The source-level MVP and unsigned Android/iOS bundles are reproducible and verified. It is not yet a store-ready production release: signed native binaries, deployed backend, licensed offline tile pack, pgTAP on a live PostGIS stack and the physical-device checklist remain mandatory gates.
