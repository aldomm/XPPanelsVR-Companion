import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import vm from 'node:vm';
import worker from '../worker/src/index.mjs';
import { ASSETS } from '../worker/src/assets.mjs';
import { compareSnapshots } from '../tools/github.mjs';
import { parseD1Export } from '../tools/d1-export.mjs';

const origin = 'https://aldomm.github.io';
const [assetKey, asset] = Object.entries(ASSETS).find(([, a]) => a.kind === 'package');
const schema = readFileSync(new URL('../worker/migrations/0001_download_link_daily.sql', import.meta.url), 'utf8')+readFileSync(new URL('../worker/migrations/0002_hourly_owner_reports.sql', import.meta.url), 'utf8');

function database(t) {
  const db = new DatabaseSync(':memory:'); db.exec(schema); t.after(() => db.close());
  return {
    env: { ANALYTICS: {
      prepare(sql) { return { bind(...args) { return { sql,args }; } }; },
      async batch(statements) {
        db.exec('BEGIN');
        try { const result=statements.map(s=>db.prepare(s.sql).run(...s.args));db.exec('COMMIT');return result; }
        catch(e) {db.exec('ROLLBACK');throw e;}
      },
    } },
    rows: () => db.prepare('SELECT * FROM download_link_daily').all(),
    columns: () => db.prepare('PRAGMA table_info(download_link_daily)').all().map(c => c.name),
  };
}
function request(options = {}) {
  const method = options.method || 'POST';
  const req = new Request('https://example.workers.dev' + (options.path || '/event'), {
    method,
    headers: { Origin: origin, 'User-Agent': 'Mozilla/5.0', 'Content-Type': 'text/plain', ...options.headers },
    ...(!['GET', 'HEAD', 'OPTIONS'].includes(method) ? { body: options.body ?? JSON.stringify({ asset: options.asset || assetKey }) } : {}),
  });
  Object.defineProperty(req, 'cf', { value: { country: options.country ?? 'PT' } });
  return req;
}

test('accepted requests aggregate by UTC day, immutable file and edge country only', async t => {
  const s = database(t);
  for (const country of ['PT', 'PT', 'CN']) assert.equal((await worker.fetch(request({ country }), s.env)).status, 204);
  const rows = s.rows(); assert.equal(rows.length, 2);
  assert.equal(rows.find(r => r.country === 'PT').link_requests, 2);
  assert.equal(rows.find(r => r.country === 'CN').link_requests, 1);
  assert.equal(rows[0].asset_id, asset.asset_id); assert.equal(rows[0].version, asset.version);
  assert.equal(rows[0].day_utc, new Date().toISOString().slice(0, 10));
  assert.deepEqual(s.columns(), ['day_utc', 'repository', 'asset_id', 'version', 'filename', 'product', 'platform', 'kind', 'country', 'link_requests']);
});

test('HEAD, OPTIONS, GET and obvious prefetch/bot requests never increment', async t => {
  const s = database(t);
  for (const options of [{ method: 'HEAD' }, { method: 'OPTIONS' }, { method: 'GET' },
    { headers: { Purpose: 'prefetch' } }, { headers: { 'Sec-Purpose': 'prefetch;prerender' } },
    { headers: { 'User-Agent': 'Googlebot' } }, { headers: { 'User-Agent': 'curl/8' } }]) {
    await worker.fetch(request(options), s.env);
  }
  assert.deepEqual(s.rows(), []);
});

test('rejects unlisted assets, other origins, extra data and oversized events', async t => {
  const s = database(t);
  for (const options of [{ asset: 'unknown' }, { asset: '__proto__' }, { headers: { Origin: 'https://other.example' } },
    { body: '{bad json' }, { body: JSON.stringify({ asset: assetKey, email: 'not-stored@example.test' }) },
    { body: 'x'.repeat(513) }, { path: '/report' }]) assert.ok((await worker.fetch(request(options), s.env)).status >= 400);
  assert.deepEqual(s.rows(), []);
});

test('uses Cloudflare country only and records unknown country explicitly', async t => {
  const s = database(t);
  await worker.fetch(request({ country: 'XX', headers: { 'X-Country': 'US', 'CF-IPCountry': 'US' } }), s.env);
  assert.equal(s.rows()[0].country, 'ZZ');
});

test('D1 outage or free quota errors produce no success claim or personal logs', async () => {
  const env = { ANALYTICS: { prepare() { throw Error('Free tier row write limit'); } } };
  assert.equal((await worker.fetch(request(), env)).status, 503);
  assert.equal((await worker.fetch(request(), {})).status, 503);
});

test('same filename/version with a new asset ID is a separate aggregate', async t => {
  const s = database(t), otherKey = Object.keys(ASSETS).find(k => k !== assetKey);
  const original = ASSETS[otherKey];
  ASSETS[otherKey] = { ...asset, asset_id: 'replacement-id' };
  try {
    await worker.fetch(request(), s.env); await worker.fetch(request({ asset: otherKey }), s.env);
    assert.equal(s.rows().length, 2);
  } finally { ASSETS[otherKey] = original; }
});

const client = readFileSync(new URL('../../download-analytics.js', import.meta.url), 'utf8');
function browser(fetcher, config = {}) {
  const handlers = new Map();
  const context = { window: { XPPanelsAnalyticsConfig: { enabled: true, endpoint: 'https://analytics.example.workers.dev/event', assets: { [asset.url]: assetKey }, ...config } },
    URL, Promise, fetch: fetcher, document: { addEventListener(name, fn) { handlers.set(name, fn); } } };
  vm.runInNewContext(client, context);
  return handlers;
}
function click(overrides = {}) {
  const link = Object.freeze({ href: asset.url });
  return { type: 'click', button: 0, isTrusted: true, defaultPrevented: false,
    target: { closest: () => link }, preventDefault() { throw Error('Download was intercepted'); }, ...overrides };
}

test('unconfigured or disabled tracking is inert and sends no request', () => {
  for (const config of [{ enabled: false }, { endpoint: '' }, { endpoint: 'http://bad.example/event' }]) {
    assert.equal(browser(() => { throw Error('Unexpected fetch'); }, config).size, 0);
  }
});

test('tracking is non-blocking and never changes, cancels or delays the direct link', async () => {
  for (const fetcher of [() => { throw Error('blocked'); }, () => Promise.reject(Error('offline')),
    () => Promise.resolve({ status: 503, ok: false }), () => Promise.resolve({ status: 429, ok: false }),
    () => new Promise(() => {})]) {
    const handlers = browser(fetcher), event = click();
    assert.equal(handlers.get('click')(event), undefined);
    assert.equal(event.target.closest().href, asset.url);
  }
  await new Promise(resolve => setImmediate(resolve));
});

test('only trusted link activations send minimal anonymous keepalive events', async () => {
  const sent = [], handlers = browser((...args) => { sent.push(args); return Promise.resolve({ status: 204 }); });
  handlers.get('click')(click());
  handlers.get('click')(click({ detail: 0 })); // Keyboard activation.
  handlers.get('auxclick')(click({ type: 'auxclick', button: 1 }));
  handlers.get('click')(click({ isTrusted: false }));
  handlers.get('click')(click({ defaultPrevented: true }));
  handlers.get('auxclick')(click({ type: 'auxclick', button: 2 }));
  assert.equal(sent.length, 3);
  for (const [, init] of sent) {
    assert.deepEqual(JSON.parse(init.body), { asset: assetKey });
    assert.equal(init.credentials, 'omit'); assert.equal(init.referrerPolicy, 'no-referrer'); assert.equal(init.keepalive, true);
  }
  await Promise.resolve();
});

test('GitHub comparisons never subtract missing/replaced/decreased asset totals', () => {
  const a = (key, count) => ({ key, filename: 'same.pkg', version: 'v1', github_download_count: count });
  const previous = { assets: [a('repo:old', 50), a('repo:continuing', 5), a('repo:reset', 9)] };
  const current = { assets: [a('repo:new', 2), a('repo:continuing', 8), a('repo:reset', 1)] };
  const result = compareSnapshots(current, previous);
  assert.equal(result.find(r => r.key === 'repo:old').status, 'missing_asset');
  assert.equal(result.find(r => r.key === 'repo:new').github_count_increase, null);
  assert.equal(result.find(r => r.key === 'repo:reset').github_count_increase, null);
  assert.equal(result.find(r => r.key === 'repo:continuing').github_count_increase, 3);
});

test('private report distinguishes empty data from failed owner exports', () => {
  assert.deepEqual(parseD1Export('[{"success":true,"results":[]}]'), []);
  assert.throws(() => parseD1Export('[{"success":false,"results":[]}]'), /unavailable/);
  assert.throws(() => parseD1Export('[{"errors":["quota"]}]'), /unavailable/);
  assert.deepEqual(parseD1Export('\uFEFF[]'), []);
});
