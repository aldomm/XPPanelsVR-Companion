export function parseD1Export(text) {
  const exported = JSON.parse(text.replace(/^\uFEFF/, ''));
  if (!Array.isArray(exported)) throw new Error('D1 export must be an array');
  const wrapped = exported.length > 0 && exported.some(x => ['results', 'success', 'error', 'errors'].some(k => Object.hasOwn(x, k)));
  if (wrapped && exported.some(x => x.success === false || x.error || x.errors?.length || !Array.isArray(x.results))) {
    throw new Error('D1 export failed; unavailable data must not be reported as zero');
  }
  const rows = wrapped ? exported.flatMap(x => x.results) : exported;
  for (const r of rows) if (!/^\d{4}-\d{2}-\d{2}$/.test(r.day_utc) || !/^[A-Z]{2}$/.test(r.country) ||
      !Number.isSafeInteger(r.website_download_link_requests) || r.website_download_link_requests < 0) throw new Error('Invalid D1 aggregate row');
  return rows;
}
