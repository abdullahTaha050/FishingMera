# Deployment runbook

## Backend

Production deployment is intentionally credential-gated. Create a Supabase project in a region suitable for Turkish users, then add repository secrets `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`, `SUPABASE_ANON_KEY`, and `OPENAI_API_KEY`. The workflow uploads the OpenAI key and fixed discovery limits directly as Edge Function secrets; the key must never be an Expo environment value.

The deploy workflow runs `supabase config push`, which enables anonymous sign-ins/manual identity linking and keeps `mera://auth/callback` in the redirect allowlist from version-controlled configuration. In the dashboard, configure the sign-in and change-email templates to show the six-digit `Token` as well as a link; Mera's in-app flow verifies that OTP. Configure production SMTP before release because the default mail service is rate-limited and not a delivery SLA.

This is the first unavoidable owner action: the project owner must create/select the Supabase organization, accept its terms and control billing. Do not send passwords or service-role keys in chat; enter them in Supabase/GitHub secret fields.

The production workflow previews migrations, applies them, then deploys the `api` function. Do not put service-role or OpenAI secrets in Expo environment variables.

## Offline map data

The signed application already embeds a reproducible Sakarya/Kocaeli OSM road/coast/place extract, so first-launch and airplane-mode acceptance do not depend on a tile host. Run `npm run basemap:verify`, retain OpenStreetMap attribution and preserve the ODbL notice. Never point `EXPO_PUBLIC_MAP_STYLE_URL` at `tile.openstreetmap.org`.

Higher-detail tiles are optional. If added, host them on an endpoint whose terms permit prefetch/offline caching, test every declared bounds/zoom pack on iOS and Android, and publish version/checksum metadata.

## Mobile builds

```bash
npm ci
npm run typecheck
npm test
cd apps/mobile
npx expo prebuild --clean
npx expo run:ios
npx expo run:android
```

EAS profiles provide development, Android APK preview, Android AAB production and iOS simulator/production builds. Run `eas init` once inside `apps/mobile`, then put the returned UUID in the GitHub repository variable `EAS_PROJECT_ID`. Create an Expo access token and store it as the GitHub secret `EXPO_TOKEN`. In the EAS `development`, `preview`, and `production` environments, configure `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`; the optional map style variable must only reference an offline-permitted source. The manual `Mobile build` GitHub workflow then starts signed builds without exposing credentials in source.

The generated app icon is opaque and mask-safe; Expo's SDK 57 splash-screen config plugin owns native splash generation. Verify the final adaptive mask and splash visually on the preview APK and iOS release/TestFlight build, because development clients do not exactly reproduce standalone splash behavior.

This is the second unavoidable owner action: sign in to an Expo account for EAS, then authorize Apple/Google signing only through their official prompts. Local source and unsigned JavaScript exports do not require those accounts.

For a local Android debug APK, the owner must also review and accept the Android SDK licence shown by `sdkmanager --licenses`; this repository does not auto-accept third-party legal agreements. The native project currently targets SDK 36/build-tools 36.0.0 and NDK 27.1.12297006. In the attached environment, remote EAS is preferred because local free disk is below the comfortable NDK/build headroom.

## Promotion gates

- CI and database pgTAP green.
- Device checklist complete on one physical iPhone and Android phone.
- Embedded OSM extract checksum, ODbL notice and in-app attribution reviewed.
- Current Turkish amateur fishing regulation dataset loaded and dated.
- Open-Meteo commercial plan purchased before any commercial use.
- Privacy disclosure, location purpose strings and account deletion flow reviewed.
- Owner fields in `PRIVACY_POLICY_TR.md` completed, legally reviewed and published at a stable public HTTPS URL; `STORE_RELEASE_CHECKLIST.md` complete.
- Supabase upgraded to Pro before pause-free production reliability is promised.

See `BUILD_REPORT.md` for the exact checks already completed and the current environment blockers.
