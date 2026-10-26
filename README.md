# ARC Review Tracker

An offline, zero-dependency web app for authors managing **advance reader copies (ARCs)**. It keeps a reader list with platforms, tracks ARC send and review-due dates, drafts gentle nudge reminders, remembers your review-completion history, harvests reader quotes for blurbs, and keeps thank-you notes ready to send. Everything lives in your browser's localStorage on your own device.

Built by **Asdale Dynamics, LLC** for Dylan Asdale's author-life toolkit. It complements **kdp-sales-tracker-webapp** (the sales numbers side of a launch) and **free-author-printables-pack** (paper trackers) — this app covers the people side: readers, copies, reviews, and gracias.

## What it does

- **Reader list with platforms** — name, platform (Amazon, Goodreads, StoryGraph, BookBub, TikTok, YouTube, blog, newsletter and more), handle or link, notes.
- **ARC send and due dates** — per copy: which reader, book title, format, date sent, review due date. Statuses compute themselves from the dates.
- **Friendly nudge reminders** — nudges start 3 days before a due date, then check in every 7 days while overdue. Each reminder runs through four tone tiers (gentle heads-up, due-date reminder, kind check-in, soft final check-in) so the message stays warm, not naggy.
- **Review-completion history** — every completed review with platform, date, optional rating and link, plus an on-time mark. Stats show total posted, on-time share and average rating.
- **Quote harvesting for blurbs** — when you mark a review posted, a favorite line drops into the quote jar automatically. Add quotes by hand too, then stack them into a working blurb with one click and copy it out.
- **Thank-you drafts** — a draft appears the moment a review is marked posted; edit wording freely, mark as sent, keep history.
- **Backup** — one-click JSON export and re-import, plus a small fictional sample dataset so you can see the whole flow immediately.

## How to run it

1. Download `index.html` (it is the whole app: markup, styles, logic in one file).
2. Open it in any modern browser — double-click the file, or paste its `file://` path in the address bar. Internet is never required.
3. Optionally serve it locally (`python3 -m http.server` in this folder, then visit `http://localhost:8000`) if you prefer, though nothing depends on it.

Zero installs, no build step, no dependencies. It works as a single file precisely so you can copy it to a laptop and open it from a thumb drive.

## How it stays polite (no scraping, logins or spam)

- There is no network connection of any kind: no scraping, no API logins, no cookies, no analytics.
- Nothing ever sends automatically. The app **drafts** a nudge or a thank-you; you copy it and send it yourself wherever you actually talk to that reader.
- Reminders are per-person and quiet by design: one heads-up before the due date, then a check-in every 7 days while overdue. Archiving a copy or noting a nudge stops the prompts without scolding anyone.
- Reviews are your own completion history, not imported platform data. You press "Review posted" when you happen to see one.

## Data and privacy

- All data is one JSON object in `localStorage` under the key `arcReviewTracker.v1`, on this device, in this browser. No accounts, no personal data collection by the app itself.
- Use **Backup** to export a JSON snapshot any time; the file is plain and readable, and re-imports anywhere (it replaces current in-browser data when imported).
- Clearing the data or switching browsers/devices means using the backup file — that is the whole portability story.
- Deleting a reader or ARC cascades its reviews and harvested quotes with a confirmation, so stray fragments are never left behind.

## The date-nudge math

- Dates are plain `YYYY-MM-DD` strings, parsed and offset in UTC so daylight-saving shifts can never skew a due date.
- `nudgePlan(due, today)` decides from pure day counts: *waiting* (more than 3 days out), *due soon* (within 3), *due today*, or *overdue*.
- A due-soon reminder counts as delivered if a nudge was logged on or after the first-nudge date (due minus 3); overdue check-ins re-arm 7 days after the last logged nudge.
- All of this is covered by `tests/nudge-math.test.mjs`.

## Tests

Run the test suite with Node (no packages needed):

```
node tests/nudge-math.test.mjs
```

or `npm test`. The suite covers the date helpers (`parseISODate`, `addDays`, `daysBetween`, `todayISO`) and the nudge engine (`nudgePlan`, `needsNudge`, message assembly) — 23 checks across month/year/leap-year rollovers, malformed dates, window boundaries and reminder cadence.

## Files

```
index.html        The app: markup, styles and logic in one file
tests/            Node test suite for the date-nudge math
LICENSE           MIT, Copyright (c) 2026 Asdale Dynamics, LLC
STATUS.md         Build status, verification results and known gaps
```

## License

MIT — see `LICENSE`. Copyright (c) 2026 Asdale Dynamics, LLC.
