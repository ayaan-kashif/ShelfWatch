# ShelfWatch verification

Verified 2026-10-05. Target: ShelfWatch MINE (`txsrjqirlcxgddkkwfdl`).

## Local and production checks

`npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass. Twenty-five regression tests cover evidence honesty, code/reward identity, eligible codes, packaging limits, location validation, CSV parsing and preservation of omitted PATCH fields. The production server uses port 3001.

`node scripts/design-check.mjs` passes seven groups: actual moving CSS 3D transforms and pause controls, theme persistence, responsive landing, account controls, password recovery validation/access protection, themed application routes and reduced motion. No email is sent by these checks.

`node scripts/browser-smoke.mjs` passes ten groups covering connected database reads, input validation, protected APIs, camera failure, admin gates, cross-origin guards, desktop/mobile layout, keyboard drawer and uncaught-error checks. Both scripts use installed Microsoft Edge; screenshots and JSON are ignored in test-results.

## Database checks

All three migrations are applied and Prisma reports schema up to date. Fifteen application tables plus internal migration history have RLS. PostGIS is installed and shelfwatch-photos is private. Anonymous roles cannot read scans or Prisma history.

The documented rollback-only database script passes actual reward and PostGIS operations. It checks duplicate/capped earning, once-only bonus, stock/debit/redemption idempotency, rejection for no stock or funds, cluster creation and deduplicated membership. It deliberately rolls back all fixtures and verifies none remain. It does not prove simultaneous-request behavior.

## Advisor findings

The security advisor has no ERROR or WARN findings. Seven INFO entries say [RLS enabled with no policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy): AuditEvent, IssuedCode, RateLimit, Report, RewardClaim, Setting and internal Prisma history. Browser grants are revoked for these server-only tables; permissive policies are intentionally absent.

The four missing FK indexes were added in a separate migration. The last performance advisor check reported only [unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index), expected for a new empty project; required query/geography/FK indexes are retained.

## Unverified external acceptance

Actual sign-up confirmation and recovery inbox delivery, real authenticated admin workflows, AI provider success, private signed image expiry, real phone camera/location and concurrency/performance targets still require their own live acceptance. AI keys/model and owner promotion are described in README. No fake operational data or fake success response was used to replace these checks.

## Final security audit update — 2026-10-06

See FINAL-AUDIT.md. Database advisor findings remain informational, but npm reported a critical Next advisory plus other dependency findings. Runtime database TLS is not enabled and strict certificate verification currently fails. The previous functional passes do not imply production readiness.
