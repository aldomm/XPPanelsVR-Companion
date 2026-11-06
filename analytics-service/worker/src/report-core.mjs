export const DAY = 86400000;
export const REPOS = ['aldomm/XPPanelsVR-Companion', 'aldomm/XPPanelsVR-Quest'];
export function cutoffAt(now) {
  const d = new Date(now);
  const c = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 1);
  return new Date(c > +d ? c - DAY : c).toISOString();
}
export function hourAt(now) { return new Date(now).toISOString().slice(0,13)+':00:00.000Z'; }
const sum = a => a.reduce((n,r)=>n+r.count,0);
export function summarizeRows(rows, start, end) {
  const relevant=rows.filter(r=>r.kind==='package'&&r.hour_utc>=start&&r.hour_utc<end);
  const files=new Map(), countries=new Map(), hours=new Map();
  for(const r of relevant) {
    const count=Number(r.link_requests);
    if(!Number.isSafeInteger(count)||count<0) throw Error('Invalid hourly count');
    const key=r.repository+':'+r.asset_id;
    const item=files.get(key)||{repository:r.repository,asset_id:r.asset_id,version:r.version,filename:r.filename,product:r.product,platform:r.platform,count:0};
    item.count+=count; files.set(key,item);
    countries.set(r.country,(countries.get(r.country)||0)+count);
    hours.set(r.hour_utc,(hours.get(r.hour_utc)||0)+count);
  }
  const platforms=[['vision','windows'],['vision','mac'],['quest','windows'],['quest','mac'],['quest','quest']].map(([product,platform])=>({product,platform,count:sum([...files.values()].filter(a=>a.product===product&&a.platform===platform))}));
  return {total:sum([...files.values()]),platforms,files:[...files.values()],countries:[...countries].sort().map(([country,count])=>({country,count})),hours:[...hours].sort().map(([hour_utc,count])=>({hour_utc,count}))};
}
export function githubDelta(current, previous) {
  if(!current||!previous) return {available:false,total:null,files:[],reason:'No complete pair of cutoff snapshots. Historical rolling counts are unavailable.'};
  const before=new Map(previous.assets.map(a=>[a.key,a]));
  const now=new Map(current.assets.map(a=>[a.key,a]));
  const files=current.assets.map(a=>{
    const old=before.get(a.key);
    const delta=old?a.github_download_count-old.github_download_count:null;
    return {...a,increase:delta!==null&&delta>=0?delta:null,status:!old?'new_asset_baseline':delta<0?'counter_decreased':'continuing'};
  });
  for(const old of before.values()) if(!now.has(old.key)) files.push({...old,github_download_count:null,increase:null,status:'missing_asset'});
  return {available:true,total:files.reduce((n,a)=>n+(a.increase||0),0),files,from_captured_at:previous.captured_at_utc,to_captured_at:current.captured_at_utc,from_capture_started_at:previous.capture_started_at_utc||previous.captured_at_utc,to_capture_started_at:current.capture_started_at_utc||current.captured_at_utc,approximate:true};
}
export function allTimeWebsite(dailyRows,hourlyRows,cutoff,trackingStartedOn,assets=[]) {
  const day=cutoff.slice(0,10),midnight=day+'T00:00:00.000Z';
  // Daily rows before today's UTC date, then only today's completed hourly bucket.
  // Daily/hourly tables contain copies of the same events: never sum both in full.
  const rows=[...dailyRows.filter(r=>r.day_utc<day&&r.kind==='package').map(r=>({...r,hour_utc:r.day_utc+'T00:00:00.000Z'})),...hourlyRows.filter(r=>r.hour_utc>=midnight&&r.hour_utc<cutoff&&r.kind==='package')];
  const result=summarizeRows(rows,'0000',cutoff);
  delete result.hours; // Older daily records contain no recoverable hour information.
  const keys=new Set(result.files.map(a=>a.repository+':'+a.asset_id));
  for(const a of assets) if(!keys.has(a.key)) result.files.push({repository:a.repository,asset_id:a.asset_id,version:a.version,filename:a.filename,product:a.product,platform:a.platform,count:0});
  return {...result,since_tracking_began:trackingStartedOn||'2026-11-06',cutoff_utc:cutoff,scope:'All preserved tracked package-link requests since tracking began; daily/hourly copies are counted once.'};
}
export function summarizePageViews(rows,start,end,startedAt={}) {
  const relevant=rows.filter(r=>r.hour_utc>=start&&r.hour_utc<end);
  const countries=new Map(),hours=new Map();
  const products=['vision','quest'].map(product=>({product,count:0,since_tracking_began:startedAt[product]||null,complete:!!startedAt[product]&&startedAt[product]<=start}));
  for(const r of relevant) {
    const count=Number(r.page_views),product=products.find(p=>p.product===r.product);
    if(!product||!Number.isSafeInteger(count)||count<0) throw Error('Invalid page view count');
    product.count+=count;
    const countryKey=r.product+':'+r.country,hourKey=r.product+':'+r.hour_utc;
    const country=countries.get(countryKey)||{product:r.product,country:r.country,count:0};
    const hour=hours.get(hourKey)||{product:r.product,hour_utc:r.hour_utc,count:0};
    country.count+=count;hour.count+=count;
    countries.set(countryKey,country);hours.set(hourKey,hour);
  }
  return {total:products.reduce((n,p)=>n+p.count,0),products,complete:products.every(p=>p.complete),countries:[...countries.values()],hours:[...hours.values()],scope:'Anonymous landing-page loads, including repeats; not unique visitors. Page views alone never trigger email.'};
}
export function allTimePageViews(dailyRows,hourlyRows,cutoff,startedAt={}) {
  const day=cutoff.slice(0,10),midnight=day+'T00:00:00.000Z';
  const rows=[...dailyRows.filter(r=>r.day_utc<day).map(r=>({...r,hour_utc:r.day_utc+'T00:00:00.000Z'})),...hourlyRows.filter(r=>r.hour_utc>=midnight&&r.hour_utc<cutoff)];
  const result=summarizePageViews(rows,'0000',cutoff,startedAt);
  delete result.hours;delete result.complete;
  result.products.forEach(p=>delete p.complete);
  return result;
}
export function makeReport({cutoff,preparedAt,hourlyStartedAt,hourlyRows,snapshots,dailyRows=[],trackingStartedOn='2026-11-06',pageViewHourlyRows=[],pageViewDailyRows=[],pageViewStartedAt={}}) {
  if(cutoffAt(cutoff)!==cutoff) throw Error('Cutoff must be exactly 01:00 UTC');
  const current=snapshots.find(s=>s.cutoff_utc===cutoff&&s.source==='scheduled');
  const periods=[1,7,30].map(days=>{
    const start=new Date(+new Date(cutoff)-days*DAY).toISOString();
    const previous=snapshots.find(s=>s.cutoff_utc===start&&s.source==='scheduled');
    const website=summarizeRows(hourlyRows,start,cutoff);
    website.complete=!!hourlyStartedAt&&hourlyStartedAt<=start;
    website.available_from=hourlyStartedAt&&hourlyStartedAt>start?hourlyStartedAt:start;
    website.history_note=website.complete?'Full hourly collection coverage for this window.':'Partial history: hourly collection did not cover the entire window. Older UTC daily totals are not redistributed.';
    return {days,start_utc:start,end_utc:cutoff,website,github:githubDelta(current,previous),page_views:summarizePageViews(pageViewHourlyRows,start,cutoff,pageViewStartedAt)};
  });
  const daily=periods[0];
  // Wait for one full 24-hour hourly-collection window before any automatic mail.
  const hasActivity=daily.website.total>0||(daily.github.available&&daily.github.total>0);
  const allTime={website:allTimeWebsite(dailyRows,hourlyRows,cutoff,trackingStartedOn,current?.assets||[]),github:{available:!!current,total:current?current.assets.reduce((n,a)=>n+a.github_download_count,0):null,files:current?.assets||[],scope:'Lifetime counters of currently published package assets, keyed by immutable asset ID. Deleted/replaced asset histories are not invented or folded into replacement IDs.'}};
  allTime.page_views=allTimePageViews(pageViewDailyRows,pageViewHourlyRows,cutoff,pageViewStartedAt);
  return {schema:1,cutoff_utc:cutoff,prepared_at_utc:preparedAt,timezone:'Asia/Hong_Kong',periods,all_time:allTime,qualifies:daily.website.complete&&hasActivity,qualification_reason:!daily.website.complete?'waiting_for_first_full_24_hours':hasActivity?'latest_24_hours_activity':'no_latest_24_hours_activity',github_lifetime_total:allTime.github.total,limitations:['Website figures count accepted link requests, not completed downloads, installs or unique people.','Countries are approximate and apply only to tracked website clicks; VPNs/proxies can affect them.','GitHub figures are changes in cumulative per-asset counters between actual snapshot capture times, approximately the stated cutoff window. They include direct GitHub traffic and have no country or hourly breakdown.','New, missing, replaced or decreased asset counters have no inferred delta.','Partial 7/30-day history stays explicitly labeled; no historical hourly data is invented.','Disabled tracking, provider failures and free-tier limits can leave gaps.']};
}
