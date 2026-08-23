# Security and privacy baseline

- Secrets exist only in Supabase project secrets/CI secret storage; never under `EXPO_PUBLIC_*`.
- Anonymous guest IDs may read published spots and write only owner-scoped drafts. Public publishing and cloud reports require verified login.
- PostgreSQL RLS is enabled on every user-owned table. Private and approximate spots have separate policies and API projections.
- API accepts client location only in request memory for radius queries; logs round or omit coordinates.
- Uploads use signed paths, MIME sniffing, size limits and owner-scoped storage policies.
- Discovery, feedback and uploads have per-user/IP rate limits.
- Structured logs redact authorization headers, email, precise coordinates, notes and photo metadata.
- External responses are schema-validated; OpenAI output is untrusted input.
- Safety copy never claims navigation, route access or sea safety.

