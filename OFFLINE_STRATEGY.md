# Offline strategy

## Bootstrap

The app bundle contains versioned Sakarya/Kocaeli seed spots, species, gear rules, regulations metadata, recommendation weights and a small coast/reference overlay. On first open, these are inserted into SQLite in one transaction before navigation becomes available.

## Reads

Screens read SQLite first. Network refreshes write a new coherent snapshot to SQLite, then update the UI. A failed refresh does not delete last-known data. Conditions show a Turkish age label computed from `fetchedAt`; stale data is never presented as current.

## Writes and sync

Every offline-capable mutation performs one SQLite transaction:

1. write/update the local entity;
2. append a `sync_queue` row with client UUID, operation kind, payload, entity version and idempotency key;
3. commit and update UI.

The sync worker runs at launch, foreground, network reconnection and manual retry. It claims due rows, sends batches, marks acknowledgements, and applies exponential backoff with jitter. Permanent validation/auth failures move to `blocked`; transient failures return to `pending`. Queue rows are never deleted before a server acknowledgement.

## Offline regions

MapLibre owns native tile resources. SQLite stores region id, style/package version, bounds, zoom range, byte estimate, checksum, download state and timestamps. A completed pack is usable after app restart. Partial/corrupt downloads remain visibly retryable and never replace a previous complete version.

## Compass

GPS and magnetometer readings are device-only. Bearing and Haversine distance use pure domain functions. Heading is smoothed with a circular moving average. Low sensor accuracy, sudden variance or unavailable magnetometer displays a calibration warning. The UI explicitly states that the arrow is straight-line guidance, not a safe route.

## Staleness labels

- under 15 minutes: `Az önce güncellendi`
- under 60 minutes: `N dakika önce güncellendi`
- under 24 hours: `N saat önce güncellendi`
- 24 hours or more: `N gün önce güncellendi — eski veri`
- no snapshot: `Güncel koşul verisi yok`

