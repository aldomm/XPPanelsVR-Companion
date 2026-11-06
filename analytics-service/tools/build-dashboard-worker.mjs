// Produces the same collector as worker/src/ for Cloudflare's dashboard editor.
import { readFile, writeFile } from 'node:fs/promises';
import { ASSETS } from '../worker/src/assets.mjs';

const source = await readFile(new URL('../worker/src/index.mjs', import.meta.url), 'utf8');
const importLine = "import { ASSETS } from './assets.mjs';";
if (!source.startsWith(importLine)) throw new Error('Unexpected Worker import; review the bundle generator.');
const assets = Object.fromEntries(Object.entries(ASSETS).map(([key, asset]) => [key,
  Object.fromEntries(['repository', 'asset_id', 'version', 'filename', 'product', 'platform', 'kind']
    .map(field => [field, asset[field]])),
]));
const bundle = source.replace(importLine, `const ASSETS = ${JSON.stringify(assets)};`);
await writeFile(new URL('../worker/dashboard-worker.mjs', import.meta.url), bundle);
console.log(`Dashboard Worker built with ${Object.keys(assets).length} immutable asset IDs.`);
