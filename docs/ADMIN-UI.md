# Admin workspace implementation

Updated: 2026-10-05 (Asia/Karachi).

## Implemented routes

- `/admin`: actual scan/product/alert counts, UTC day activity chart, recent scans, and investigation shortcuts.
- `/admin/scans`: product/barcode and verdict filters, inclusive date range in Pakistan Standard Time, pagination, and evidence links.
- `/admin/scans/[id]`: registered product context, verdict reasoning, consented location, and the latest packaging analysis findings.
- `/admin/map`: client-only Leaflet map with heat layer, verdict filters, real consented location points, and explicit empty/error states. Default view shows flagged scans. Base map attribution is preserved.
- `/admin/alerts`: alert status and investigation notes, expandable linked scan evidence, and consumer report review. Confirming a report requires reviewed notes and an explicit decision; the backend updates scan verdict/rewards/alerts atomically. Dismissal leaves the current scan verdict unchanged.
- `/admin/products`: product create/edit/archive/restore, CSV registry import, private reference photo upload and path attachment, issued serial list, serial issuance, revocation, and activation.
- `/admin/settings`: alert thresholds, reward rules, retention policy, and reward catalog create/edit/availability controls.

## Access and data behavior

The server admin layout checks `getPageActor()` and `requireAdmin()` before rendering any admin page. Missing database configuration shows a connection state; signed-out or unauthorized users see a sign-in/access state. The API independently enforces administrator access. Management controls are available to `SUPER_ADMIN`; ordinary administrators can review registry/configuration and update alerts/reports.

No production fixtures, seed products, or invented metrics are present. All panels fetch existing application API endpoints. Query changes hide old results until the current request settles, preventing old scan pages or map filters from appearing as current data.

Supabase Realtime table subscriptions trigger refetches when events are available and authorized. Foreground polling every 30 seconds, focus refresh, and manual refresh provide a fallback. Realtime requires the deployment's publication/RLS configuration; the UI does not claim a verified live connection.

Reference uploads accept one to three JPG/PNG/WebP files under 5 MB each and return private storage paths. A product can attach at most six paths. Uploading photos is separate from saving product changes; successful feedback makes this explicit. Server validation remains authoritative.

## Visual implementation

Applied the shared UI/UX Pro Max master: mint accents, dark readable data surfaces, restrained glass accents, rounded panels, and consistent Lucide icons. Responsive metric/form grids, horizontally contained evidence tables, explicit form labels, 44 px controls, keyboard focus, text status labels, and success/error feedback preserve usability. Metric entrance/hover and chart growth animations respect the app-wide motion controls and `prefers-reduced-motion`.

## Verification

- Scoped ESLint for `src/components/admin` and `src/app/admin`: passed.
- Whole-project TypeScript with `npx tsc --noEmit --incremental false`: passed. The nonincremental flag avoids writing a cache through the moved folder's restricted shell.
- Reviewed UI/API contract paths, roles, pagination, date boundaries, report status updates, private upload limits, and empty/error states.

Authenticated browser interaction against populated admin data has not yet been exercised: it requires a working application database connection and an approved administrator account. Schema setup/authentication are tracked separately by the project lead. This implementation performed no live database writes.

## Sources used

- Local UI/UX Pro Max skill and `design-system/shelfwatch/MASTER.md`.
- Installed Next.js layout and lazy-loading guides.
- [Supabase Realtime Postgres Changes documentation](https://supabase.com/docs/guides/realtime/postgres-changes).
