# Security and privacy baseline

- Secrets exist only in Supabase project secrets/CI secret storage; never under `EXPO_PUBLIC_*`.
- Anonymous Supabase guest IDs may read published spots and write only records scoped to their generated owner ID. Verified-account gating for broad public community publishing is a release gate.
- PostgreSQL RLS is enabled on every user-owned table. Private and approximate spots have separate policies and API projections.
- API accepts client location only in request memory for radius queries; logs round or omit coordinates.
- The reserved photo bucket is private, owner-path-scoped and has MIME/size allowlists. Upload UI, EXIF stripping and content sniffing are not enabled in this MVP.
- Feedback is limited per user; discovery has daily/monthly circuit breakers. Gateway-level per-IP controls are a public-beta release gate.
- API code does not log request bodies, authorization headers, email, precise coordinates, notes or photo metadata.
- External responses are schema-validated; OpenAI output is untrusted input.
- Safety copy never claims navigation, route access or sea safety.
