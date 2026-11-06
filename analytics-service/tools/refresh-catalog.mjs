import { readFile, writeFile } from 'node:fs/promises';
import { snapshotAssets } from './github.mjs';

const base = new URL('../', import.meta.url);
const catalogUrl = new URL('catalog.json', base);
let previous = { assets: [] };
try { previous = JSON.parse(await readFile(catalogUrl, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const records = new Map(previous.assets.map(a => [a.key, { ...a, active: false }]));
const latest = snapshotAssets();
for (const { github_download_count, ...asset } of latest) {
  const prior = records.get(asset.key);
  records.set(asset.key, prior ? { ...prior, url: asset.url, active: true } : { ...asset, active: true });
}
const catalog = { updated_at: new Date().toISOString(), assets: [...records.values()] };
await writeFile(catalogUrl, JSON.stringify(catalog, null, 2) + '\n');
const active = catalog.assets.filter(a => a.active);
await writeFile(new URL('worker/src/assets.mjs', base),
  '// Generated from public release asset IDs; refresh using tools/refresh-catalog.mjs.\n' +
  'export const ASSETS = ' + JSON.stringify(Object.fromEntries(active.map(a => [a.key, a])), null, 2) + ';\n');
for (const repository of ['XPPanelsVR-Companion', 'XPPanelsVR-Quest']) {
  const configUrl = new URL(`../../${repository}/analytics-config.js`, base);
  let config = { enabled: false, endpoint: '' };
  try {
    const text = await readFile(configUrl, 'utf8');
    const current = JSON.parse(text.slice(text.indexOf('=') + 1).trim().replace(/;$/, ''));
    config = { enabled: current.enabled === true, endpoint: current.endpoint || '' };
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  config.assets = Object.fromEntries(active.filter(a => a.repository === `aldomm/${repository}`).map(a => [a.url, a.key]));
  await writeFile(configUrl, '// No secrets. Enable only after the free Worker is verified and privacy text is updated.\nwindow.XPPanelsAnalyticsConfig = ' + JSON.stringify(config, null, 2) + ';\n');
}
console.log(`Catalog refreshed: ${active.length} current assets; ${catalog.assets.length - active.length} historical assets retained. Activation flags unchanged.`);
