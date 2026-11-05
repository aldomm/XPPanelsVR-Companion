/* Public release download totals; no visitor tracking or local storage. */
(function () {
  'use strict';
  const api = 'https://api.github.com/repos/aldomm/XPPanelsVR-Companion/releases';

  function category(name) {
    if (typeof name !== 'string') return null;
    if (/^XPPanelsVisionProCompanion-.+windows.+\.exe$/i.test(name)) return 'windows';
    if (/^XPPanelsVR-Companion-.+\.pkg$/i.test(name)) return 'mac';
    return null;
  }

  function summarize(releases) {
    if (!Array.isArray(releases)) throw new Error('Invalid release response');
    const counts = { total: 0, windows: 0, mac: 0 };
    const seen = new Set();
    for (const release of releases) {
      if (!release || typeof release !== 'object') throw new Error('Invalid release');
      if (release.draft || !release.published_at) continue;
      if (!Array.isArray(release.assets)) throw new Error('Invalid assets');
      for (const asset of release.assets) {
        if (!asset || typeof asset !== 'object') throw new Error('Invalid asset');
        const kind = category(asset.name);
        if (asset.state !== 'uploaded' || !kind) continue;
        if (!Number.isSafeInteger(asset.id) || asset.id <= 0 ||
            !Number.isSafeInteger(asset.download_count) || asset.download_count < 0) {
          throw new Error('Invalid download count');
        }
        if (seen.has(asset.id)) continue;
        seen.add(asset.id);
        counts[kind] += asset.download_count;
        counts.total += asset.download_count;
        if (!Number.isSafeInteger(counts.total)) throw new Error('Download count overflow');
      }
    }
    return counts;
  }

  async function loadStats(fetcher = fetch) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const releases = [];
    try {
      for (let page = 1; page <= 20; page++) {
        const response = await fetcher(`${api}?per_page=100&page=${page}`, {
          signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer',
          cache: 'no-cache', headers: { Accept: 'application/vnd.github+json' }
        });
        if (!response.ok) throw new Error('GitHub statistics unavailable');
        const batch = await response.json();
        if (!Array.isArray(batch)) throw new Error('Invalid GitHub response');
        releases.push(...batch);
        if (batch.length < 100) return { ...summarize(releases), fetchedAt: new Date().toISOString() };
      }
      throw new Error('Refusing a partial download total');
    } finally {
      clearTimeout(timer);
    }
  }

  async function update(root, loader = loadStats) {
    const fields = Object.fromEntries(['total', 'windows', 'mac'].map(kind =>
      [kind, root.querySelector(`[data-downloads="${kind}"]`)]));
    const status = root.querySelector('[data-download-status]');
    try {
      const stats = await loader();
      for (const [kind, element] of Object.entries(fields)) element.textContent = stats[kind].toLocaleString('en-US');
      const checked = new Date(stats.fetchedAt).toLocaleString('en-GB', {
        timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short'
      });
      status.textContent = `Checked ${checked} UTC.`;
    } catch {
      for (const element of Object.values(fields)) element.textContent = 'Unavailable';
      status.textContent = 'Statistics temporarily unavailable. Downloads still work.';
    } finally {
      root.setAttribute('aria-busy', 'false');
    }
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { category, summarize, loadStats, update };
  if (typeof document !== 'undefined') {
    const root = document.querySelector('[data-download-stats]');
    if (root) update(root);
  }
})();
