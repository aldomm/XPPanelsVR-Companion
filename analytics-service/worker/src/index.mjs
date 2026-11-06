import collector from './collector.mjs';
import { cutoffAt, makeReport, REPOS, DAY } from './report-core.mjs';

async function authorized(request, secret) {
  if(typeof secret!=='string'||secret.length<43) return false;
  const value=request.headers.get('Authorization')||'';
  if(!value.startsWith('Bearer ')||value.length>200) return false;
  const digest=async x=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(x)));
  const [a,b]=await Promise.all([digest(value.slice(7)),digest(secret)]);
  let different=0; for(let i=0;i<a.length;i++) different|=a[i]^b[i];
  return different===0;
}
function reply(value,status=200) {
  return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
export async function githubSnapshot(fetcher=fetch) {
  const started=new Date().toISOString(),assets=[];
  for(const repository of REPOS) {
    let complete=false;
    for(let page=1;page<=20;page++) {
      const response=await fetcher(`https://api.github.com/repos/${repository}/releases?per_page=100&page=${page}`,{headers:{Accept:'application/vnd.github+json','User-Agent':'XPPanels-owner-reports'},signal:AbortSignal.timeout(20000)});
      if(!response.ok) throw Error('GitHub inventory unavailable');
      const releases=await response.json();
      if(!Array.isArray(releases)) throw Error('Invalid GitHub response');
      for(const r of releases.filter(r=>!r.draft&&r.published_at)) {
        for(const a of r.assets.filter(a=>a.state==='uploaded'&&/\.(exe|pkg|apk)$/i.test(a.name))) {
          if(!Number.isSafeInteger(a.id)||a.id<=0||!Number.isSafeInteger(a.download_count)||a.download_count<0) throw Error('Invalid GitHub counter');
          assets.push({key:`${repository}:${a.id}`,repository,asset_id:String(a.id),version:r.tag_name,filename:a.name,product:repository.endsWith('-Quest')?'quest':'vision',platform:/\.apk$/i.test(a.name)?'quest':/\.pkg$/i.test(a.name)?'mac':'windows',github_download_count:a.download_count});
        }
      }
      if(releases.length<100) {complete=true;break;}
    }
    if(!complete) throw Error('Partial GitHub inventory rejected');
  }
  return {capture_started_at_utc:started,captured_at_utc:new Date().toISOString(),assets};
}
export async function prepareReport(env,scheduledTime) {
  const cutoff=cutoffAt(scheduledTime);
  const existing=await env.ANALYTICS.prepare('SELECT cutoff_utc FROM download_prepared_reports WHERE cutoff_utc=?').bind(cutoff).first();
  if(existing) return;
  let githubError=false;
  try {
    const existingSnapshot=await env.ANALYTICS.prepare('SELECT cutoff_utc FROM download_github_snapshots WHERE cutoff_utc=?').bind(cutoff).first();
    if(!existingSnapshot) {
      const snapshot=await githubSnapshot();
      await env.ANALYTICS.prepare('INSERT OR IGNORE INTO download_github_snapshots (cutoff_utc,captured_at_utc,source,assets_json) VALUES (?,?,?,?)').bind(cutoff,snapshot.captured_at_utc,'scheduled',JSON.stringify(snapshot)).run();
    }
  } catch { githubError=true; }
  const start=new Date(+new Date(cutoff)-30*DAY).toISOString();
  const [hourly,meta,snapshots,daily,pageHourly,pageDaily]=await env.ANALYTICS.batch([
    env.ANALYTICS.prepare("SELECT * FROM download_link_hourly WHERE hour_utc>=? AND hour_utc<? AND kind='package' ORDER BY hour_utc,repository,asset_id,country LIMIT 10001").bind(start,cutoff),
    env.ANALYTICS.prepare("SELECT key,value FROM download_report_meta WHERE key IN ('hourly_started_at','tracking_started_on','page_views_started_at_vision','page_views_started_at_quest')"),
    env.ANALYTICS.prepare("SELECT * FROM download_github_snapshots WHERE cutoff_utc>=? AND cutoff_utc<=? AND source='scheduled' ORDER BY cutoff_utc").bind(start,cutoff),
    env.ANALYTICS.prepare("SELECT MAX(day_utc) AS day_utc,repository,asset_id,version,filename,product,platform,kind,country,SUM(link_requests) AS link_requests FROM download_link_daily WHERE day_utc<? AND kind='package' GROUP BY repository,asset_id,version,filename,product,platform,kind,country ORDER BY repository,asset_id,country LIMIT 10001").bind(cutoff.slice(0,10)),
    env.ANALYTICS.prepare('SELECT * FROM page_view_hourly WHERE hour_utc>=? AND hour_utc<? ORDER BY hour_utc,product,country LIMIT 10001').bind(start,cutoff),
    env.ANALYTICS.prepare('SELECT MAX(day_utc) AS day_utc,product,country,SUM(page_views) AS page_views FROM page_view_daily WHERE day_utc<? GROUP BY product,country ORDER BY product,country LIMIT 10001').bind(cutoff.slice(0,10)),
  ]);
  if([hourly,meta,snapshots,daily,pageHourly,pageDaily].some(r=>!r.success||r.results.length>10000)) throw Error('Report data unavailable or exceeds safe row limit');
  const metadata=Object.fromEntries(meta.results.map(r=>[r.key,r.value]));
  const report=makeReport({cutoff,preparedAt:new Date().toISOString(),hourlyStartedAt:metadata.hourly_started_at||null,trackingStartedOn:metadata.tracking_started_on||'2026-11-06',hourlyRows:hourly.results,dailyRows:daily.results,pageViewHourlyRows:pageHourly.results,pageViewDailyRows:pageDaily.results,pageViewStartedAt:{vision:metadata.page_views_started_at_vision||null,quest:metadata.page_views_started_at_quest||null},snapshots:snapshots.results.map(s=>({...JSON.parse(s.assets_json),cutoff_utc:s.cutoff_utc,source:s.source}))});
  if(githubError) report.github_status='Current GitHub snapshot unavailable; never interpreted as zero.';
  await env.ANALYTICS.prepare('INSERT OR IGNORE INTO download_prepared_reports (cutoff_utc,prepared_at_utc,report_json) VALUES (?,?,?)').bind(cutoff,report.prepared_at_utc,JSON.stringify(report)).run();
}
export default {
  async fetch(request,env,ctx) {
    const url=new URL(request.url);
    if(url.pathname==='/event'||url.pathname==='/page-view') return collector.fetch(request,env);
    if(url.pathname!=='/owner/report') return reply({error:'Not found'},404);
    if(request.method!=='GET'||url.search) return reply({error:'Not found'},404);
    if(!await authorized(request,env.OWNER_REPORT_KEY)) return reply({error:'Unauthorized'},401);
    try {
      const cutoff=cutoffAt(Date.now());
      const row=await env.ANALYTICS.prepare('SELECT report_json FROM download_prepared_reports WHERE cutoff_utc=?').bind(cutoff).first();
      return row?reply(JSON.parse(row.report_json)):reply({status:'not_ready',cutoff_utc:cutoff},202);
    } catch {return reply({error:'Report unavailable'},503);}
  },
  async scheduled(controller,env,ctx) {
    ctx.waitUntil(prepareReport(env,controller.scheduledTime));
  },
};
