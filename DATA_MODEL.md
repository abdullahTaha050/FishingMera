# Data model

PostgreSQL/PostGIS is authoritative for shared data. SQLite is authoritative for unsynced local actions and device-only state.

## Server entities

- `profiles`: experience, preferred fishing type and privacy settings.
- `gear_profiles`: optional rod/reel/line attributes; unknown fields remain null.
- `species`: configurable Turkish species catalog.
- `spots`: canonical and local names, geography, coast/access/terrain, hazards, prohibition, verification and confidence.
- `spot_species`, `spot_techniques`, `spot_sources`: normalized evidence and capabilities.
- `condition_snapshots`: weather/marine payload, provider timestamps and cache lifetime.
- `catch_reports`: result and tackle facts; server-linked condition snapshot.
- `spot_feedback`: rate-limited community verification events.
- `favorites`: owner-to-spot relation.
- `sync_operations`: idempotency ledger for client outbox operations.
- `discovery_runs`, `discovery_candidates`, `discovery_sources`: cost, evidence, coordinate precision and review state.
- `regulation_versions`, `regulations`: versioned rules with source and update date.
- `offline_regions`: version/checksum/URL metadata for downloadable tile packages.

`spots.location` is `geography(Point, 4326)`. Radius search uses `ST_DWithin`; returned straight-line metres use `ST_Distance`. Public results must satisfy publication state and RLS policy before spatial ranking.

## Coordinate rules

- `EXACT`: evidence resolves a point; may be eligible for display after verification rules.
- `APPROXIMATE`: stored with uncertainty radius and never rendered as an exact access point.
- `UNKNOWN`: candidate remains in discovery review and is not shown on the map.
- No name-only geocoder match is accepted when the result is an unrelated business.

## SQLite entities

`spots`, `favorites`, `gear_profiles`, `cached_conditions`, `offline_regions`, `catch_reports`, `user_spots`, `vehicle_location`, `settings`, `sync_queue`, and `sync_state` are created by numbered, transactional migrations. Server-shaped records retain `server_updated_at`; local edits retain `local_updated_at` and `sync_status`.

## Conflict policy

- Append-only reports/feedback: client UUID wins identity; duplicate idempotency key returns the first result.
- Favorites: last explicit client action wins, keyed by `(owner, spot)`.
- Shared community spot fields: server moderation wins; conflicting client changes become a new proposal.
- Private spots: owner last-write-wins by version, never merged into public records.
- Vehicle position and device settings: device-only, never synced.

