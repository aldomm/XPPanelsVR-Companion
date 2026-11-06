# Anonymous website analytics and private daily report

The existing GitHub Pages sites keep public, direct GitHub download links. This
service uses the existing Workers Free + D1 database and a private Google Apps
Script sender. It needs no paid plan, purchased domain, local computer or AI runtime.

## Three separate metrics

- Download-link requests: accepted clicks on allow-listed immutable release asset
  IDs, grouped by product, platform, file/version, approximate country and UTC hour.
  Auxiliary files are counted by the collector but do not qualify report emails.
- Page views: landing-page loads for the Vision Pro and Quest sites, including their
  index.html addresses. Repeat document loads count again. Other pages are excluded.
  Counts include product, UTC hour and approximate country, with no visitor IDs.
- GitHub counters: cumulative counts for currently published EXE, PKG and APK assets.
  Their changes use matching immutable asset IDs and actual snapshot capture times.
  New, missing, replaced and decreased counters never receive an invented delta.

These metrics are never added together. They do not prove completed downloads,
installs, unique people or bot-free traffic. Country/hour detail applies only to
website events. GitHub has no country or exact download-time data in this report.

## Fixed windows and conditional email

The Cloudflare cron is `0 1 * * *`: 09:00 Asia/Hong_Kong. It prepares 24-hour,
7-day, 30-day and all-time sections. Rolling windows include their start and
exclude the fixed cutoff, regardless of later delivery. GitHub snapshots disclose
actual capture times because scheduled execution can be delayed.

A private Google Apps Script checks every five minutes and does network work only
09:00–10:59 HKT. It sends at most one report per cutoff to aldoapps@gmail.com, only
when the latest full 24-hour period has qualifying package-download activity.
Page views alone, or older 7/30-day/all-time activity alone, never trigger email.
Exact-minute delivery is not guaranteed. No test, quiet-day or failure email is
sent by this script. A send attempt is recorded before MailApp: ambiguous failure
is not retried automatically for that cutoff, to avoid duplicate mail.

Hourly download collection began 2026-11-06T15:44:07.354Z. The first fully covered
09:00-to-09:00 window is 7–8 November 2026 HKT. Longer windows stay marked partial
until enough history accumulates. Page-view start times are recorded separately
for each product in D1 metadata; no earlier page visits are reconstructed.

All-time download-link counts use preserved history since 6 November 2026. Daily
records before the cutoff's UTC date plus that date's completed hourly bucket are
counted once; hourly copies of prior daily records are not added again. Page-view
all-time totals use the same rule. GitHub all-time totals cover currently published
package assets only; deleted/replaced asset histories cannot be reconstructed.

## Privacy and failure behavior

The public `/event` and `/page-view` endpoints require the exact website origin,
small allow-listed event bodies and valid paths/assets. Obvious bots and prefetches
are ignored. HEAD/OPTIONS do not increment counters. This is best-effort filtering,
not proof of human traffic. Daily and hourly writes are atomic.

No cookie, storage identifier, raw IP, email, user-agent, fingerprint, referrer,
query string or individual event timestamp is stored in the event tables. Country
comes from Cloudflare's approximate edge metadata. Providers can still process
normal connection/security information. Optional Worker logs, traces and issues
remain disabled. Aggregate history remains until the owner chooses to remove it.

Both browser scripts are nonblocking. Tracking failures, disabled JavaScript,
outages and Free-plan limits can leave gaps but never prevent normal page use or
GitHub downloads. Page-view tracking guards against duplicate script execution in
one document and waits for prerender activation. The public privacy notices
explain collection and private aggregate email reports.

## Source and deployment

- `worker/src/index.mjs`: collector routing, authenticated report reader, cron.
- `worker/src/collector.mjs`: anonymous event validation and aggregate writes.
- `worker/src/report-core.mjs`: fixed windows and independent metric summaries.
- `worker/migrations/0002_hourly_owner_reports.sql`: additive report/page tables.
- `google-sender/Code.gs`, `appsscript.json`: private standalone Google sender.
- `worker/dashboard-worker.mjs`: generated single-file Dashboard deployment.

Run from this directory:

```powershell
node --test tests/analytics.test.mjs tests/report.test.mjs
node tools/build-dashboard-worker.mjs
node --check worker/dashboard-worker.mjs
```

Deploy through the existing Cloudflare Dashboard, retaining the ANALYTICS D1
binding and Free plan. Apply additive migrations before deploying the worker.
Never delete/reset existing counters or baseline records during an update.
`wrangler.toml` records the configuration; it does not authorize a CLI deployment.

Store the random report key only as Cloudflare secret OWNER_REPORT_KEY and private
Google Script Property OWNER_REPORT_KEY. The Google property OWNER_REPORT_URL is
https://xppanels-download-analytics.aldoapps.workers.dev/owner/report. Set
OWNER_CONFIRMED=true only under the owner's activation authorization, then run
activateDailyReports. It reuses an existing checkDailyReport trigger. Use the
existing private project; never publish it as a web app. The explicit Google
scopes permit send-mail, external fetch and trigger management, not inbox access.

The owner endpoint requires a bearer key, accepts only GET with no query string,
and serves the current prepared report. It exposes no arbitrary SQL or writes.
No secret belongs in GitHub, browser config, a URL, console output or screenshots.
Use previewDailyReport for a no-send integration check and pauseDailyReports to
pause sending while collection continues. LAST_STATUS and the cutoff markers in
private Script Properties explain sender outcomes.

## Owner counters and catalog maintenance

The existing signed-in Cloudflare D1 console provides the daily/hourly tables,
page-view tables, download_report_meta and download_prepared_reports. The old
report-dashboard.sql remains a read-only daily download-link export. Run
`node tools/report.mjs` for a separate fresh public GitHub counter snapshot;
private exports stay in ignored reports/. Do not turn a failed query into zero.

`node tools/refresh-catalog.mjs` retains historical immutable IDs and existing
endpoint settings. Review and deploy refreshed asset maps and the worker together
when releases change. Keep direct download URLs intact.

Official service references: [Cloudflare Free pricing](https://developers.cloudflare.com/workers/platform/pricing/),
[D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/),
[Google Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas),
[Google timer behavior](https://developers.google.com/apps-script/reference/script/clock-trigger-builder),
[MailApp send-only access](https://developers.google.com/apps-script/reference/mail/mail-app).
