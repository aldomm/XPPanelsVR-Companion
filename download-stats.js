/* Aggregate release statistics only: no click tracking or visitor storage. */
(function () {
  "use strict";
  const api = "https://api.github.com/repos/aldomm/XPPanelsVR-Companion/releases";

  function summarize(releases) {
    if (!Array.isArray(releases)) throw new Error("Invalid release response");
    const seen = new Set();
    const rows = [];
    let total = 0;
    for (const release of releases) {
      if (release.draft || !release.published_at) continue;
      if (!Array.isArray(release.assets) || typeof release.tag_name !== "string") {
        throw new Error("Invalid release data");
      }
      const assets = [];
      for (const asset of release.assets) {
        if (asset.state !== "uploaded" ||
            !/^XPPanelsVR-Companion-.+\.pkg$/i.test(asset.name)) continue;
        if (!Number.isSafeInteger(asset.id) || asset.id <= 0 ||
            !Number.isSafeInteger(asset.download_count) || asset.download_count < 0) {
          throw new Error("Invalid download count");
        }
        if (seen.has(asset.id)) continue;
        seen.add(asset.id);
        assets.push({ id: asset.id, name: asset.name, downloads: asset.download_count });
        total += asset.download_count;
        if (!Number.isSafeInteger(total)) throw new Error("Download count overflow");
      }
      if (assets.length) rows.push({
        tag: release.tag_name,
        downloads: assets.reduce((sum, asset) => sum + asset.downloads, 0),
        assets
      });
    }
    return { total, releases: rows };
  }

  async function loadStats(fetcher = fetch) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const releases = [];
    try {
      for (let page = 1; page <= 20; page++) {
        const response = await fetcher(`${api}?per_page=100&page=${page}`, {
          signal: controller.signal,
          credentials: "omit",
          referrerPolicy: "no-referrer",
          cache: "no-cache",
          headers: { Accept: "application/vnd.github+json" }
        });
        if (!response.ok) throw new Error(`GitHub statistics unavailable (${response.status})`);
        const batch = await response.json();
        if (!Array.isArray(batch)) throw new Error("Invalid GitHub response");
        releases.push(...batch);
        if (batch.length < 100) {
          return { ...summarize(releases), fetchedAt: new Date().toISOString() };
        }
      }
      throw new Error("Too many release pages; refusing a partial total");
    } finally {
      clearTimeout(timer);
    }
  }

  async function update(root, loader = loadStats) {
    const total = root.querySelector("[data-total-downloads]");
    const current = root.querySelector("[data-release-downloads]");
    const status = root.querySelector("[data-download-status]");
    try {
      const stats = await loader();
      const release = stats.releases.find(row => row.tag === root.dataset.release);
      total.textContent = stats.total.toLocaleString("en-US");
      current.textContent = release ? release.downloads.toLocaleString("en-US") : "Unavailable";
      const checked = new Date(stats.fetchedAt).toLocaleString("en-GB", {
        timeZone: "UTC", dateStyle: "medium", timeStyle: "short"
      });
      status.textContent = `Checked ${checked} UTC.`;
    } catch {
      total.textContent = current.textContent = "Unavailable";
      status.textContent = "Statistics temporarily unavailable. Downloads still work.";
    } finally {
      root.setAttribute("aria-busy", "false");
    }
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { summarize, loadStats, update };
  }
  if (typeof document !== "undefined") {
    const root = document.querySelector("[data-download-stats]");
    if (root) update(root);
  }
})();
