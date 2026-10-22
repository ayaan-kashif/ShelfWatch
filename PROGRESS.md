# ShelfWatch work log

Updated: 2026-10-22 (Asia/Karachi).

## Current milestone

Core app and requested UI redesign implemented. Final audit found dependency-security and database-TLS blockers before public deployment. Local preview remains at http://localhost:3001. Project location: `C:\Users\AYAAN KASHIF\OneDrive\Desktop\ShelfWatch`.

## Completed

- Read the PRD and wrote PLAN.md before implementation. Maintain this log and the design-system master for continuation.
- Connected 21st.dev MCP and project-scoped Supabase MCP for ShelfWatch MINE (`txsrjqirlcxgddkkwfdl`). Installed and used UI/UX Pro Max plus official Supabase skills.
- Supabase application credentials verified. All three SQL migrations applied and recorded in Prisma history; `prisma migrate status` reports up to date. Runtime uses DATABASE_URL; migrations use the verified session pooler through DIRECT_URL.
- Fifteen application tables, PostGIS, private photo bucket, RLS, role/ownership guards, immutable points ledger and Realtime publication setup. Internal Prisma history also has RLS and revoked browser grants.
- Consumer camera/manual scanning, consent-based optional location, evidence-based verdicts, private packaging upload/analysis integration, reporting, history, rewards/redemption, profile and deletion requests.
- Supabase sign-in/signup, session refresh, protected admin access, password recovery email and authenticated password update. No emails sent during testing.
- Admin dashboard, live feed/detail, located heat map, cluster alert workflow, registry CRUD/CSV/reference photos, issued codes, analytics, reward catalog and policy controls.
- Corrected the PATCH validation bug so omitted product/settings/reward fields preserve saved values.

## UI correction requested by the user

The user rejected the original dark mint dashboard. Replaced that direction with warm white and cobalt, plus a navy dark mode across public and application screens.

- New public landing at `/`: editorial hero, animated 3D scanning artwork, explanatory steps, rewards/brand features, FAQs and clear calls to action.
- Consumer overview moved to `/dashboard`.
- Professional split-panel `/login`, create-account mode, forgotten-password and new-password screens.
- Persistent light/dark toggle on public navigation and workspace headers, applied before hydration.
- Visible CSS 3D movement, scanning light, orbiting details, floating cards, pointer parallax, scroll reveals and entrance transitions. Pause/play and reduced-motion behavior verified.
- Rebuilt navigation, improved contrast, updated scanner styling, responsive layouts and accessible keyboard drawer.
- Updated design-system MASTER.md, README.md and supporting docs. No illustrative artwork is presented as a real scan or verdict.

## Verified

- Full ESLint: no errors or warnings.
- TypeScript check and optimized production build: pass.
- Regression suite: 25 tests pass.
- Rollback-only live PostgreSQL checks: duplicate points excluded, daily cap enforced, bonus once, redemption debit/stock/idempotency, out-of-stock/insufficient-balance rejection, PostGIS five-scan cluster threshold and membership deduplication. All fixtures rolled back; zero fixture records remain. This is serial transaction verification, not a concurrency stress test.
- Production design browser checks: animation and pause/play, persisted theme reload, landing widths 375/768/1024/1440, account controls/password visibility, recovery validation and unauthenticated update rejection, themed app routes, reduced motion. No browser exceptions.
- Production application browser checks: real connected empty overview/history/rewards, malformed scan rejection, admin/reward access controls, camera unavailable fallback, cross-origin protection, 375px layout, keyboard focus trap and Escape restore. No horizontal overflow or browser exceptions.
- Reviewed screenshots in both themes, login/signup, dashboard and scanner. Screenshots/results live under ignored `test-results/`.
- Supabase security advisor reports only informational deliberately closed RLS tables; no remaining security ERROR/WARN findings. See docs/QA.md.

## Remaining live acceptance / rollout

- Configure OPENAI_API_KEY and explicit OPENAI_VISION_MODEL for live packaging AI; global daily and per-user hourly request ceilings are implemented.
- First owner registration/confirmation and exact-UUID admin promotion; real brand registry and physical product scans. No products, scans or rewards have been seeded.
- Real inbox confirmation/recovery delivery and Supabase callback redirect allowlist; real phone camera/GPS over HTTPS; signed-photo URL expiry; two-user/two-guest isolation and concurrent-load testing.
- Follow-on scope in PLAN.md: Urdu, exports, offline/PWA, email/webhook alerts, scheduled retention/deletion processing, reward fulfillment and deployment.

## Interruption and approval record

The folder was moved by the user; work continued at the new Desktop location. An account usage interruption and a later temporary approval-review capacity failure delayed work. The rejected edit did not execute; its approval retry subsequently succeeded. No unresolved approval block remains.

## Continuation rules

Use PLAN.md, this log and design-system/shelfwatch/MASTER.md. Preserve the new public landing and both themes. Keep secrets out of source and logs, operational data real, and access checks server-side. Update this file after each meaningful milestone.

## Final audit — 2026-10-06

Saved docs/FINAL-AUDIT.md. Existing Supabase credentials and private Storage access verified; all public tables have RLS. Actual data: zero Auth users/admins/products/issued codes/reward items, one guest scan. OpenAI key/model and explicit deployment origin absent. SMTP/redirect configuration and live email acceptance unverified. npm audit reports1critical/8high/1moderate affected dependency entries including the installed Next16.2.11 Windows RCE advisory. Runtime database connection is unencrypted; verified TLS fails with SELF_SIGNED_CERT_IN_CHAIN. These are launch blockers, not clean audit results. Dependency upgrades, CA trust/TLS configuration and remaining live acceptance are explicitly pending. No secret values or real data were changed during the audit.

## Completion phase — 2026-10-22

### Security blockers from the 2026-10-06 audit
- Upgraded Next 16.2.11 → 16.4.2 (fixes the Windows RCE and other advisories) and Prisma 7.9.0 → 7.10.1. `npm audit --omit=dev`: **0 vulnerabilities**. The remaining full-audit warning is `braces` (high, DoS), reached only through ESLint tooling; no fixed version exists yet.
- Database TLS: `src/lib/db-tls.ts` verifies the chain and hostname for every non-local connection (runtime and Prisma CLI) against the Supabase Root 2021 CA from Supabase's official download (`certs/supabase-root-2021.crt`, SHA-256 80:70:25:AD…CA:FA). `sslmode` in URLs cannot weaken it. Proven by test: the correct CA completes the handshake; a wrong CA fails with "self-signed certificate in certificate chain".
- **New blocker found:** both `DATABASE_URL` and `DIRECT_URL` now fail with `(ENOTFOUND) tenant/user postgres.txsrjqirlcxgddkkwfdl not found`. The same happens with the old unencrypted client, so TLS is not the cause. The project's Auth API is healthy (HTTP 200). The owner must copy fresh pooler connection strings from Supabase → Connect into `.env.local`, then run `npm run db:tls-check` and `npx prisma migrate status`. Live database checks were therefore not re-run in this phase.

### Features added (all unit-tested; each shows a clear "not configured" state until its settings exist)
- Admin CSV exports (scans, alerts, reports, redemptions) plus a print/PDF stylesheet.
- Reward fulfillment queue with refund-on-cancel through the append-only ledger. A rollback-only live check was added to `scripts/database-check.ts`.
- `/api/cron/maintenance`: retention deletion with photos, account-deletion processing, rate-limit purge (`CRON_SECRET`).
- Signed webhook and Resend email alert notifications after commit, plus an admin status and test panel.
- PWA: manifest, icons, shell-only service worker and an offline page.
- Urdu (RTL, Nastaliq) across the landing page, navigation, overview, scan, result, history, rewards, account, recovery and How it works pages, including verification-engine reasons. The admin portal stays English.
- Phone SMS sign-in (behind a flag) and optional Cloudflare Turnstile on auth endpoints.
- WhatsApp bot worker (`npm run whatsapp`, Baileys 7.0.0-rc14, pinned), using the real verification engine, salted sender hashes and Urdu/English replies. Never linked to a real WhatsApp account during development.
- Fixed duplicated "| ShelfWatch" in page titles. Updated the retention and account-deletion copy to describe the actual processing.

### Verified 2026-10-22
- 52/52 unit tests; `tsc` for the app and for the backend, scripts and bot; ESLint clean; production build clean (no tracing warnings).
- HTTP: admin export, redemptions and notifications return 401 when signed out; cron returns 503 without `CRON_SECRET`; cross-origin auth POST returns 403; invalid phone and code are rejected with 400; `sw.js` has no-store and CSP headers; manifest returns 200; the Urdu cookie produces `lang="ur" dir="rtl"`.
- Browser (production build): Urdu landing, scan and dashboard at 1280px and 375px; the drawer opens from the right with a focus trap; switching back to English works; no horizontal overflow at 320px on the landing, login and scan pages.
- Bot: modules load under the react-server condition, and it refuses to start without `WHATSAPP_HASH_SALT`.

### Not verified (needs owner settings or real devices)
- Anything that needs the database until the connection string is fixed: maintenance run, fulfillment, exports with data, the bot's verification replies.
- Real webhook/email delivery, SMS codes, Turnstile widget, WhatsApp linking, PWA install on a phone over HTTPS, native-speaker review of Urdu.

### Owner inputs still required
Fresh Supabase connection strings; OpenAI key and model; domain, hosting and `NEXT_PUBLIC_SITE_URL`; Supabase SMTP and redirect URLs; first admin account; real products, codes and rewards; `CRON_SECRET` and a daily scheduler. Optional: webhook/Resend settings, an SMS provider, Turnstile keys, `WHATSAPP_HASH_SALT` and a dedicated WhatsApp number.

### Database reconnected — 2026-10-22 (evening)
- The owner reset the database password and set the Transaction pooler (6543) and Session pooler (5432) strings. The password's symbols are now percent-encoded in `.env.local` (`#` breaks URLs).
- `npm run db:tls-check`: both connections are encrypted with TLS 1.3 and the certificate verified.
- All 3 migrations are applied (checked through the verified connection); this phase added no schema changes. Records: 1 Auth user, 1 app user, 0 admins, 0 products, 0 issued codes, 0 rewards, 2 scans.
- `scripts/database-check.ts` passed every check, including the new refund-on-cancel fulfillment check. The rollback was verified and 0 fixture records remain. Concurrency was not tested.
- The production app served `/api/overview`, `/api/rewards` and `/api/history` from the live database; admin export stayed 401 when signed out.
- Known issue: on Windows, the Prisma CLI (`prisma migrate status/deploy`) ignores `sslrootcert` and fails with P1011 (root not trusted). Either trust the Supabase root in the Windows current-user store (`certutil -user -addstore Root certs\supabase-root-2021.crt`, the owner's choice) or run migrations from Linux/CI. The app runtime is unaffected.
- The maintenance job was not run against live data: it permanently deletes data. Run it only after setting `CRON_SECRET` and reviewing `retentionDays`.
- First administrator: the only Auth account (confirmed email, created 2026-10-05) was promoted to SUPER_ADMIN by its exact UUID at the owner's request, with a `ROLE_PROMOTED` audit event. The app reads the role from `public."User"` on every request. The owner still needs to sign in and confirm that `/admin` opens.
