CREATE TABLE IF NOT EXISTS download_link_hourly (
  hour_utc TEXT NOT NULL,
  repository TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  version TEXT NOT NULL,
  filename TEXT NOT NULL,
  product TEXT NOT NULL,
  platform TEXT NOT NULL,
  kind TEXT NOT NULL,
  country TEXT NOT NULL CHECK(length(country)=2),
  link_requests INTEGER NOT NULL DEFAULT 0 CHECK(link_requests>=0),
  PRIMARY KEY(hour_utc,repository,asset_id,country)
);
CREATE TABLE IF NOT EXISTS download_report_meta (
  key TEXT PRIMARY KEY, value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS download_github_snapshots (
  cutoff_utc TEXT NOT NULL,
  captured_at_utc TEXT NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('scheduled','baseline')),
  assets_json TEXT NOT NULL,
  PRIMARY KEY(cutoff_utc)
);
CREATE TABLE IF NOT EXISTS download_prepared_reports (
  cutoff_utc TEXT PRIMARY KEY,
  prepared_at_utc TEXT NOT NULL,
  report_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS page_view_daily (
  day_utc TEXT NOT NULL,
  product TEXT NOT NULL CHECK(product IN ('vision','quest')),
  country TEXT NOT NULL CHECK(length(country)=2),
  page_views INTEGER NOT NULL DEFAULT 0 CHECK(page_views>=0),
  PRIMARY KEY(day_utc,product,country)
);
CREATE TABLE IF NOT EXISTS page_view_hourly (
  hour_utc TEXT NOT NULL,
  product TEXT NOT NULL CHECK(product IN ('vision','quest')),
  country TEXT NOT NULL CHECK(length(country)=2),
  page_views INTEGER NOT NULL DEFAULT 0 CHECK(page_views>=0),
  PRIMARY KEY(hour_utc,product,country)
);
