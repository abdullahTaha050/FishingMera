# Build and verification report

Checked on 23 August 2026 at commit working tree for Mera 0.1.0.

## Passed

- ESLint: zero errors and zero warnings.
- TypeScript: all five workspaces plus the Expo application pass strict checking.
- Automated tests: 22 passed (20 configuration/domain/seed tests plus 2 Deno confidence-delta tests). The added domain test proves that only recent, target-species catch reports feed the recommendation report factor.
- PostgreSQL migration: parsed successfully; 12-assertion pgTAP suite contains spatial, privacy, permanent-account, storage, account-cascade, discovery-lock and regulation checks.
- Edge Function: Deno formatting, static checking and tests pass; structured route/latency/cache/provider logs omit sensitive request data.
- Embedded offline basemap: 13,504 road/coast/place features, attribution/licence metadata and SHA-256 all pass reproducible verification.
- Release preflight: 23 required artifacts, opaque 1254×1254 icon, adaptive icon/splash references, EAS profiles, PostGIS/RLS/storage/cascade, account deletion and environment contracts pass.
- Expo prebuild: Android and iOS native projects generated successfully; identifiers resolve to `app.mera.mobile`.
- iOS pod integration: CocoaPods 1.16.2 resolved 116 dependencies/115 pods, including MapLibre, Expo modules and React Native codegen, from the generated workspace.
- Signed-build automation: manual GitHub workflow is configured for development/preview/simulator/production EAS profiles; it remains credential-gated.
- Expo dependency checks: all 18/18 `expo-doctor` checks pass when the project-local CocoaPods installation is on `PATH`.
- Production Metro/Hermes exports: Android 7.6 MB and iOS 7.4 MB bundles generated successfully after the embedded basemap, photo, OTP and detail-flow changes.
- Live provider smoke test: Open-Meteo weather and marine endpoints returned current Karasu-area data.
- Dependency audit: 0 critical/high, 12 moderate findings isolated to Expo's Node build/config chain; analysis is in `SECURITY_REVIEW.md`.

## Not executable in the attached environment

- Android native compilation: Google's official ARM command-line tools 22.0 were checksum-verified and installed in the project-only temporary area. Gradle 9.3.1, Expo/React Native plugins and the required JDK 17 toolchain resolve. The build identifies compile/target SDK 36, build-tools 36.0.0 and NDK 27.1.12297006, but those packages cannot be installed until the project owner reviews and accepts the Google Android SDK license. Only 3.4 GiB remains locally, so a remote EAS build is still the safer signed-build path after Expo linking.
- iOS native compilation/simulator: pod integration passes, but Xcode 26.6 fails before compiling application code because `IDESimulatorFoundation` cannot load a required `DVTDownloads` symbol. Xcode explicitly requests `xcodebuild -runFirstLaunch`; repairing/updating this machine's Xcode installation requires owner/admin action.
- Local Supabase migration/pgTAP execution: Docker CLI exists but the daemon is unavailable. CI is configured to run `supabase db start` and `supabase test db` on Linux.
- Physical-device acceptance: no iPhone or Android phone is attached. Two Maestro offline flows are included but cannot replace the unrun sensor/privacy/device matrix.
- Backend/mobile deployment: no owner Supabase, Expo/EAS, Apple Developer or Google Play credentials are available.

## Release status

The source-level MVP and unsigned Android/iOS bundles are reproducible and verified. It is not yet a store-ready production release: signed native binaries, deployed backend, pgTAP on a live PostGIS stack and the physical-device checklist remain mandatory gates. The embedded ODbL basemap removes the baseline tile-host dependency; a hosted style is optional for higher detail.
