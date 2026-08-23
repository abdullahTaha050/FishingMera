# Security review — 23 August 2026

## Automated checks

- `npm audit` reports 0 critical, 0 high and 12 moderate findings after adding the SDK-recommended splash-screen plugin.
- All 12 findings trace to Expo's Node-side build/configuration chain: `@expo/config-plugins -> xcode@3.0.1 -> uuid@7.0.3`; the additional package is another path to the same advisory, not a new runtime vulnerability. The vulnerable UUID operation requires a caller-supplied buffer in name-based UUID generation; this code is not executed inside the shipped React Native application.
- npm's suggested “fix” downgrades Expo to 46 and MapLibre to 11.3.2. That is a breaking, incorrect remediation for the SDK 57 application, so it is intentionally not applied.
- Recheck on every Expo SDK/config-plugin release and upgrade as soon as Expo replaces the affected `xcode` dependency. Build only trusted branches and do not run prebuild/config plugins from untrusted pull requests with production secrets.

## Application boundary

- Mobile bundles contain only `EXPO_PUBLIC_*` configuration. Service-role and OpenAI keys remain Edge Function secrets.
- Exact private and approximate community coordinates are stored in `private_spot_locations`; public radius queries exclude private/unknown locations and see only the rounded approximate point.
- SQLite analytics uses an event allowlist and rejects latitude, longitude, coordinate or location property names.
- Sync writes require a Supabase JWT, validate payloads with Zod and use an owner-scoped idempotency ledger. Feedback is limited to five submissions per account per hour.
- Anonymous users can upgrade in place with email OTP. Public/approximate spots and public reports are rejected for anonymous identities by both the Edge API and restrictive RLS policies.
- Camera/library images are re-encoded to bounded JPEGs without EXIF, persisted in an offline queue and uploaded only to private owner-path buckets.
- AI discovery runs server-side, validates strict structured output, rejects coordinates without coordinate evidence, stores sources, and has daily/monthly circuit breakers.

## Residual release work

- Run pgTAP against a real local/CI Supabase stack; Docker was installed locally but its daemon was unavailable during this review.
- Perform OWASP MASVS-oriented checks on signed release binaries, including local database extraction, TLS interception, deep-link handling and screenshot/background privacy.
- Publish the drafted privacy notice with the owner's verified legal identity/contact details; decide whether a portable export is required for the final operating regions and legal basis.
- Add production abuse controls at the gateway (per-IP/user limits) before public community publishing is opened broadly.
- Add server-side magic-byte MIME sniffing and orphan-object cleanup for queued photo uploads.
