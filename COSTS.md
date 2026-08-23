# Cost model

Checked against official pricing on 23 August 2026. Amounts are USD and must be rechecked before commercial launch.

| Service | MVP free allowance | Expected pilot usage | Overage / upgrade trigger |
| --- | --- | --- | --- |
| Supabase | $0; 500 MB DB, 1 GB storage, 5 GB egress, 50k MAU, 500k Edge calls | <5k MAU, <200 MB DB, <2 GB egress | Pro from $25/month when pause-free production or quotas are needed |
| Open-Meteo | Non-commercial/evaluation free API; 10k calls/day, no SLA | Cached by coordinate bucket and forecast hour; target <500/day | Commercial subscription required before commercial use |
| OpenAI web search | No free assumption | Default max 25 searches/day, hard $10/month app budget | Web search is $10/1,000 calls plus model tokens; discovery stops at budget, app continues |
| Map tiles | Self-hosted offline-permitted tiles | Two regional vector packs | Supabase egress limit first; migrate static packs to R2 if needed |
| GitHub Actions | Public repo/free allowance dependent | lint, types, unit tests, export validation | No paid runner assumed |
| EAS Build | Not required for local simulator/APK build | Local builds first | Account/quota required only for cloud builds/signing |

Sources: [Supabase billing](https://supabase.com/docs/guides/platform/billing-on-supabase), [Supabase pricing](https://supabase.com/pricing), [Open-Meteo pricing](https://open-meteo.com/en/pricing), [Cloudflare Workers/R2 pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Neon pricing](https://neon.com/pricing), [OpenAI API pricing](https://platform.openai.com/pricing).

## Cost controls

- Weather and marine cache key: rounded coordinate (0.05 degrees) + UTC forecast hour; six-hour soft TTL, twelve-hour stale-if-error.
- Discovery region key: H3/geohash-equivalent server grid + radius bucket + species; 30-day TTL unless explicitly refreshed.
- One discovery request per region at a time, idempotent job key and daily/monthly circuit breakers.
- Photo upload size/type limits and per-user rate limits.
- Existing data, offline packs and deterministic scoring never depend on a paid AI call.

