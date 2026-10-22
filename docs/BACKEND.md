# ShelfWatch backend implementation



Updated 2026-10-05. This document describes implemented behavior, setup, and checks that still need live services. No product, scan, reward, map, or chart fixtures are loaded into the app.



## Local setup



Use Node.js 22 or later. Copy `.env.example` to `.env.local` and enter your own settings. Do not commit that file. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are browser-safe. `SUPABASE_SECRET_KEY`, `DATABASE_URL`, and `OPENAI_API_KEY` must remain server-only. Use the new `sb_secret_...` Supabase key for Storage; do not paste a masked key.



Supabase sign-in works with URL and publishable key alone. Database screens deliberately return HTTP 503 / `SETUP_REQUIRED` until `DATABASE_URL` is configured. A signed-in user without a database connection is treated as `CONSUMER`, never as an administrator.



The Prisma configuration loads `.env.local` and `.env` for CLI commands. Run `npm run db:generate`, then `npm run db:migrate` against the intended database, and `npm run dev`. Migration deployment requires the correct Supabase PostgreSQL connection and sufficient schema privileges. Configure your hosted connection's TLS settings as recommended by Supabase; never disable certificate verification. Use a pooler suited to your hosting environment, and a migration connection that permits DDL.



If SQL migrations have already been applied through Supabase MCP or its SQL editor, **do not run them a second time**. Verify the deployed schema matches each applied local migration, then record each one in Prisma history against the same project:



```powershell

npx prisma migrate resolve --applied 202610050001_initial

npx prisma migrate resolve --applied 202610050002_fk_indexes

npx prisma migrate status

```



Only mark the second migration applied after its four indexes exist remotely. Never mark an unapplied migration complete. This reconciliation creates Prisma history entries; it does not execute the schema SQL again. After history matches, `npm run db:migrate` can safely deploy future migrations. Applying SQL through Supabase and recording Prisma migration history are separate operations.



## Authentication and roles



`src/proxy.ts` refreshes Supabase cookies using `@supabase/ssr`. Server routes read the raw token from the session only to pass it into `verifyCredentials` from `@supabase/server/core`. Verification pins the issuer to the configured Supabase project and audience to `authenticated`. The fresh Auth user lookup confirms the account; user metadata supplies only an editable display name. Authorization reads the role from `User` in the database.



Use asymmetric Supabase Auth signing keys so the public JWKS endpoint can verify tokens. No embedded session user, submitted role, or user-editable metadata is accepted as an authorization source. Authenticated responses and refreshed cookie responses are private and uncached. Configure your CDN to honor these headers.



Guest scans use a server-generated, HttpOnly, SameSite cookie. Only its hash is stored. History, photos, reports, and scan details enforce ownership. Losing the guest cookie loses access to that guest history; guest scans are not silently transferred to accounts. Guests must sign in and create an owned scan before submitting paid packaging analysis. Guests cannot earn or redeem points.



Every admin endpoint checks roles. `ADMIN` can monitor scans and manage alert/report reviews. Registry, issued-code, settings, and reward-catalog writes require `SUPER_ADMIN`. After registering the intended owner and verifying their identity, promote their exact Auth UUID with a trusted database administration tool:



```sql

UPDATE public."User" SET role = 'SUPER_ADMIN' WHERE id = 'THE_VERIFIED_AUTH_USER_UUID'::uuid;

```



The user row is created upon a validated signed-in request when the database is connected. An empty update means that step has not happened. There is no public role-promotion endpoint.



## Database protection



The initial migration creates 15 application tables, row-level security, a PostGIS extension and geography indexes, an append-only points ledger trigger, a private photo bucket, and conditional Realtime publication membership. No catalog or operational records are seeded. The follow-up FK-index migration adds covering indexes for Scan.productId, AlertScan.scanId, Redemption.userId and Redemption.rewardId.



The RLS role lookup lives in the non-exposed `shelfwatch_private` schema with a fixed empty search path and constrained execution privileges. Keep that schema out of the Data API exposed schemas. Browser roles receive no direct mutation policies. Privileged Prisma connections bypass RLS, so every server operation also enforces authentication, ownership, and role checks. Direct authenticated reads are limited by owner/admin policies; unauthenticated users cannot list scans. Supabase may report informational “RLS enabled, no policy” findings for IssuedCode, Report, RewardClaim, Setting, AuditEvent and RateLimit: this is intentional. These six tables have browser grants revoked and are available only through authorized server code; adding permissive policies to silence that advisory would weaken access control.



The private bucket `shelfwatch-photos` denies direct anon/authenticated operations even if other broad Storage policies exist. Only authorized server routes use the secret client. Authorized scan-detail requests receive five-minute signed image URLs. Keep the bucket private. If changing `SUPABASE_STORAGE_BUCKET`, provision an equivalent private bucket and restrictive policy first.



## Verification and points



A registered GTIN alone returns `UNKNOWN` with a barcode-only explanation. A matching active unique issued serial supports `GENUINE`, with an explicit limitation that physical authenticity is not proven. Missing, inactive, mismatched-batch, distant, or unusually frequent codes raise suspicion. A brand code marked `REVOKED` means brand-confirmed counterfeit revocation; use `INACTIVE` for non-counterfeit suspensions. An administrator can confirm a report with evidence notes. Repeating an unknown product never makes it a confirmed counterfeit.



AI uses the configured OpenAI Responses vision model with structured output, validation, a bounded timeout, and `store:false`. It receives consumer photos plus private brand reference images and/or registry attributes. It cannot independently confirm a counterfeit, and low-confidence output is shown as needing review. No AI call happens without a key and explicit model. Paid analysis requires a signed-in scan owner, is limited to five attempts per user per hour, and reserves an atomic global database-backed request allowance before contacting the provider. `OPENAI_DAILY_ANALYSIS_LIMIT` defaults to 50 requests per UTC day; 0 pauses paid analysis. Failed provider attempts still consume allowance. This is a request ceiling, not a currency-denominated spend limit; responses also cap output at 2,000 tokens. An archived product cannot supply genuine-code evidence; registry status is rechecked inside the persistence transaction. JPG, PNG, and WebP files are checked by file signature and restricted to 1–3 images of at most 5 MB each. Reference upload paths are server-created. Provider failure leaves the original scan saved; failed persistence cleans up uploaded objects.



Scan mutations serialize by code so concurrent scans see consistent duplicate evidence. Points require an active issued code and a compatible batch. Suspicious location/velocity signals can still represent a useful submitted scan; a repeated user/code never earns points again. Daily caps use UTC days. User-row locks serialize all earning and redemption; database uniqueness protects reward claims and ledger event keys. Code identity uses a JSON tuple of GTIN and serial, preserving boundaries even when values contain separators. Balance is calculated from the ledger, not from a mutable counter. Reward stock is locked and decremented atomically with redemption and debit. Clients may provide UUID idempotency keys to make retries safe.



Packaging bonuses apply once to a scan with an eligible rewarded claim. A confirmed report can create a capped, once-per-user/code claim even if that scan did not originally earn points. Filing a report alone earns nothing. Tiers reflect current spendable balance: Explorer below 250, Scout from 250, Guardian from 1,000.



## Alerts, map and realtime



Eligible alert evidence is located, consented `COUNTERFEIT` or `SUSPICIOUS` with risk at least 80. The default policy is 5 eligible scans within 2 km and 24 hours, editable in settings. PostGIS uses meters with geography. A transaction advisory lock serializes cluster creation; membership is unique by alert and scan. Overlapping open alerts are merged into the oldest one, preserving scan membership; merged alerts are marked resolved with a link in notes. Resolved areas may create new alerts if eligible evidence still satisfies the current time window. Unknown and unlocated scans do not create clusters.



The admin heat map aggregates real coordinates to approximately 0.001-degree cells and weights by verdict. It returns `truncated:true` at the 10,000-scan limit. Analytics cover the latest 30 days, report truncation at 50,000 records, and contain only dates/regions with actual records. City is optional; reverse geocoding is not implemented. Missing city values are not invented.



Realtime publishes Scan, Alert and AlertScan changes and applies RLS to subscriptions. The UI can refresh through its polling fallback if Realtime is unavailable.



## API contract



JSON errors are `{ error, code }`. Responses use camelCase. Lists contain real records or an honest empty array only when connected successfully.



- `GET /api/auth/me` → `{user,configured}`; guest is HTTP 200 with `user:null`.

- `POST /api/auth/login`, `/signup` → email/password; signup also accepts name and returns `confirmationRequired` and message. `/logout` signs out. `/api/auth/callback` exchanges an email-confirmation PKCE code.

- `GET /api/overview` → totalScans, genuineScans, flaggedScans, pointsBalance, recentScans, user.

- `POST /api/scan` → `{gtin,serial?,batch?,locationConsent,location?:{lat,lng,accuracyM?},idempotencyKey?}`; returns `{scan,pointsEarned}`.

- `GET /api/history` → `{scans,total,page,pageSize}`. Search and verdict are filtered within the owner scope.

- `GET /api/scan/:id` → `{scan}` including product, reason objects, latest analysis and signed image URLs.

- `POST /api/scan/:id/analyze` → multipart `photos` (1–3); returns scan, analysis, pointsEarned.

- `POST /api/scan/:id/report` → `{reason}`; returns saved report.

- `GET /api/rewards` → items, transactions, pointsBalance, tier, redemptions. `POST /api/rewards/redeem` accepts rewardId and optional idempotencyKey.

- `PATCH /api/profile` → name. `POST /api/account/deletion-request` records a request for administrator handling; it does not instantly erase data.

- Admin `GET /api/scans` → paginated scans. Filters: search, verdict, productId, city, from, to, page, pageSize.

- Admin `GET /api/heatmap` → points `{lat,lng,weight}`, total, truncated.

- Admin `/api/alerts`, `/api/alerts/:id` → list, detail, and PATCH status/notes/assignee. Statuses are NEW, INVESTIGATING, RESOLVED.

- `/api/admin/overview`, `/analytics`, `/products`, `/codes`, `/settings`, `/rewards`, `/reports` implement protected monitoring and management. Product DELETE archives; reward DELETE deactivates. PATCH schemas omit defaults so changing one field preserves existing references, archive/active state, reward stock, and all other saved settings. Explicit empty arrays, null stock, or status changes are applied only when submitted.

- `/api/admin/products/import` accepts CSV in multipart `file` or JSON `{csv}`; columns gtin,name,brand are required. Optional category and pipe-separated referenceImages. Maximum 500 records / 1 MB. Validate before transactional upsert.

- `/api/admin/reference-images` accepts multipart photos and returns private paths to attach to a product.

- `PATCH /api/admin/reports/:id` accepts status CONFIRMED or DISMISSED and evidence notes. Confirmation updates the scan and reevaluates rewards and alerts.



## Validation and remaining rollout work



The local regression suite covers verdict honesty, active/revoked/unknown codes, mismatched batches, duplicate risk, AI guardrails, location consent and bounds, reward identity and eligibility, geodesic edge cases, and CSV quoting/malformed input. Backend TypeScript and lint checks pass as of this implementation. Live database, auth, storage, Realtime, and vision success paths require the configured services and should be reported separately from local checks.



Before production, verify concurrent cap/redemption/alert requests against PostgreSQL; owner/admin isolation using two users and two guests; RLS with real JWTs; session refresh, revocation and email confirmation; private signed URLs and expiry; failed AI retries; and real camera/GPS behavior on HTTPS. External integration performance targets are unverified.



Remaining rollout work: deploy a retention/deletion worker (the retention setting is stored but not scheduled), administrator processing of deletion requests, reward fulfillment, production rate-limit tuning and cleanup of expired RateLimit rows, trusted proxy/IP abuse controls for guests who clear cookies, SMTP configuration and auth redirect allowlist, optional phone auth, Urdu translations, exports, offline/PWA caching, and email/webhook alerts. A guest can reset its cookie, so the owner-scoped database rate limiter is not a complete anti-bot defense. No credentials, payments, notifications or deployments are fabricated.



Implementation references: [Supabase Next.js Auth](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [OpenAI image input](https://developers.openai.com/api/docs/guides/images-vision), [OpenAI structured output](https://developers.openai.com/api/docs/guides/structured-outputs). The installed `@supabase/server/docs/ssr-frameworks.md` defines the SSR composition used here.





## Optional live rollback-only integration check



Run explicitly against the intended configured project:



```powershell

node --conditions=react-server --import tsx --env-file=.env.local scripts/database-check.ts

```



The script exercises the real Prisma reward, redemption, and PostGIS alert functions inside one explicit transaction, throws a mandatory rollback sentinel, then verifies all fixture identifiers are absent. Its records are clearly marked as self-tests and are never committed. It checks duplicate earning exclusion, daily caps, bonus idempotency, stock and points debits, redemption idempotency, and five-scan alert membership deduplication. The script does not invoke Auth signup, Storage, or AI, and does not send notifications. It briefly holds normal application locks while running. This is a serial integration check, **not concurrent-load validation**. Do not describe it as passed until its actual run reports both passed assertions and verified rollback.


## Account recovery

POST /api/auth/reset-password validates the email and caps requests to five per address/hour, using a hashed rate-limit key. Supabase sends the link; no account-existence information is returned. The PKCE callback exchanges the code using the stored verifier, allows only the fixed /login?mode=reset recovery redirect, and otherwise goes to /dashboard. POST /api/auth/update-password requires a verified user session and validates the password before calling Supabase. Add the local/deployed callback URL to Supabase’s allowed redirect URLs. Email delivery and the full link exchange need an actual account and inbox; no test emails were sent. See [Supabase password authentication](https://supabase.com/docs/guides/auth/passwords).
