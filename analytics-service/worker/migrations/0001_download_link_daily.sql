CREATE TABLE IF NOT EXISTS download_link_daily (
  day_utc TEXT NOT NULL,
  repository TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  version TEXT NOT NULL,
  filename TEXT NOT NULL,
  product TEXT NOT NULL CHECK (product IN ('vision', 'quest')),
  platform TEXT NOT NULL CHECK (platform IN ('windows', 'mac', 'quest', 'other')),
  kind TEXT NOT NULL CHECK (kind IN ('package', 'auxiliary')),
  country TEXT NOT NULL CHECK (length(country) = 2),
  link_requests INTEGER NOT NULL DEFAULT 0 CHECK (link_requests >= 0),
  PRIMARY KEY (day_utc, repository, asset_id, country)
);
