-- Owner-only D1 console / CLI. Never expose this through the public Worker.
-- Edit the UTC dates to the reporting period. A bounded period avoids full scans.
SELECT day_utc, repository, asset_id, version, filename, product, platform, kind,
       country, link_requests AS website_download_link_requests
FROM download_link_daily
WHERE day_utc >= date('now', '-30 days') AND day_utc <= date('now')
ORDER BY day_utc, repository, asset_id, country;
