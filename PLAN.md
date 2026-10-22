# ShelfWatch implementation plan

Created: 2026-10-05. Source: the supplied ShelfWatch PRD. This plan is written before application implementation.

## Outcome

A mobile-first consumer verification app and protected brand monitoring portal, built with Next.js App Router, React, TypeScript, Supabase PostgreSQL/Auth/Storage/Realtime, Prisma, and PostGIS. Every operational record must come from the database. Empty states and service-unavailable responses are deliberate; there will be no fabricated products, results, metrics, map points, or rewards.

Supabase is now connected; AI provider settings are still needed for live packaging analysis. Local development, navigation, visual design, permission flows, and unavailable-service handling must work without them. Live integration acceptance remains pending until those services are connected.

## Product and visual decisions

- Consumer navigation: Overview, Scan product, Scan history, Rewards, How it works, Settings. Separate Admin portal.
- Dark charcoal canvas, mint accent, frosted surfaces, fine borders, restrained violet secondary details, large geometric typography, generous whitespace.
- A custom CSS 3D scanning object, soft lighting, scan sweep, entrance animation, tactile controls, and reduced-motion support. The object is an illustration, never a product result.
- UI/UX Pro Max guides accessibility, layout, glassmorphism, and responsive behavior. Configure 21st.dev MCP and consult its components where available.
- Desktop sidebar and responsive mobile navigation. All controls keyboard accessible and primary touch targets at least 44px.
- Barcode registry matching alone cannot prove authenticity. A valid, issued unique code can support a genuine verdict; an unknown barcode must remain UNKNOWN; packaging AI cannot independently declare COUNTERFEIT.

## Implementation sequence

### 1. Foundation and design

- [x] Independent Next.js app in this folder; preserve the surrounding project.
- [x] TypeScript, lint, test and production build commands, environment template.
- [x] Persist design decisions; shared shell, components, states, motion and responsive tokens.
- [x] Configure and verify 21st.dev MCP using a persisted Windows user environment variable; never store the key in source control.
- [x] Supabase server/browser clients, validated session handling, protected admin access.

### 2. Database and verification

- [x] Prisma models for users, products, issued codes, scans, analyses, alerts, alert members, points ledger, reward catalog, redemptions, settings and audit events.
- [x] SQL migration with PostGIS, row-level security, private storage policy and realtime publication setup.
- [x] Input validation and server-only credentials; explicit unavailable state when configuration is absent.
- [x] Verification engine combining registry, issued serial/batch, duplicate distance/velocity, and AI findings. Persist reasons and consent.
- [x] Serialize mutations that need reward/cluster uniqueness; enforce caps and repeated-code exclusion.

### 3. Consumer experience

- [x] Overview with prominent scanner entry and real history/reward summaries.
- [x] Camera barcode reader with manual fallback, serial field and clear permission errors.
- [x] Optional location consent; denial never prevents verification.
- [x] Verdict detail and explanation; user report action.
- [x] Packaging photo upload (1–3), progress/error handling, private storage, structured AI output.
- [x] Database scan history, rewards catalog/ledger/redemption, account/profile and authentication.
- [x] Explanatory page with truthful signal descriptions and privacy disclosure.

### 4. Admin monitoring

- [x] Server-guarded dashboard, filters, feed and scan details.
- [x] Leaflet heat layer from located database records, with an honest empty state and OpenStreetMap attribution.
- [x] Cluster alerts with configurable count/radius/time, unique open-cluster handling, status/notes/assignee updates.
- [x] Registry create/update/archive, CSV import and issued-code management.
- [x] Aggregate analytics, reward settings/catalog, retention and threshold controls.
- [x] Supabase Realtime refresh with polling fallback and clear connection status.

### 5. Verification and handoff

- [x] Meaningful tests for verdict honesty, serial mismatch, copied codes, AI guardrails, rewards and validation.
- [x] Type check, lint, production build; review server authorization, input validation and secret boundaries.
- [x] Browser checks on desktop/mobile; test navigation, manual entry, missing credentials, permission/error paths, reduced motion and keyboard focus.
- [x] README: local setup, database migration, private storage, first admin promotion, AI settings, realtime and deployment.
- [x] Update PROGRESS.md with completed work, tests, unresolved limitations and exact next steps.

## API contract

All endpoints return JSON. Errors use `{ error: string, code?: string }` with appropriate HTTP status. Success data uses camelCase. Unconfigured services return 503 and `SETUP_REQUIRED`; they never masquerade as an empty live database.

- `GET /api/overview`: `{ totalScans, genuineScans, flaggedScans, pointsBalance, recentScans, user }`; scoped to the current consumer. Guests receive no fabricated history.
- `POST /api/scan`: `{ gtin, serial?, batch?, location?: { lat, lng, accuracyM? }, locationConsent: boolean }` → `{ scan, pointsEarned }`.
- `GET /api/history`: `{ scans }`; personal history only.
- `GET /api/scan/:id`: `{ scan }`; owner/admin only, guest session ownership required.
- `POST /api/scan/:id/analyze`: multipart photos → persisted analysis and updated scan.
- `POST /api/scan/:id/report`: `{ reason }` → saved report.
- `GET /api/rewards`: `{ items, transactions, pointsBalance, tier }`; catalog is database backed.
- `POST /api/rewards/redeem`: `{ rewardId }` → redemption.
- `GET/POST /api/auth/...`: server session, sign in, sign up, sign out.
- `GET /api/scans`, `GET /api/heatmap`, `GET /api/alerts`, `PATCH /api/alerts/:id`: admin only.
- `/api/admin/products`, `/api/admin/products/:id`, `/api/admin/products/import`, `/api/admin/codes`, `/api/admin/settings`, `/api/admin/rewards`: role-protected management.

## Deferred rollout work / external dependencies

- Database migrations, private bucket, Realtime publication and application Supabase connections are complete. Auth email delivery/redirect settings and AI API key/model still require live acceptance.
- Email/webhook alert delivery, Urdu translation, PDF exports and offline PWA caching are follow-on work after the core flows; no implied completion.
- Camera/GPS and under-five-second performance targets require real mobile-device validation over HTTPS.
- Production rollout needs retention/deletion job scheduling, distributed rate limiting, security review, backup/restore rehearsal and concurrent-load testing.
- The PRD demo claims that repeated unknown barcodes become counterfeit. Implementation will instead require evidence: unknown product scans alone will not produce a fabricated counterfeit verdict.

## Accepted UI correction

The user rejected the original dark mint interface. Revised the design to warm white/cobalt and navy dark mode. Added a public landing page at /, moved the consumer overview to /dashboard, redesigned the account experience, added password recovery, and replaced the original artwork with larger visible CSS 3D motion, orbital movement, scanning light, pointer parallax and scroll reveal. Updated MASTER.md and browser verification scripts.

## 6. Completion phase (2026-10-22)

Security first, then the remaining PRD features one at a time. Each feature ships with tests, an explicit unavailable state when its external service is not configured, and a PROGRESS.md entry. Secrets (OpenAI, email, SMS, Turnstile, cron) are entered by the owner in `.env.local`/hosting secrets only; the agent never retrieves them from accounts or browsers.

- [x] 6.0 Security: Next 16.4.2, Prisma 7.10.1 (production audit: 0 vulnerabilities; remaining `braces` advisory is ESLint-only with no fixed release). Verified database TLS against the Supabase Root 2021 CA for runtime and migrations.
- [x] 6.1 Admin exports: CSV for scans, alerts, reports and redemptions (formula-injection safe, filter-aware, admin only, audited). PDF via a print-optimised report view (browser "Save as PDF"), no new server dependency.
- [x] 6.2 Reward fulfillment: admin redemption queue; PENDING → FULFILLED or CANCELLED. Cancel refunds points through a new append-only ledger entry and restores stock, idempotently, in one locked transaction.
- [x] 6.3 Maintenance job: `POST /api/cron/maintenance` protected by `CRON_SECRET`. Deletes scans past `retentionDays` with their private photos, processes account deletion requests (removes the Supabase Auth user, clears profile name, detaches scans and their location; the append-only points ledger stays keyed to an opaque id), and purges expired rate-limit rows.
- [x] 6.4 Alert notifications: when a cluster alert is created or escalates, send a signed webhook (`ALERT_WEBHOOK_URL`, HMAC `ALERT_WEBHOOK_SECRET`) and/or email (Resend: `RESEND_API_KEY`, `ALERT_EMAIL_FROM`, `ALERT_EMAIL_TO`) after commit. Delivery result is audited; unconfigured channels are reported as not configured.
- [x] 6.5 PWA: web manifest, icons, service worker that caches only the static app shell and an offline page. API responses and scan results are never cached.
- [x] 6.6 Urdu: English/Urdu switch persisted in a cookie, `lang`/`dir="rtl"` on the document, translated navigation, landing, consumer and account screens. Admin portal stays English initially.
- [x] 6.7 Phone sign-in (Supabase SMS OTP; needs an SMS provider configured in Supabase) and optional Cloudflare Turnstile on sign-up, sign-in and recovery (`TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`).
- [x] 6.8 WhatsApp chatbot (requested 2026-10-22): separate long-running worker using Baileys (unofficial WhatsApp Web protocol; the linked number can be banned, so use a dedicated number). Users send a barcode (optionally serial) and receive the real verification verdict from the same engine; also help text and how-it-works info. No location, no rewards, rate-limited per sender, sender numbers stored only as salted hashes. Designed so the transport can later move to the official WhatsApp Cloud API.
- [x] 6.9 Full verification: tests, typecheck, lint, build, browser checks; README/PROGRESS/FINAL-AUDIT updated.

Owner-only items that code cannot complete: current database connection string (the pooler currently answers "tenant/user not found"), OpenAI key/model, domain + hosting, SMTP, SMS provider, first admin account, real product/code/reward data, device and load testing.
