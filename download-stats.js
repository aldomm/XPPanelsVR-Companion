/* Lifetime GitHub counts for the exact linked files. No tracking or persistent storage. */
(function () {
  'use strict';
  const repositories = new Set(['aldomm/XPPanelsVR-Companion', 'aldomm/XPPanelsVR-Quest']);

  function describeAsset(assetId, downloadUrl) {
    const id = Number(assetId), url = new URL(downloadUrl);
    const parts = url.pathname.split('/');
    const repository = parts.slice(1, 3).join('/');
    if (!Number.isSafeInteger(id) || id <= 0 || url.origin !== 'https://github.com' ||
        url.search || url.hash || url.username || url.password || !repositories.has(repository) ||
        parts.length !== 7 || parts[3] !== 'releases' || parts[4] !== 'download' ||
        !/\.(exe|pkg|apk)$/i.test(parts[6])) throw new Error('Invalid package link');
    return { id, url: url.href, name: decodeURIComponent(parts[6]),
      api: `https://api.github.com/repos/${repository}/releases/assets/${id}` };
  }

  function validateAsset(asset, expected) {
    if (!asset || asset.id !== expected.id || asset.state !== 'uploaded' ||
        asset.name !== expected.name || asset.browser_download_url !== expected.url ||
        !Number.isSafeInteger(asset.download_count) || asset.download_count < 0) {
      throw new Error('Package count unavailable');
    }
    return asset.download_count;
  }

  function createLoader(fetcher = fetch) {
    // Share each request (including failures) across repeated actions on this page.
    // Normal browser HTTP caching respects GitHub's freshness/ETag headers.
    const requests = new Map();
    return function load(assetId, downloadUrl) {
      const expected = describeAsset(assetId, downloadUrl);
      const key = expected.api + '|' + expected.url;
      if (!requests.has(key)) requests.set(key, (async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        try {
          const response = await fetcher(expected.api, {
            signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer',
            cache: 'default', headers: { Accept: 'application/vnd.github+json' }
          });
          // No retry loop on rate limits or outages; direct downloads remain independent.
          if (!response.ok) throw new Error('GitHub count unavailable');
          return { count: validateAsset(await response.json(), expected), checkedAt: new Date().toISOString() };
        } finally { clearTimeout(timer); }
      })());
      return requests.get(key);
    };
  }

  async function update(root, loader = createLoader()) {
    const fields = Array.from(root.querySelectorAll('[data-download-asset]'));
    await Promise.all(fields.map(async field => {
      field.setAttribute('aria-busy', 'true');
      try {
        const link = root.getElementById(field.getAttribute('data-download-link'));
        if (!link) throw new Error('Download link missing');
        const stats = await loader(field.getAttribute('data-download-asset'), link.href);
        field.textContent = `${stats.count.toLocaleString('en-US')} ${stats.count === 1 ? 'download' : 'downloads'} · GitHub`;
        field.title = `Lifetime GitHub downloads of this file. Checked ${stats.checkedAt.replace('T', ' ').slice(0, 16)} UTC.`;
      } catch {
        field.textContent = 'Downloads unavailable · GitHub';
        field.title = 'The lifetime GitHub count for this file is temporarily unavailable. The download still works.';
      } finally { field.setAttribute('aria-busy', 'false'); }
    }));
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { describeAsset, validateAsset, createLoader, update };
  if (typeof document !== 'undefined') update(document);
})();
