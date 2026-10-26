# STATUS — ARC Review Tracker

Date: 2026-10-26
Owner: Asdale Dynamics, LLC (Dylan Asdale)
License: MIT — Copyright (c) 2026 Asdale Dynamics, LLC

## What was built

`index.html` — a complete, offline, zero-dependency, single-file web app (HTML + CSS + JS in one file, no build step) for authors managing advance reader copies over `file://`:

- **Reader list** with platform (Amazon, Goodreads, StoryGraph, BookBub, TikTok, Instagram, YouTube, podcast, blog, newsletter), handle/link and notes; add/edit/delete.
- **ARC tracker**: per copy — reader, book title, format, date sent, review due date; computed statuses (waiting, due soon within 3 days, due today, overdue) from pure date math; filters (active / needs nudges / posted / archived / all).
- **Friendly nudge system** — draft message per copy in four tone tiers (gentle heads-up 3 days out, due-date reminder, kind check-in within a week late, soft final check-in later). Copy-to-clipboard for manual sending anywhere. Nudge logs prevent repeat pings; archived copies never nag. Nothing is ever sent automatically — no network APIs, no scraping, no platform logins.
- **Review-completion history** — platform, posted date, optional rating/link/quote per review, on-time vs late marks, stats (total, on time, late, average rating), recent-activity strip on the dashboard.
- **Quote harvesting + blurb builder** — favorite lines auto-collected into a quote jar when marking reviews posted; manual quotes too; one-click stack into a working blurb (persists as you type) with attribution and copy button.
- **Thank-you drafts** — auto-drafted on review completion, editable inline, copy, mark-as-sent with history.
- **Backup tab** — JSON export (named download file by date), re-import (with confirmation), sample dataset loader, storage-usage display, defaults (author name, default book, default review window in days), full wipe with confirmation.
- Dark/light themes follow the OS; keyboard focus rings, aria-live toasts, reduced-motion support; warm, plain-English copy throughout.

Data model: single `localStorage` key `arcReviewTracker.v1` holding `{version, settings, readers, arcs, reviews, quotes, thanks}`. Deleting a reader or ARC cascades its reviews/quotes with confirmation.

Repository files: `index.html`, `tests/nudge-math.test.mjs`, `README.md`, `LICENSE`, `package.json` (test script only, zero dependencies), `.gitignore`, this `STATUS.md`.

## How to run it

- App: open `index.html` in any modern browser (double-click or a `file://` path). No server, no installs needed; `python3 -m http.server` works too if preferred.
- Tests: `node tests/nudge-math.test.mjs` (or `npm test`) — plain Node 18+, no packages to install.

## Verification results (2026-10-26)

All checks below were run in this workspace:

1. `node --check` on the inline script extracted from `index.html` — PASS.
2. Unit tests `node tests/nudge-math.test.mjs` — **23 passed, 0 failed**. Coverage: date parsing (valid, malformed, unpadded, impossible days/months, leap years), `addDays` (month/year/leap-year rollovers, negatives, zero, rejects bad input), `daysBetween` (same day, forward/backward, month/year boundaries, leap-year spans, rejects bad input), `todayISO` shape and reparse, `friendlyDate`/`shortestDate`, `nudgePlan` (state boundaries at 4/3/0 days and 7/8 days overdue, tier selection, first-nudge date across leap day, invalid handling), `needsNudge` (arc-status gating, window coverage, due-today, 7-day overdue cadence, malformed nudge-log tolerance), message assembly (name/book/due present in all four tiers, unknown tier, warm fallbacks), thank-you drafts, platform constants.
3. Real-browser smoke with headless Chrome over `file://`:
   - Empty-state render: dashboard date filled, 8 stat cards, "all caught up" nudge state, all tab empty states, footer credit, exactly one `<script>` tag — PASS, zero console errors.
   - Full-flow e2e driver (12/12 checks PASS): add reader → send ARC due in 2 days → nudge card appears on dashboard → log nudge → open "review posted" modal → save rating + quote → review recorded and ARC flips to posted → quote auto-harvested → thank-you draft auto-created → quote added to blurb → thanks marked sent → storage persisted → review history renders.
4. Static reference scan: every DOM id referenced by JavaScript exists in the markup; no calls to undefined identifiers (one missing helper, `getDb`, was found by the browser smoke and fixed before final verification).
5. Whole-file sanity sweeps: no leftover drafting artifacts, no secrets/keys/personal data in any file (sample data is fictional; author name field is user-entered).

## Known gaps / honest limitations

- Reminders are copy-and-send only. There is no email/social integration by design (no spam, no logins); the app never talks to the network.
- Ratings are optional and manually entered when marking a review posted; the app does not fetch or verify platform reviews.
- Backup export uses a browser download; if downloads are blocked the JSON path is manual (select-all on a live page is not provided).
- The nudge/thank-you templates are fixed strings with variable slots — they are not user-editable in-app yet (edit wording per draft after copy).
- Single-device story: data does not sync across browsers or devices except through the JSON backup file.
- E2E smoke tested the happy path in Chromium headless; Firefox/Safari were not exercised in this environment (standard APIs only: localStorage, `<dialog>`, blob download, clipboard with execCommand fallback).
- Nudge cadence constants (3-day window, 7-day re-check) are coded, not yet configurable.

## Relationship to sibling projects

- `kdp-sales-tracker-webapp`: sales/revenue numbers live there; this app owns the reader/review side of a launch.
- `free-author-printables-pack`: printable paper trackers pair well for offline planning.
