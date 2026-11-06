import { execFileSync } from 'node:child_process';

export const REPOSITORIES = ['aldomm/XPPanelsVR-Companion', 'aldomm/XPPanelsVR-Quest'];

export function kindFor(filename) {
  return /\.(exe|pkg|apk)$/i.test(filename) ? 'package' : 'auxiliary';
}

export function readReleases(repository) {
  const releases = [];
  for (let page = 1; page <= 20; page++) {
    const batch = JSON.parse(execFileSync('gh', ['api',
      `repos/${repository}/releases?per_page=100&page=${page}`], { encoding: 'utf8' }));
    if (!Array.isArray(batch)) throw new Error('Invalid GitHub release response');
    releases.push(...batch);
    if (batch.length < 100) return releases.filter(r => !r.draft && r.published_at);
  }
  throw new Error('Refusing a partial GitHub release inventory');
}

export function snapshotAssets() {
  return REPOSITORIES.flatMap(repository => readReleases(repository).flatMap(release =>
    release.assets.filter(a => a.state === 'uploaded').map(a => {
      if (!Number.isSafeInteger(a.id) || a.id <= 0 ||
          !Number.isSafeInteger(a.download_count) || a.download_count < 0) throw new Error('Invalid asset count');
      const platform = /\.apk$/i.test(a.name) ? 'quest' : /\.pkg$/i.test(a.name) ? 'mac' :
        /windows|\.exe$|signing\.cer/i.test(a.name) ? 'windows' : 'other';
      return {
        key: `${repository}:${a.id}`, repository, asset_id: String(a.id),
        version: release.tag_name, filename: a.name,
        product: repository.endsWith('-Quest') ? 'quest' : 'vision',
        platform, kind: kindFor(a.name), url: a.browser_download_url,
        bytes: a.size, sha256: a.digest || null, github_download_count: a.download_count,
      };
    })));
}

export function compareSnapshots(current, previous) {
  const before = new Map((previous?.assets || []).map(a => [a.key, a]));
  const now = new Map(current.assets.map(a => [a.key, a]));
  const rows = current.assets.map(a => {
    const prior = before.get(a.key);
    const delta = prior ? a.github_download_count - prior.github_download_count : null;
    return { ...a, status: !prior ? (previous ? 'new_asset' : 'baseline') : delta < 0 ? 'counter_decreased' : 'continuing',
      github_count_increase: delta !== null && delta >= 0 ? delta : null };
  });
  for (const old of before.values()) if (!now.has(old.key)) {
    rows.push({ ...old, github_download_count: null, github_count_increase: null, status: 'missing_asset' });
  }
  return rows;
}
