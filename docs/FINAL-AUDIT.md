# ShelfWatch final audit

Audited: 2026-10-06 (Asia/Karachi). Project: ShelfWatch MINE.

## Verdict

Core application and redesigned interface are implemented and work locally. Not ready for public deployment. Passing functional tests and database RLS checks do not establish dependency security or complete production acceptance.

## Verified now

- Supabase URL/publishable key, DATABASE_URL, DIRECT_URL and full secret key are present and not placeholders. No credential values were printed.
- Database connection works; all three migrations are recorded. Every public table has RLS.
- Full secret key successfully reads private bucket metadata; shelfwatch-photos is private.
- Auth JWKS responds with one ES256 public signing key.
- Landing, login and overview return HTTP200; anonymous registry access returns401. Overview response is private/no-store.
- Supabase security advisor returns no ERROR/WARN findings. Its seven INFO no-policy entries represent intentionally closed server-only tables. [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- Actual counts: zero Auth accounts, zero application users/admins, zero products, zero issued codes, zero reward items and one persisted guest scan. No records were removed.
- Earlier retained validation evidence: optimized build/types/lint passed,25 regression tests,17 browser-check groups and rollback-only reward/PostGIS integration checks. This audit did not rerun unchanged suites.

## Deployment blockers

1. Dependency audit reports10 affected entries:1critical,8high,1moderate. Next16.2.11 is affected by the [Windows server RCE advisory](https://github.com/advisories/GHSA-p293-qw3h-jr36) and other advisories listed in the saved npm JSON. npm suggests Next16.3.8; upgrade Next and its matching lint tooling, review transitive PostCSS/sharp and Prisma CLI dependencies, then rebuild and repeat affected checks. Do not use a blind forced downgrade of Prisma across major versions. Saved machine-readable report: ignored test-results/dependency-audit.json. This was a report-only dependency audit; packages were not upgraded.
2. The runtime PostgreSQL client connects without TLS. An explicit certificate-verified TLS probe fails with SELF_SIGNED_CERT_IN_CHAIN. Configure the correct trusted CA/system trust and verified TLS for runtime and migration connections. Do not solve this by disabling certificate verification. No additional database password is needed.
3. No first owner/admin account exists. Register/confirm the owner, verify their actual AuthUUID, then promote that database User to SUPER_ADMIN. Do not use invented UUIDs or editable metadata.
4. Trusted registry entries, issued unique codes, brand packaging references and a real reward catalog are absent. Registry/serial/AI/reward success needs these records.
5. OPENAI_API_KEY and OPENAI_VISION_MODEL are absent. Packaging analysis cannot call the provider until both are configured. The model is a configuration identifier, not a secret. Existing request ceilings remain in effect.
6. NEXT_PUBLIC_SITE_URL is absent; local routes use the request-origin fallback. Set the actual HTTPS deployment origin and configure Supabase SiteURL/callback allowlist.
7. SMTP configuration and real confirmation/recovery delivery have not been inspected or tested. For public email accounts, configure custom SMTP in Supabase if it is not already configured. Needed provider fields: host,port,username,password/provider SMTP token and sender identity. [Supabase SMTP requirements](https://supabase.com/docs/guides/auth/auth-smtp). No email was sent during this audit.

## Remaining testing and work

Live authenticated owner/admin workflows, two-user/two-guest isolation, signed-photo expiry, full email link exchanges, AI results with real brand references, phone camera/GPS overHTTPS, session revocation, concurrent rewards/cluster requests and performance targets require acceptance.

Not yet implemented: Urdu; CSV/PDF exports; offline/PWA support; email/webhook alerts; phone sign-in; scheduled retention and deletion processing; reward fulfillment workflow. Retention settings and deletion-request capture exist, but do not schedule deletion. Also finish anti-bot/IP controls, expired-rate-limit cleanup, backup/restore rehearsal and hosting deployment.

## Inputs needed from the owner

- Server-only OPENAI_API_KEY, entered privately in .env.local or hosting secrets.
- Explicit OPENAI_VISION_MODEL identifier.
- Final HTTPS application URL/domain and hosting choice.
- Custom SMTP settings if not already configured in Supabase, plus a verified sender.
- Intended owner account identity/verified AuthUUID after signup; no password needs to be shared.
- Genuine product/issued-code/reference packaging and reward catalog data.
- Trusted public CA certificate/system trust configuration if required by the actual database TLS chain; this is not a private key.

Existing Supabase credentials and21st.dev connection do not need to be supplied again. Maps require no paid map API key. Keep secret values out of chat, source files and audit reports.

## Update — 2026-10-22

- Blocker 1 (dependencies): **resolved for production dependencies.** Next 16.4.2 and Prisma 7.10.1 are installed, and `npm audit --omit=dev` reports 0 vulnerabilities. The ESLint-only `braces` advisory has no fixed release; it does not ship to the server.
- Blocker 2 (database TLS): **resolved in code and proven against the pooler** (verified chain and hostname; a wrong CA is rejected). See `src/lib/db-tls.ts`.
- **New blocker:** the Supabase pooler rejects the configured credentials (`tenant/user … not found`), with or without TLS. New connection strings are needed from the dashboard.
- Blockers 3–7 (owner/admin, real data, OpenAI, site URL, SMTP) are unchanged; they need owner input.
- Previously "not implemented" items are now implemented: Urdu, CSV/PDF exports, PWA/offline shell, email/webhook alerts, phone sign-in, scheduled retention/deletion, reward fulfillment, anti-bot (Turnstile) and rate-limit cleanup. A WhatsApp bot was also added at the owner's request. Each still needs live acceptance with real services; see PROGRESS.md.
