const { test } = require("node:test");
const assert = require("node:assert/strict");
const { summarize, loadStats, update } = require("../download-stats.js");
const asset = (id, downloads, name = `XPPanelsVR-Companion-${id}.pkg`) =>
  ({ id, download_count: downloads, name, state: "uploaded" });
const release = (assets, overrides = {}) =>
  ({ tag_name: "v1", draft: false, published_at: "2026-10-15T00:00:00Z", assets, ...overrides });

test("counts only published Companion installers, including published previews", () => {
  const stats = summarize([
    release([asset(1, 2), asset(2, 7, "checksum.sha256"), asset(3, 9, "manifest.json"),
      asset(4, 4, "unrelated.pkg"), { ...asset(5, 9), state: "new" }], { prerelease: true }),
    release([asset(6, 20)], { draft: true }),
    release([asset(7, 30)], { published_at: null }),
    release([asset(8, 5)], { tag_name: "v2" })
  ]);
  assert.equal(stats.total, 7);
  assert.deepEqual(stats.releases.map(r => r.downloads), [2, 5]);
});
test("zero is valid and duplicate assets are counted once", () => {
  assert.equal(summarize([release([asset(1, 0)])]).total, 0);
  assert.equal(summarize([release([asset(1, 2)]), release([asset(1, 2)])]).total, 2);
});
test("malformed data does not become a plausible total", () => {
  for (const count of [undefined, null, -1, 1.5, "12", Infinity]) {
    assert.throws(() => summarize([release([asset(1, count)])]));
  }
  assert.throws(() => summarize({}));
  assert.throws(() => summarize([release(null)]));
  assert.throws(() => summarize([release([asset(1, Number.MAX_SAFE_INTEGER), asset(2, 1)])]));
});
test("paginates and sends neither credentials nor referrer", async () => {
  let calls = 0;
  const stats = await loadStats(async (url, options) => {
    calls++;
    assert.ok(url.endsWith(`page=${calls}`));
    assert.equal(options.credentials, "omit");
    assert.equal(options.referrerPolicy, "no-referrer");
    return { ok: true, json: async () => calls === 1
      ? Array.from({ length: 100 }, (_, i) => release([asset(i + 1, 1)]))
      : [release([asset(101, 3)])] };
  });
  assert.equal(calls, 2);
  assert.equal(stats.total, 103);
  assert.ok(Number.isFinite(Date.parse(stats.fetchedAt)));
});
test("rejects HTTP/rate-limit errors and invalid JSON shapes", async () => {
  await assert.rejects(loadStats(async () => ({ ok: false, status: 403 })));
  await assert.rejects(loadStats(async () => ({ ok: true, json: async () => ({ message: "error" }) })));
});
test("refuses a truncated result at the pagination limit", async () => {
  await assert.rejects(loadStats(async () => ({ ok: true, json: async () =>
    Array.from({ length: 100 }, () => release([])) })), /partial total/);
});
function root() {
  const fields = {};
  return { fields, dataset: { release: "v1" },
    querySelector: key => fields[key] ||= {},
    setAttribute: (key, value) => fields[key] = value };
}
test("renders verified counts with timestamp", async () => {
  const element = root();
  await update(element, async () => ({ ...summarize([release([asset(1, 2)])]), fetchedAt: "2026-10-15T04:00:00Z" }));
  assert.equal(element.fields["[data-total-downloads]"].textContent, "2");
  assert.equal(element.fields["[data-release-downloads]"].textContent, "2");
  assert.match(element.fields["[data-download-status]"].textContent, /UTC/);
  assert.equal(element.fields["aria-busy"], "false");
});
test("missing release and API failure display Unavailable, not zero", async () => {
  const element = root();
  await update(element, async () => ({ total: 0, releases: [], fetchedAt: "2026-10-15T04:00:00Z" }));
  assert.equal(element.fields["[data-release-downloads]"].textContent, "Unavailable");
  await update(element, async () => { throw new Error("network failure"); });
  assert.equal(element.fields["[data-total-downloads]"].textContent, "Unavailable");
  assert.equal(element.fields["aria-busy"], "false");
});
