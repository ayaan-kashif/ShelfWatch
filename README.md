# ShelfWatch

ShelfWatch helps people check product codes, inspect packaging evidence, and report concerns. Its protected brand workspace brings together scans, geographic risk signals, investigations, the trusted product registry, and community rewards.

Built with Next.js 16 App Router, React 19, TypeScript, Supabase PostgreSQL/Auth/Storage/Realtime, Prisma 7, PostGIS, ZXing, and Leaflet. The interface uses warm white/cobalt and navy dark themes, a public landing page, animated CSS 3D scanning artwork, responsive navigation and motion controls. Operational data comes from the database; the app contains no seeded products, scan results, rewards, or dashboard metrics.

**Project:** ShelfWatch MINE (`txsrjqirlcxgddkkwfdl`). **Local app:** [http://localhost:3001](http://localhost:3001).

## Start locally

Use Node.js 22 or later. Open the project directory, install its locked dependencies, generate the Prisma client, and start the app:

```powershell
npm ci
npm run db:generate
npm run dev
```

If `.env.local` does not already exist, create it from the template. Preserve any values already entered locally:

```powershell
if (-not (Test-Path -LiteralPath .env.local)) {
  Copy-Item -LiteralPath .env.example -Destination .env.local
}
```

Restart the development server after changing environment variables. Navigation and service setup states work before all services are connected. Sign-in needs the public Supabase settings; operational scans, rewards, and admin data need a working database connection. A setup error is displayed when a required service is missing.

## Environment configuration

Enter real values in `.env.local`; this file is ignored by Git. The template deliberately contains no credentials.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL used by Auth and browser clients. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe Supabase publishable key. |
| `DATABASE_URL` | Server-only PostgreSQL connection for Prisma. Use the project's connection settings and correct pooler/database credentials. |
| `DIRECT_URL` | Server-only session-pooler (5432) or direct connection used by Prisma migrations. |
| `SUPABASE_SECRET_KEY` | Full server-only `sb_secret_...` key for private Storage. A masked key cannot work. |
| `SUPABASE_STORAGE_BUCKET` | Private photo bucket; defaults to `shelfwatch-photos`. |
| `OPENAI_API_KEY` | Optional server-only key for paid packaging analysis. |
| `OPENAI_VISION_MODEL` | Explicit vision-capable Responses model identifier. No model is silently chosen. |
| `OPENAI_DAILY_ANALYSIS_LIMIT` | Global request ceiling per UTC day; default `50`, `0` pauses paid analysis. |
| `NEXT_PUBLIC_SITE_URL` | App origin, such as `http://localhost:3001`; set the HTTPS deployment origin in production. |

Only the two public Supabase settings and the app origin belong in browser configuration. Never add `NEXT_PUBLIC_` to a database password, Supabase secret key, or OpenAI key. The project now has local Supabase connection settings and a successful PostgreSQL connectivity probe. Inspect or update credentials privately without overwriting the existing environment file.

Supabase MCP authentication and application credentials are separate. A connected MCP server does not automatically configure Prisma or the private Storage client. Database TLS is configured in `src/lib/db-tls.ts`: every non-local connection (runtime and Prisma CLI) verifies the certificate chain and hostname against the Supabase Root 2021 CA in `certs/supabase-root-2021.crt`, and any `sslmode`/`sslaccept` in the URL is ignored so it cannot weaken this. Set `DATABASE_CA_CERT` / `DATABASE_CA_CERT_PATH` only for a different trusted chain; never disable verification. `npm run db:tls-check` reports whether each connection is encrypted and verified. Migration operations need a connection that permits DDL; do not assume every transaction pooler configuration is suitable.

## Database migrations and current project baseline

The repository contains:

- `202610050001_initial`: application tables, PostGIS/geography indexes, row-level security, points-ledger protection, a private photo bucket, and Realtime publication setup.
- `202610050002_fk_indexes`: covering indexes for `Scan.productId`, `AlertScan.scanId`, `Redemption.rewardId`, and `Redemption.userId`.
- `202610050003_private_migration_history`: RLS and revoked browser grants for Prisma internal metadata.

All three SQL migrations are applied, recorded in Prisma history, and verified up to date in ShelfWatch MINE. Details are tracked in [PROGRESS.md](PROGRESS.md). **Do not blindly run `npm run db:migrate` against a database whose SQL was already applied through MCP or the SQL editor.** PostgreSQL schema state and Prisma migration history are separate.

After verifying that the remote schema matches the initial migration **and that all four follow-up indexes exist**, record the already-applied migrations against the same project:

```powershell
npx prisma migrate resolve --applied 202610050001_initial
npx prisma migrate resolve --applied 202610050002_fk_indexes
npx prisma migrate resolve --applied 202610050003_private_migration_history
npx prisma migrate status
```

Run each `resolve` only for a migration confirmed to be applied remotely and absent from Prisma history. These commands reconcile history; they do not rerun the SQL. If the second migration is not present, apply and verify its reviewed SQL first. Once schema and history agree, `npm run db:migrate` deploys future migrations. For a new empty development database, review the migrations and target project before the first deployment.

Prisma's CLI reads `.env.local` and `.env`, using `DIRECT_URL` when present. Runtime uses `DATABASE_URL`. Keep `shelfwatch_private` outside Supabase's exposed Data API schemas. Browser roles have no direct mutation policies; the application API independently enforces ownership and administrator roles. The private bucket must remain private. Provision equivalent restrictions before using a different bucket name.

## First administrator

1. Create the intended owner's account through `/login`, complete email confirmation if required, and verify its identity in Supabase Auth.
2. With the application database connected, sign in and make a validated application request so the matching `public."User"` row is created.
3. In a trusted database administration tool, promote that account's **actual existing Auth UUID**. Replace the placeholder below; do not invent an ID or use display-name metadata as authorization.

```sql
UPDATE public."User"
SET role = 'SUPER_ADMIN'
WHERE id = 'YOUR_VERIFIED_EXISTING_AUTH_UUID'::uuid
RETURNING id, role;
```

An empty result means the application user row is absent or the UUID is incorrect; verify the account and sign-in step before continuing. Return to `/admin` after promotion. There is no public promotion endpoint.

`ADMIN` can inspect scans, maps, registry/configuration, and investigate alerts/reports. Product, issued-code, settings, and reward-catalog changes require `SUPER_ADMIN`. Both the server page layout and API protect admin access.

## Product workflows

**Consumer verification:** scan a code with the camera or enter it manually, optionally add its serial/batch, and choose whether to share location. Review the stored verdict and reason messages. Location denial does not block verification. Guests keep history within their private browser session; guest scans are not transferred into an account. Sign in before scanning to earn eligible points or submit packaging analysis.

**Packaging review:** a signed-in scan owner can submit one to three JPG/PNG/WebP photos under 5 MB each. Private brand reference photos and registered attributes support analysis. AI requires both `OPENAI_API_KEY` and `OPENAI_VISION_MODEL`. Its validated findings support investigation and cannot independently confirm a counterfeit. Analysis is limited to five attempts per user per hour, plus the atomic global UTC-day request ceiling. Failed provider attempts still consume that allowance. The request ceiling is not a currency spend limit; configure provider budgets separately. Provider failure preserves the original scan.

**Brand operations:** register real products, attach private reference images, import a CSV registry, and issue unique serials. CSV columns `gtin,name,brand` are required; `category` and pipe-separated `referenceImages` are optional. Imports support up to 500 rows / 1 MB and update matching barcodes. Review consented geographic patterns, investigate alert clusters, and confirm or dismiss consumer reports with reviewed evidence notes. Product removal archives its registry entry while preserving scan evidence.

**Evidence and rewards:** a registered barcode alone stays `UNKNOWN`. An active matching issued serial supports a qualified `GENUINE` result; this does not prove physical authenticity. Brand-confirmed revocation and reviewed report confirmation can produce counterfeit evidence. Repeating an unknown product does not make it counterfeit. Eligible points use a transactional ledger, repeated-code exclusion, UTC daily caps, and atomic redemption/stock updates. Configure a real reward catalog before consumers redeem points; admins fulfil or cancel redemptions from Configuration.

## Supabase, MCP, and deployment

Authenticated **21st.dev** and project-scoped **Supabase** MCP servers are already connected in Codex. Check `codex mcp list` or `/mcp` to inspect them. Their credentials are outside the repository. The official Supabase, Postgres best-practices, and Supabase Server skills are installed; UI/UX Pro Max guides the interface. Connection details are recorded in [docs/SUPABASE-SETUP.md](docs/SUPABASE-SETUP.md) and [docs/21ST-UI-NOTES.md](docs/21ST-UI-NOTES.md).

For deployment, configure the environment in the hosting platform, reconcile migrations, keep the photo bucket private, and use HTTPS. Configure Supabase Auth's Site URL, allowed redirects, email delivery, and asymmetric signing keys for JWKS token verification. Preserve private/no-store response headers through the CDN. Realtime needs the configured publication and authorized read policies; the admin UI also refreshes through foreground polling every 30 seconds, focus refresh, and manual refresh.

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

`npm start` serves the production build on port 3001. If the moved project folder prevents writing a TypeScript cache in a restricted shell, `npx tsc --noEmit --incremental false` performs the equivalent type check without that cache.

Local checks cover verification/reward policy, AI guardrails, input validation, geodesic behavior, CSV parsing, lint, and types. See [PROGRESS.md](PROGRESS.md) for current build/browser/live results. Real Auth email flow, camera/GPS behavior on phones, private signed URLs, live vision, concurrency, and reward success paths need configured services and real test records; they are distinct from local checks.

## Completion features (2026-10-22)

Each feature stays off, or shows a clear "not configured" state, until its settings exist. Variables are listed in `.env.example`.

- **Exports:** admins download CSV for scans (current filters), alerts, reports and redemptions from `/api/admin/export/<kind>`. Cells are quoted and formula prefixes neutralised, exports are rate limited and audited. "Print / PDF" uses a print stylesheet (browser "Save as PDF").
- **Reward fulfillment:** Configuration → Redemption requests. A super admin marks a pending redemption fulfilled, or cancels it. Cancelling appends a refund entry to the append-only ledger and restores stock in one locked transaction. A redemption can be resolved only once.
- **Scheduled maintenance:** `GET` or `POST /api/cron/maintenance` with `Authorization: Bearer $CRON_SECRET` (32+ characters). Run it daily from a scheduler, for example Vercel Cron, GitHub Actions or a server cron. It deletes scans older than `retentionDays` along with their packaging photos (never brand reference images). It also processes account-deletion requests: it deletes the Supabase Auth user, empties the profile name, deletes photos, and detaches scans from the person and their location (the append-only points ledger keeps an opaque id), then purges expired rate-limit rows. Each phase reports separately; any failure returns HTTP 207.
- **Alert notifications:** new or escalated cluster alerts are sent after commit to a signed webhook (`X-ShelfWatch-Signature: sha256=HMAC(secret, "<timestamp>.<body>")`, `X-ShelfWatch-Timestamp`) and/or email through Resend. Payloads carry no user, scan or serial data and round the location to about 100 m. Configuration → Alert notifications shows channel status and sends a test.
- **Installable app (PWA):** manifest, icons and `public/sw.js`. The service worker caches only hashed static assets and an offline page. API responses and verdicts are never cached.
- **Urdu:** the language button in every header sets the `shelfwatch-locale` cookie. The page then renders `lang="ur" dir="rtl"` in Noto Nastaliq Urdu with mirrored layout. Translations live in `src/lib/i18n/ur.ts`, keyed by the English text; anything missing falls back to English. The admin portal and server error details are still English. The translations were not written by a native speaker and need native review before launch.
- **Phone sign-in:** SMS one-time codes through Supabase Auth. Configure an SMS provider in Supabase first, then set `NEXT_PUBLIC_PHONE_AUTH_ENABLED=true`. Sends are limited to 3 per number per hour.
- **Bot protection:** with `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` set, sign-in, sign-up, password recovery and phone-code requests require a Cloudflare Turnstile token verified on the server.
- **WhatsApp bot:** run `npm run whatsapp` as a separate always-on process. On first start it prints a QR code, or a pairing code when `WHATSAPP_PAIRING_NUMBER` is set; link it from WhatsApp → Linked devices. People send a barcode (optionally a serial and batch) and receive the real verdict from the same engine and database, in English or Urdu. Other commands: `help`, `how`, `privacy`. Only direct chats are answered. Senders are stored as salted hashes (`WHATSAPP_HASH_SALT`), there is no location and no points, and each sender is limited to 20 checks per hour. **Baileys is an unofficial WhatsApp Web client: WhatsApp may ban the linked number, so use a dedicated number.** The session keys in `whatsapp/.auth/` are secret and git-ignored. The official WhatsApp Cloud API is the ban-safe alternative.
- **Database TLS:** see "Environment configuration" above. `npm run db:tls-check` verifies the connection.

## Remaining rollout work

Before production rollout, validate two-user/two-guest isolation, signed URL expiry, real JWT/RLS access, session refresh/revocation, concurrent points/redemption/alert behavior, backup/restore, and mobile HTTPS performance. Tune abuse controls and rate-limit cleanup; guests can reset their cookie, so owner-scoped limits alone are not a complete anti-bot defense.

The implementation plan and continued work log are [PLAN.md](PLAN.md) and [PROGRESS.md](PROGRESS.md). Detailed component and backend behavior is recorded in [docs/BACKEND.md](docs/BACKEND.md), [docs/CONSUMER-UI.md](docs/CONSUMER-UI.md), and [docs/ADMIN-UI.md](docs/ADMIN-UI.md).


## Redesigned public and account experience

- `/`: public landing page with animated 3D product illustration, scroll reveals, product explanation, brand section, FAQs and scan calls to action.
- `/dashboard`: personal overview; `/scan`: guest or signed-in product verification.
- `/login`: Supabase sign-in; `?mode=signup`: create account; `?mode=forgot`: recovery email; `?mode=reset`: update password after a valid recovery link.
- Light/dark toggle appears on public and application headers, persists locally, and applies before hydration. Pause controls and device/browser reduced-motion preferences are respected.
- Supabase Auth needs the app callback URL in its redirect allowlist and configured email delivery. Email-link success has not been tested with a real inbox.

Checks: `node scripts/design-check.mjs` (Edge on Windows), `node scripts/browser-smoke.mjs`, and the rollback-only database script documented in `docs/BACKEND.md`. Screenshots and result JSON are ignored under `test-results/`.
