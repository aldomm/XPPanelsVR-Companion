import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { snapshotAssets, compareSnapshots } from './github.mjs';
import { parseD1Export } from './d1-export.mjs';

const args = process.argv.slice(2);
function option(name) { const i = args.indexOf(name); return i < 0 ? null : args[i + 1]; }
const dir = resolve(option('--out') || fileURLToPath(new URL('../reports/', import.meta.url)));
await mkdir(dir, { recursive: true });
const now = new Date().toISOString(), stamp = now.replace(/[:.]/g, '-');
const snapshot = { captured_at: now, metric: 'GitHub per-asset download_count totals', assets: snapshotAssets() };
const previousPath = option('--previous');
const previous = previousPath ? JSON.parse(await readFile(previousPath, 'utf8')) : null;
const compared = compareSnapshots(snapshot, previous);
const quote = x => `"${String(x ?? '').replaceAll('"', '""')}"`;
function csv(rows, columns) {
  return columns.join(',') + '\n' + rows.map(r => columns.map(c => quote(r[c])).join(',')).join('\n') + '\n';
}
await writeFile(resolve(dir, `github-${stamp}.json`), JSON.stringify(snapshot, null, 2) + '\n');
await writeFile(resolve(dir, `github-${stamp}.csv`), csv(compared, [
  'repository', 'asset_id', 'version', 'filename', 'product', 'platform', 'kind',
  'github_download_count', 'github_count_increase', 'status',
]));
let countryStatus = 'Not available: no owner D1 export supplied. This is not a zero count.';
if (option('--d1')) {
  const rows = parseD1Export(await readFile(option('--d1'), 'utf8'));
  const columns = ['day_utc', 'repository', 'asset_id', 'version', 'filename', 'product', 'platform', 'kind', 'country', 'website_download_link_requests'];
  await writeFile(resolve(dir, `website-link-requests-${stamp}.csv`), csv(rows, columns));
  countryStatus = `Exported ${rows.length} daily/file/country aggregate rows from the supplied owner export. Its date range is controlled by report.sql.`;
}
const packageCounts = snapshot.assets.filter(a => a.kind === 'package');
const summary = {
  captured_at: now,
  website_download_link_requests: countryStatus,
  github_package_download_count_total: packageCounts.reduce((n, a) => n + a.github_download_count, 0),
  github_total_scope: 'Currently published installer/APK assets only; auxiliary files are separately labeled in the CSV. Do not subtract totals across snapshots.',
  per_asset_comparison: previous ? 'Same immutable asset IDs only; new, missing and decreased counters are flagged and have no inferred delta.' : 'Baseline snapshot; no historical increases inferred.',
  limitations: [
    'Website requests and GitHub counts are different metrics; do not add or equate them.',
    'Neither metric proves a completed transfer, installation, unique person or bot-free activity.',
    'Country covers accepted events from tracked site links only. Direct GitHub downloads, context-menu downloads, disabled JavaScript and failed tracking are excluded.',
    'VPNs/proxies may change the approximate country; ZZ means unknown. Repeated clicks can count repeatedly.',
    'Quota exhaustion can leave gaps. No events are buffered or replayed and no zero is inferred for missing data.',
  ],
};
await writeFile(resolve(dir, `summary-${stamp}.json`), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ output_directory: dir, summary }, null, 2));
