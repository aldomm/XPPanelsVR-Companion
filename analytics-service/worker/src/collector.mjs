import { ASSETS } from './assets.mjs';

const ORIGIN = 'https://aldomm.github.io';
const MAX_BODY_BYTES = 512;
const PAGE_PATHS = {
  vision: ['/XPPanelsVR-Companion/','/XPPanelsVR-Companion/index.html'],
  quest: ['/XPPanelsVR-Quest/','/XPPanelsVR-Quest/index.html'],
};

function headers(origin) {
  const h = new Headers({ 'Cache-Control': 'no-store', Vary: 'Origin' });
  if (origin === ORIGIN) {
    h.set('Access-Control-Allow-Origin', ORIGIN);
    h.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    h.set('Access-Control-Allow-Headers', 'Content-Type');
  }
  return h;
}

function automated(request) {
  const purpose = ['Purpose', 'Sec-Purpose', 'X-Purpose', 'X-Moz']
    .map(name => request.headers.get(name) || '').join(' ');
  return /prefetch|prerender|preview/i.test(purpose) ||
    /bot\b|crawler|spider|preview|headless|curl|wget/i.test(request.headers.get('User-Agent') || '') ||
    request.cf?.botManagement?.verifiedBot === true;
}

async function readEvent(request, pageView) {
  if (Number(request.headers.get('Content-Length')) > MAX_BODY_BYTES) throw new Error('Too large');
  if (!request.body) throw new Error('Missing body');
  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_BODY_BYTES) { await reader.cancel(); throw new Error('Too large'); }
    chunks.push(value);
  }
  const data = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
  const event = JSON.parse(new TextDecoder().decode(data));
  if (!event || typeof event!=='object') throw new Error('Invalid event');
  if (pageView) {
    if (Object.keys(event).length!==2 || typeof event.product!=='string' ||
        !Object.hasOwn(PAGE_PATHS,event.product) || !PAGE_PATHS[event.product].includes(event.path)) throw new Error('Invalid page');
  } else if (Object.keys(event).length !== 1 || typeof event.asset !== 'string') throw new Error('Invalid event');
  return event;
}

export default {
  async fetch(request, env) {
    const h = headers(request.headers.get('Origin'));
    const reply = status => new Response(null, { status, headers: h });
    const path=new URL(request.url).pathname;
    if (path !== '/event' && path !== '/page-view') return reply(404);
    const pageView=path==='/page-view';
    if (request.method === 'OPTIONS' || request.method === 'HEAD') return reply(204);
    if (request.method !== 'POST') return reply(405);
    if (request.headers.get('Origin') !== ORIGIN) return reply(403);
    if (automated(request)) return reply(204);
    let event;
    try { event = await readEvent(request,pageView); } catch { return reply(400); }
    const asset = pageView ? null : ASSETS[event.asset];
    if (!pageView && (!asset || !Object.hasOwn(ASSETS, event.asset))) return reply(400);
    const code = request.cf?.country;
    const country = /^[A-Z]{2}$/.test(code || '') && code !== 'XX' ? code : 'ZZ';
    const acceptedAt = new Date().toISOString();
    const day = acceptedAt.slice(0, 10);
    const hour = acceptedAt.slice(0, 13) + ':00:00.000Z';
    try {
      if(pageView) {
        await env.ANALYTICS.batch([
          env.ANALYTICS.prepare('INSERT INTO page_view_daily (day_utc,product,country,page_views) VALUES (?,?,?,1) ON CONFLICT(day_utc,product,country) DO UPDATE SET page_views=page_views+1').bind(day,event.product,country),
          env.ANALYTICS.prepare('INSERT INTO page_view_hourly (hour_utc,product,country,page_views) VALUES (?,?,?,1) ON CONFLICT(hour_utc,product,country) DO UPDATE SET page_views=page_views+1').bind(hour,event.product,country),
          env.ANALYTICS.prepare('INSERT OR IGNORE INTO download_report_meta (key,value) VALUES (?,?)').bind('page_views_started_at_'+event.product,acceptedAt),
        ]);
        return reply(204);
      }
      const daily = env.ANALYTICS.prepare(`
        INSERT INTO download_link_daily
          (day_utc, repository, asset_id, version, filename, product, platform, kind, country, link_requests)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(day_utc, repository, asset_id, country)
        DO UPDATE SET link_requests = link_requests + 1
      `).bind(day, asset.repository, asset.asset_id, asset.version, asset.filename,
        asset.product, asset.platform, asset.kind, country);
      const hourly = env.ANALYTICS.prepare(`INSERT INTO download_link_hourly (hour_utc, repository, asset_id, version, filename, product, platform, kind, country, link_requests) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1) ON CONFLICT(hour_utc,repository,asset_id,country) DO UPDATE SET link_requests=link_requests+1`).bind(hour, asset.repository, asset.asset_id, asset.version, asset.filename, asset.product, asset.platform, asset.kind, country);
      const started = env.ANALYTICS.prepare(`INSERT OR IGNORE INTO download_report_meta (key,value) VALUES ('hourly_started_at',?)`).bind(acceptedAt);
      await env.ANALYTICS.batch([daily,hourly,started]);
      return reply(204);
    } catch {
      // No visitor data in logs. Tracking failure never controls the GitHub link.
      return reply(503);
    }
  },
};
