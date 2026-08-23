# Mera Architecture

Status: accepted for MVP, 23 August 2026.

## Decision

Mera is a TypeScript monorepo with an Expo SDK 57 React Native application, Expo Router, Expo Development Builds, MapLibre React Native, persistent `expo-sqlite`, and a Supabase backend (PostgreSQL/PostGIS, Auth, Storage and Deno Edge Functions).

MapLibre is native code and [cannot run in Expo Go](https://maplibre.org/maplibre-react-native/docs/setup/expo/), so the app uses Continuous Native Generation and development builds. Expo describes a development build as the production-grade route when native libraries are required and supports local iOS/Android compilation without an Expo account.

The first backend deployment uses Supabase Free. It combines PostGIS, row-level security, anonymous/OTP auth, object storage and server functions in one operational boundary. All domain rules remain platform-neutral and the SQL uses standard PostgreSQL/PostGIS, keeping a Cloudflare Workers + Neon + R2 migration viable.

## Components

```text
Mobile (Expo/React Native)
  UI / Expo Router
  Recommendation domain package (deterministic)
  SQLite + outbox sync queue
  MapLibre + embedded ODbL road/coast/place GeoJSON
  Optional Mera-controlled native offline packs
  GPS + magnetometer + vehicle waypoint
        |
        | HTTPS, JWT, idempotency keys
        v
Supabase Edge Function API
  auth/RLS boundary
  condition cache + Open-Meteo adapter
  recommendation orchestration
  discovery budget/cache/deduplication
        |
        +--> PostgreSQL + PostGIS
        +--> Storage (user photos)
        +--> Open-Meteo Weather/Marine
        +--> OpenAI Responses API web search (server only, optional)
```

## Key boundaries

- Recommendation scores and safety gates are pure, deterministic functions. AI never supplies a score, risk flag, coordinate or gear weight.
- Precise location is sent only for an explicit nearby query and is not stored as location history.
- Private spots are owner-scoped by RLS and excluded from public/recommendation SQL at the database boundary.
- Mutations use client-generated UUIDs and idempotency keys. The local outbox survives restarts and retries.
- Cached weather/marine snapshots always carry `observedAt`, `fetchedAt`, `expiresAt` and visible staleness.
- Road distance is optional and separately labelled. Haversine/PostGIS distance is never called driving distance.

## Offline map decision

The baseline map is a release-built, checksum-pinned GeoJSON extract with 13,504 OSM road, coastline and settlement features. It is shipped inside the signed application and rendered by MapLibre before any network call. OpenStreetMap/ODbL attribution remains visible; the build script downloads raw map data through one Overpass query and never bulk-downloads public raster tiles.

MapLibre `OfflineManager` remains available for optional higher-detail bounded styles. Public `tile.openstreetmap.org` is prohibited: the [OSMF tile policy](https://operations.osmfoundation.org/policies/tiles/) explicitly forbids prefetch and offline packs. Any configured production style must therefore be Mera-controlled and explicitly permit offline caching. Package version/checksum and completion state are persisted with each region.

## Backend alternatives

### Supabase (selected)

- Strongest implementation speed: one project supplies Postgres/PostGIS, Auth, Storage, RLS and Edge Functions.
- Free quota includes 500 MB database, 1 GB storage, 5 GB egress, 50,000 MAU and 500,000 Edge Function invocations.
- Tradeoff: free projects can pause after one inactive week. Offline seed data limits user impact; production promotion moves to Pro before reliability becomes contractual.

### Cloudflare Workers + Neon + R2

- Free Workers quota is 100,000 requests/day; R2 includes 10 GB and free egress; Neon Free includes 0.5 GB and 100 CU-hours/project/month.
- Better separation and edge economics, but auth, migrations, RLS-equivalent policy enforcement, upload signing and observability require more custom code.
- Kept as the first scale/cost migration path. Domain code and PostgreSQL schema are portable.

## ADR: OpenAI discovery

Discovery is a budgeted, server-only enrichment job. The OpenAI Responses API supports built-in web search and including returned source URLs. Each response must conform to a strict candidate schema, then pass coordinate evidence, source-domain, dedupe and safety validation before persistence. `store: false`, `max_tool_calls`, a daily call cap and a monthly USD circuit breaker are mandatory. The [Responses API](https://developers.openai.com/api/reference/cli/resources/responses/methods/create) documents built-in web search, source inclusion and structured output controls.

When the OpenAI budget is exhausted or no API key exists, discovery returns a non-fatal `temporarily_unavailable`; stored and seed spots continue to work.
