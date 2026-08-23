# Security and privacy baseline

- Secrets exist only in Supabase project secrets/CI secret storage; never under `EXPO_PUBLIC_*`.
- Anonymous Supabase guest IDs may read published spots and write only records scoped to their generated owner ID. Email OTP upgrades preserve that ID. Public/approximate spots and public catch reports require a permanent identity in both the Edge API and restrictive RLS policies.
- PostgreSQL RLS is enabled on every user-owned table. Private and approximate spots have separate policies and API projections.
- API accepts client location only in request memory for radius queries; logs round or omit coordinates.
- Catch/spot photo buckets are private, owner-path-scoped and limited to 10 MiB objects. The mobile picker re-encodes selected images as JPEG, removes EXIF metadata, stores durable local queue copies and uploads idempotent owner/entity paths. Server-side magic-byte content sniffing remains a production-hardening gate.
- Feedback is limited per user; discovery has daily/monthly circuit breakers. Gateway-level per-IP controls are a public-beta release gate.
- API code emits structured route/status/latency, cache outcome and external-service outcome logs, but never request bodies, authorization headers, email, precise coordinates, notes or photo metadata. Responses include an `x-request-id` for support correlation.
- External responses are schema-validated; OpenAI output is untrusted input.
- Safety copy never claims navigation, route access or sea safety.
