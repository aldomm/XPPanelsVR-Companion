# Anonymous download analytics — Workers Free + D1 Free

This replaces the previous email/private-download proposal. There is no visitor
account, email collection, registration, R2, Supabase, SMTP, purchased domain,
paid analytics, scheduled paid job or automatic upgrade. Files remain public,
unchanged GitHub Release assets. The two sites retain their approved appearance.

## Current status

Implementation and offline tests are ready. Both `analytics-config.js` files have
`enabled: false` and an empty endpoint. No tracking requests are sent in this state.
The owner has GitHub CLI access. Cloudflare previously showed a sign-in page; no
Worker or D1 has been created or activated. No billing or paid enrollment is needed
for the specified Workers Free/D1 Free design, and none is authorized.

**Smallest next action:** sign in to your Cloudflare account in Chrome at
<https://dash.cloudflare.com/> (or create a free account there), and leave its
dashboard available. Do not paste passwords, tokens or credentials into chat.
Before deployment, verify the selected account shows **Workers Free**, with no
paid Workers subscription. If any setup screen requires a payment method, paid
plan, billing enrollment or upgrade, stop there; do not accept it. An existing
paid account must not be used for this strictly zero-cost deployment.

The free `workers.dev` address is sufficient. No domain or DNS purchase is needed.
Cloudflare's getting-started prerequisites are an account and Node.js; Workers
Free is the default. Actual account state still needs verification after sign-in.

## What gets counted

The site's original GitHub `href` is never rewritten. A trusted primary, keyboard
or middle-click on a known release-asset link starts a small POST to `/event`
alongside the browser's normal navigation. The script does not prevent the default
click, await tracking, retry, proxy files, write browser storage or set cookies.
It uses `keepalive`, `credentials: omit` and no referrer. If JavaScript is disabled,
the endpoint is unconfigured, blocked, offline, slow or over quota, the original
download link still works. Events lost on navigation or failure are not recovered.

The Worker accepts one allow-listed immutable asset key, derives approximate
country from Cloudflare's edge metadata and increments a UTC daily aggregate.
D1 stores only day, repository, asset ID, version, filename, product, platform,
package/auxiliary kind, country and count. It stores no email, account identifier,
raw IP, user-agent, fingerprint, event timestamp or visitor identifier. User-agent
and purpose headers are inspected only to reject obvious automation. Request
logging and Logpush are disabled in this Worker configuration; Cloudflare and
GitHub may still process connection/security information under their own terms.

`HEAD`, `OPTIONS` and `GET` do not count. Obvious prefetch/prerender headers and
common crawler/preview user agents are ignored. This is not comprehensive bot
detection: the endpoint is public, headers can be forged, sophisticated bots and
repeat activations can inflate counts. Do not label these as human downloads.

Country covers accepted requests from instrumented website links only. Direct
GitHub links, context-menu downloads, other clients, disabled JavaScript and failed
tracking bypass it. VPNs/proxies may change the country. `ZZ` means unknown.
No location or historical country data is inferred from GitHub download counts.

## Separate metrics

1. **Website download-link requests**: D1 daily/file/country counts. These are
   accepted tracking requests associated with link activation, not completion.
2. **GitHub per-asset download_count totals**: GitHub's cumulative public counter,
   fetched privately by the report command. It includes traffic outside the site.

Neither guarantees completed transfers, installs, unique people or bot-free use.
Never add the two metrics or infer a conversion rate between them. Quotas or
outages can leave gaps. An unavailable metric is not displayed as zero.

Identity is `repository:GitHub asset ID`, with version/file metadata retained.
The catalog retains historical IDs if releases disappear. A replacement asset
with the same URL/name has a new ID and starts a separate series. Reports compare
only the same IDs, and flag new, missing or decreasing counters without inventing
deltas or subtracting repository totals. Refresh before publishing new downloads.

## Verified zero-cost limits (6 November 2026)

| Service on the Free account | Included/hard limit | At the limit |
| --- | --- | --- |
| Workers Free | 100,000 requests/day, 10 ms CPU/invocation | Cloudflare returns Error 1027 after the daily request limit. No upgrade is performed by this code. |
| D1 Free | 5 million rows read/day; 100,000 rows written/day | Queries fail until midnight UTC; data remains stored. No free-tier overage billing. |
| D1 Free storage | 500 MB per database; 5 GB per account | Further writes can fail until space is available; do not upgrade. |

Account-wide usage by other Workers/databases also consumes these limits. A query
can read/write more than one row because of indexes, so a click is not a guaranteed
one-unit billing metric. This is one atomic upsert per accepted event, no periodic
jobs. The owner report uses a bounded date range. If collection reaches a limit,
downloads continue directly from GitHub and collection resumes after reset; gaps
must be reported honestly. No upgrade or billing API exists in this implementation.

Sources: [Workers pricing/default Free](https://developers.cloudflare.com/workers/platform/pricing/),
[Workers daily limits](https://developers.cloudflare.com/workers/platform/limits/),
[D1 free-tier enforcement](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/),
[D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/),
[D1 storage limits](https://developers.cloudflare.com/d1/platform/limits/),
[D1 setup prerequisites](https://developers.cloudflare.com/d1/get-started/),
[workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/).

## Configure after owner sign-in

Do all commands from this `analytics-service` directory. Verify the account is
Workers Free first. Wrangler is Cloudflare's official CLI; browser login keeps
owner credentials out of the repository and public website.

```powershell
npx wrangler login
npx wrangler d1 create xppanels-download-analytics
```

Put the returned database ID into `worker/wrangler.toml`; IDs are not secrets.
Keep the account on Free. Then:

```powershell
npx wrangler d1 migrations apply xppanels-download-analytics --remote --config worker/wrangler.toml
npx wrangler deploy --config worker/wrangler.toml
```

No secrets are needed by the public Worker. It has no report/read endpoint, only
the event collector. D1 is accessible to the owner's Cloudflare account via the
dashboard or authenticated CLI, not to website visitors. Never put an owner API
token in `analytics-config.js`, GitHub Pages, a URL or a report.

Before enabling:

- Check actual Free-plan state and the deployed Worker/D1 bindings.
- Test a labeled test link from each product origin/path, and inspect the D1
  aggregate. Record the test traffic so it is not mistaken for new users.
- Confirm HEAD, preflight and prefetch are ignored; unknown assets/origins fail.
- Confirm downloads still work with the tracking host blocked or offline.
- Set the exact `https://WORKER.SUBDOMAIN.workers.dev/event` endpoint in both
  configs and enable them only together with the current privacy notice below.
- Deploy both sites and verify a real link event plus the private report.

The online test remains pending until an owner account is available. No claim of
active country collection is made by the current site privacy pages.

## Owner report/export

The private Cloudflare D1 console can run `report.sql` directly. It selects the
last 30 UTC days by default; edit its date bounds for another period. For a local
report through an authenticated Wrangler session:

```powershell
New-Item -ItemType Directory -Force reports | Out-Null
npx wrangler d1 execute xppanels-download-analytics --remote --config worker/wrangler.toml --file report.sql --json | Set-Content -Encoding utf8 reports/link-requests.json
node tools/report.mjs --d1 reports/link-requests.json
```

This writes a clearly labeled website country/day/file CSV and a separate
timestamped GitHub per-asset CSV/JSON snapshot plus summary JSON. No report is
published. `reports/`, credential files and Wrangler state are gitignored.
The existing authenticated `gh` CLI fetches only these public repositories.

For GitHub-only reporting now (country unavailable, not zero):

```powershell
node tools/report.mjs
```

For a later snapshot compared against an earlier immutable-ID baseline:

```powershell
node tools/report.mjs --d1 reports/link-requests.json --previous reports/github-TIMESTAMP.json
```

New/missing/decreased IDs are flagged in the CSV. Current published package totals
and auxiliary-file counts are explicitly distinguished. Records remain until
the owner chooses to delete them; no automatic retention period is promised.

## Refresh catalog and test

```powershell
node tools/refresh-catalog.mjs
node --test tests/analytics.test.mjs
```

Refresh retains existing enable/endpoint settings and historical identities; review
and deploy the Worker catalog and both website maps together after release changes.
The client script is shared byte-for-byte between the two site repositories.
Offline tests use Node's actual SQLite engine for the D1 schema/upsert and cover
event rejection, no personal fields, unknown country, quota failure, unchanged
direct-link behavior, browser request failures and GitHub discontinuities.

## Privacy paragraph to apply only on activation

Reading this site and downloading its files remain public; no email or account is
required. When you activate a download link, a small anonymous request to Cloudflare
counts the link request by UTC day, file/version, platform and approximate country.
The aggregate table stores no email, account identifier, raw IP, fingerprint or
tracking cookie. This counts link requests, not completed transfers, installations
or unique people. Repeated clicks and some bots may count; direct GitHub downloads
and failed tracking are not included. VPNs/proxies can affect country. GitHub
separately keeps its public release download totals. The owner can inspect the
aggregates privately; they remain until deleted. GitHub and Cloudflare may process
normal connection/security information under their own privacy terms. Optional
support remains aldoapps@gmail.com.

Provider notices: [GitHub](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement),
[Cloudflare](https://www.cloudflare.com/privacypolicy/).
