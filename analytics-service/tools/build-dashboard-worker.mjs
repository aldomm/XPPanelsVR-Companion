// Builds the dashboard bundle from canonical modules. No secret is included.
import {readFile,writeFile} from 'node:fs/promises';
const read=name=>readFile(new URL('../worker/src/'+name,import.meta.url),'utf8');
const assets=(await read('assets.mjs')).replace('export const ASSETS','const ASSETS');
const core=(await read('report-core.mjs')).replaceAll('export const ','const ').replaceAll('export function ','function ');
const collector=(await read('collector.mjs')).replace(/^import .*;\r?\n/gm,'').replace('export default {','const collector = {');
const worker=(await read('index.mjs')).replace(/^import .*;\r?\n/gm,'').replaceAll('export async function ','async function ');
await writeFile(new URL('../worker/dashboard-worker.mjs',import.meta.url),[assets,core,collector,worker].join('\n'));
console.log('Built dashboard-worker.mjs (no secret included).');
