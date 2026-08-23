# Deployment runbook

## Backend

Production deployment is intentionally credential-gated. Create a Supabase project in a region suitable for Turkish users, then add repository environment secrets `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, and `SUPABASE_PROJECT_ID`. Add Edge Function secrets from `.env.example`, especially `OPENAI_API_KEY` only when discovery is enabled.

This is the first unavoidable owner action: the project owner must create/select the Supabase organization, accept its terms and control billing. Do not send passwords or service-role keys in chat; enter them in Supabase/GitHub secret fields.

The production workflow previews migrations, applies them, then deploys the `api` function. Do not put service-role or OpenAI secrets in Expo environment variables.

## Offline vector tiles

Generate Sakarya/Kocaeli vector packs from OSM extracts with attribution, host them on an endpoint whose terms permit prefetch/offline caching, and publish a MapLibre style URL as `EXPO_PUBLIC_MAP_STYLE_URL`. Never point this variable at `tile.openstreetmap.org`.

Before release, download each declared bounds/zoom pack on iOS and Android, verify restart in airplane mode, record byte size and SHA-256, then publish `offline_regions` metadata.

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

EAS profiles provide development, Android APK preview, Android AAB production and iOS simulator/production builds. Store submission requires the owner's Apple Developer and Google Play accounts and signing authority.

This is the second unavoidable owner action: sign in to an Expo account for EAS, then authorize Apple/Google signing only through their official prompts. Local source and unsigned JavaScript exports do not require those accounts.

## Promotion gates

- CI and database pgTAP green.
- Device checklist complete on one physical iPhone and Android phone.
- Offline tile provider/licence and attribution reviewed.
- Current Turkish amateur fishing regulation dataset loaded and dated.
- Open-Meteo commercial plan purchased before any commercial use.
- Privacy disclosure, location purpose strings and account deletion flow reviewed.
- Supabase upgraded to Pro before pause-free production reliability is promised.

See `BUILD_REPORT.md` for the exact checks already completed and the current environment blockers.
