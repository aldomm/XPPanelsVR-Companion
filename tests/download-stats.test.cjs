const { test } = require('node:test');
const assert = require('node:assert/strict');
const { summarize, loadStats, update } = require('../download-stats.js');
const windows = 'XPPanelsVisionProCompanion-2.0.0-build.5-windows-x64-SELF-SIGNED.exe';
const mac = 'XPPanelsVR-Companion-2.0-build3-preview.pkg';
const quest = 'XPPanelsVR-Quest-0.2.0-beta.2-trim-pointers-code20018-release.apk';
const asset = (id, count, name = windows) => ({ id, name, download_count: count, state: 'uploaded' });
const release = (assets, overrides = {}) => ({ assets, draft: false, published_at: '2026-11-05T00:00:00Z', ...overrides });

test('counts only product downloads and separates platforms across published releases', () => {
  const result = summarize([
    release([asset(1, 2), asset(2, 3, mac), asset(3, 5, quest), asset(4, 40, 'SHA256SUMS.txt'),
      asset(5, 50, 'release.json'), asset(6, 60, 'unrelated.apk')], { prerelease: true }),
    release([asset(7, 4)]), release([asset(8, 30)], { draft: true }),
    release([asset(9, 30)], { published_at: null }),
    release([{ ...asset(10, 50), state: 'new' }])
  ]);
  assert.deepEqual(result, { total: 9, windows: 6, mac: 3 });
});
test('zero is valid and duplicate asset IDs never inflate totals', () => {
  assert.equal(summarize([release([asset(1, 0)])]).total, 0);
  assert.equal(summarize([release([asset(1, 2)]), release([asset(1, 2)])]).total, 2);
});
test('invalid counts and overflow fail instead of producing plausible statistics', () => {
  for (const value of [undefined, null, -1, 1.5, '12', Infinity]) {
    assert.throws(() => summarize([release([asset(1, value)])]));
  }
  for (const value of [{}, [null], [release(null)], [release([null])]]) assert.throws(() => summarize(value));
  assert.throws(() => summarize([release([asset(1, Number.MAX_SAFE_INTEGER), asset(2, 1)])]));
});
test('loads all pages without credentials, referrer or cookie tracking', async () => {
  let calls = 0;
  const result = await loadStats(async (url, options) => {
    calls++;
    assert.ok(url.endsWith(`page=${calls}`));
    assert.equal(options.credentials, 'omit');
    assert.equal(options.referrerPolicy, 'no-referrer');
    return { ok: true, json: async () => calls === 1
      ? Array.from({ length: 100 }, (_, i) => release([asset(i + 1, 1)]))
      : [release([asset(101, 3, mac)])] };
  });
  assert.equal(calls, 2);
  assert.equal(result.total, 103);
  assert.equal(result.mac, 3);
});
test('network/rate-limit/invalid responses fail cleanly', async () => {
  await assert.rejects(loadStats(async () => { throw new Error('offline'); }));
  await assert.rejects(loadStats(async () => ({ ok: false, status: 403 })));
  await assert.rejects(loadStats(async () => ({ ok: true, json: async () => ({ message: 'error' }) })));
});
test('pagination limit refuses a partial total', async () => {
  await assert.rejects(loadStats(async () => ({ ok: true,
    json: async () => Array.from({ length: 100 }, () => release([])) })), /partial/);
});
function root() {
  const fields = {};
  return { fields, querySelector: key => fields[key] ||= {},
    setAttribute: (key, value) => fields[key] = value };
}
test('renders total, platform counts and checked timestamp', async () => {
  const element = root();
  await update(element, async () => ({ total: 1234, windows: 1200, mac: 34,
    fetchedAt: '2026-11-05T06:00:00Z' }));
  assert.equal(element.fields['[data-downloads="total"]'].textContent, '1,234');
  assert.equal(element.fields['[data-downloads="windows"]'].textContent, '1,200');
  assert.equal(element.fields['[data-downloads="mac"]'].textContent, '34');
  assert.match(element.fields['[data-download-status]'].textContent, /UTC/);
  assert.equal(element.fields['aria-busy'], 'false');
});
test('failure displays Unavailable rather than a misleading zero', async () => {
  const element = root();
  await update(element, async () => { throw new Error('offline'); });
  assert.equal(element.fields['[data-downloads="total"]'].textContent, 'Unavailable');
  assert.equal(element.fields['[data-downloads="mac"]'].textContent, 'Unavailable');
  assert.equal(element.fields['aria-busy'], 'false');
});
