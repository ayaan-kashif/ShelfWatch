# ShelfWatch consumer UI

Updated 2026-10-05. Built in `C:\Users\AYAAN KASHIF\OneDrive\Desktop\ShelfWatch` against the shared design system and the current API contract. All data comes from the application API; no catalog, history, verdict, points, or account values are seeded into the interface.

## Completed routes

- `/scan`: a real, dynamically loaded ZXing camera reader plus manual barcode/code entry, optional serial and batch, and explicit optional location consent. Permission failures offer the manual path. Camera tracks are stopped when reading completes, verification begins/finishes, the user stops the camera, or the component unmounts. An in-flight startup is discarded safely when its generation becomes stale.
- `/scan/[id]`: privately retrieved verification details, product and code metadata, verdict with text, recorded reason messages, and the saved packaging review. The latest analysis uses `analysis` or `analyses[0]`, showing `authenticityScore` as visual similarity, `confidence` as review confidence, and the exact persisted `findings`; low-confidence status is explained.
- Verification result actions: one to three JPG/PNG/WebP packaging photos (5 MB each), preview cleanup, multipart upload, server errors, and a concern report with a meaningful minimum-length description. Photo observations are explicitly presented as supporting evidence rather than proof of physical authenticity. Packaging review requires an authenticated owner; `SIGN_IN_REQUIRED` displays a clear sign-in link returning to `/scan`, plus instructions to scan the item again because guest scans are not transferred into an account.
- `/history`: personal or guest-session scan history, server search/verdict filtering and real pagination, dated cards linking to details, plus honest loading/unavailable/empty states.
- `/rewards`: database-backed balance, tier, reward catalog, transaction ledger, and recorded redemptions. Redemption requires an explicit confirmation; unavailable/out-of-stock/insufficient-points actions are disabled. Reward errors remain visible and successful mutations reload live balances.
- `/login`: sign-in and account creation, show/hide password, email-confirmation handling, keyboard-accessible auth tabs, guest continuation, and safe internal `next` return routes. Absolute paths beginning `//`, backslashes, spaces, and ASCII control characters are rejected.
- `/settings`: live account state, name update, sign-out, admin portal for authorized role labels, recorded account-deletion request, privacy explanation and a browser-local decorative-motion preference. The motion preference uses `shelfwatch-motion`, the HTML `data-motion` attribute and the `shelfwatch-motion-change` event for integration with the shared shell.
- `/how-it-works`: code/registry/unique serial/packaging explanations, the four verdict meanings, opt-in location and private uploads, camera data handling, points constraints, and common questions.

## API and reliability details

- JSON errors are surfaced directly. `SETUP_REQUIRED` is a visible connection limitation rather than an empty live database. `SIGN_IN_REQUIRED`, `AUTH_REQUIRED`, `UNAUTHORIZED`, and 401 states point to sign-in.
- The scanner generates a UUID idempotency key for the entered code/serial/batch/consent signature and retains it across retries. Starting another scan resets both consent and the key.
- GPS denial or timeout continues verification without coordinates. The opt-in text explicitly explains sharing with brands/administrators for counterfeit monitoring.
- A registered barcode alone is never advertised as proof of authenticity. Unknown results explicitly do not mean counterfeit.
- Remote-data requests are abortable; changing a history page/filter hides stale results until the new request finishes. Service refreshes keep existing live data available.
- Inputs and camera controls are disabled during verification; photos cannot be changed during a packaging submission.

## Design and accessibility

Dark charcoal and mint follow `design-system/shelfwatch/MASTER.md`. Responsive panels, a purposeful camera viewfinder, frosted borders, restrained depth, and Lucide icons match the shared shell. The scanner is usable without camera or location access. Inputs have visible labels; verdicts include text, errors are announced, auth tabs support arrows/Home/End, and buttons use the shared 44 px touch-target style. Continuous decoration respects both the device reduced-motion setting and the saved browser preference. No fake product photographs, metrics, reviews or brand endorsements are shown.

## Verification completed

- Targeted ESLint for consumer components and all consumer routes: passed with no errors or warnings.
- Full project TypeScript check with incremental output disabled: passed.
- Local Next.js 16.2.11 client-boundary, page/async-params, and Image docs were read before final integration.

## Live acceptance still required

Root-agent browser QA and the production build cover the final integrated shell. Physical camera accuracy, GPS permission behavior on actual mobile devices, real account creation/email confirmation, private photo/AI review, successful live rewards/redemption, and multi-page live history require the corresponding configured services and real records. This file does not claim those live scenarios have passed.

