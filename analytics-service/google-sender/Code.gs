// User-owned Google Apps Script. No ChatGPT, AI, Gmail read access or paid service.
// Set OWNER_REPORT_URL and OWNER_REPORT_KEY in private Script Properties.
const REPORT_RECIPIENT = 'aldoapps@gmail.com';
const REPORT_TZ = 'Asia/Hong_Kong';

function reportClock_(iso) {
  return Utilities.formatDate(new Date(iso),REPORT_TZ,'yyyy-MM-dd HH:mm')+' HKT';
}
function emailText_(report) {
  const out=['XPPanels download activity','Reporting cutoff: '+reportClock_(report.cutoff_utc),''];
  report.periods.forEach(p=>{
    out.push('LAST '+(p.days===1?'24 HOURS':p.days+' DAYS'),reportClock_(p.start_utc)+' to '+reportClock_(p.end_utc)+' (end excluded)');
    if(p.page_views) {
      out.push('Anonymous page views: '+p.page_views.total+(p.page_views.complete?'':' — PARTIAL HISTORY'));
      p.page_views.products.forEach(a=>out.push('  '+a.product+': '+a.count+' page loads'+(a.complete?'':'; history starts '+(a.since_tracking_began?reportClock_(a.since_tracking_began):'when tracking is activated'))));
      out.push('Approximate countries (page views only): '+(p.page_views.countries.map(a=>a.product+' / '+a.country+': '+a.count).join(', ')||'No tracked page views'));
      p.page_views.hours.forEach(a=>out.push('  Page views '+a.product+' / '+reportClock_(a.hour_utc)+'–'+Utilities.formatDate(new Date(+new Date(a.hour_utc)+3600000),REPORT_TZ,'HH:mm')+': '+a.count));
    }
    out.push('Tracked website package-link requests: '+p.website.total+(p.website.complete?'':' — PARTIAL HISTORY'));
    if(!p.website.complete) out.push('Available since '+reportClock_(p.website.available_from)+'. Earlier hourly/country history is unavailable.');
    ['vision','quest'].forEach(product=>out.push('  '+product+' total: '+p.website.platforms.filter(a=>a.product===product).reduce((n,a)=>n+a.count,0)+' observed website clicks'));
    p.website.platforms.forEach(a=>out.push('  '+a.product+' / '+a.platform+': '+a.count+' observed website clicks'));
    p.website.files.forEach(a=>out.push('  '+a.product+' / '+a.platform+' / '+a.version+' / '+a.filename+': '+a.count));
    out.push('Approximate countries (website clicks only): '+(p.website.countries.map(a=>a.country+': '+a.count).join(', ')||'No tracked clicks'));
    out.push('Website click times (hour buckets in Hong Kong time):');
    p.website.hours.forEach(a=>out.push('  '+reportClock_(a.hour_utc)+'–'+Utilities.formatDate(new Date(+new Date(a.hour_utc)+3600000),REPORT_TZ,'HH:mm')+': '+a.count));
    if(p.github.available) {
      out.push('GitHub per-asset counter increases: '+p.github.total+' (approximate cutoff interval)');
      out.push('Snapshot captures: '+reportClock_(p.github.from_capture_started_at)+'–'+reportClock_(p.github.from_captured_at)+' to '+reportClock_(p.github.to_capture_started_at)+'–'+reportClock_(p.github.to_captured_at));
      ['vision','quest'].forEach(product=>out.push('  '+product+' known counter increase: '+p.github.files.filter(a=>a.product===product).reduce((n,a)=>n+(a.increase||0),0)));
      [['vision','windows'],['vision','mac'],['quest','windows'],['quest','mac'],['quest','quest']].forEach(pair=>out.push('  '+pair.join(' / ')+' known counter increase: '+p.github.files.filter(a=>a.product===pair[0]&&a.platform===pair[1]).reduce((n,a)=>n+(a.increase||0),0)));
      p.github.files.filter(a=>a.increase>0||a.status!=='continuing').forEach(a=>out.push('  '+a.product+' / '+a.platform+' / '+a.version+' / '+a.filename+': '+(a.increase===null?'not inferred ('+a.status+')':'+'+a.increase)));
    } else out.push('GitHub rolling counter change: UNAVAILABLE — '+p.github.reason);
    out.push('');
  });
  const all=report.all_time;
  out.push('ALL-TIME TOTALS','Tracked website package-link requests since tracking began ('+all.website.since_tracking_began+'): '+all.website.total);
  ['vision','quest'].forEach(product=>out.push('  '+product+' total: '+all.website.platforms.filter(a=>a.product===product).reduce((n,a)=>n+a.count,0)));
  all.website.platforms.forEach(a=>out.push('  '+a.product+' / '+a.platform+': '+a.count));
  all.website.files.forEach(a=>out.push('  '+a.product+' / '+a.platform+' / '+a.version+' / '+a.filename+': '+a.count));
  out.push('All-time approximate countries (tracked clicks only): '+(all.website.countries.map(a=>a.country+': '+a.count).join(', ')||'No tracked clicks'),all.website.scope);
  out.push('GitHub lifetime package total: '+(all.github.available?all.github.total:'UNAVAILABLE'));
  if(all.github.available) ['vision','quest'].forEach(product=>out.push('  '+product+' lifetime total: '+all.github.files.filter(a=>a.product===product).reduce((n,a)=>n+a.github_download_count,0)));
  if(all.github.available) [['vision','windows'],['vision','mac'],['quest','windows'],['quest','mac'],['quest','quest']].forEach(function(pair){out.push('  '+pair.join(' / ')+': '+all.github.files.filter(a=>a.product===pair[0]&&a.platform===pair[1]).reduce((n,a)=>n+a.github_download_count,0));});
  all.github.files.forEach(a=>out.push('  '+a.product+' / '+a.platform+' / '+a.version+' / '+a.filename+': '+a.github_download_count));
  out.push(all.github.scope,'Older daily website records have no hourly detail; all-time hours are not reconstructed.','');
  if(all.page_views) {
    out.push('All-time anonymous page views: '+all.page_views.total);
    all.page_views.products.forEach(a=>out.push('  '+a.product+': '+a.count+' since '+(a.since_tracking_began?reportClock_(a.since_tracking_began):'tracking is activated')));
    out.push('All-time approximate countries (page views only): '+(all.page_views.countries.map(a=>a.product+' / '+a.country+': '+a.count).join(', ')||'No tracked page views'),all.page_views.scope,'Page-view history is not backfilled. Daily/hourly copies are counted once.','');
  }
  report.limitations.forEach(x=>out.push('• '+x));
  return out.join('\n');
}
function loadOwnerReport_() {
  const props=PropertiesService.getScriptProperties();
  const url=props.getProperty('OWNER_REPORT_URL'),key=props.getProperty('OWNER_REPORT_KEY');
  if(!url||!/^https:\/\/[^/]+\.workers\.dev\/owner\/report$/.test(url)||!key||key.length<43) throw Error('Private report access is not configured.');
  const response=UrlFetchApp.fetch(url,{headers:{Authorization:'Bearer '+key},muteHttpExceptions:true,followRedirects:false});
  if(response.getResponseCode()===202) return null;
  if(response.getResponseCode()!==200) throw Error('Private report unavailable ('+response.getResponseCode()+').');
  const report=JSON.parse(response.getContentText());
  if(report.schema!==1||!Array.isArray(report.periods)||report.periods.length!==3||typeof report.qualifies!=='boolean') throw Error('Invalid private report.');
  return report;
}
function checkDailyReport() {
  const props=PropertiesService.getScriptProperties();
  if(props.getProperty('REPORTING_ENABLED')!=='true') return;
  const now=new Date(),hour=Number(Utilities.formatDate(now,REPORT_TZ,'H'));
  if(hour<9||hour>=11) return; // Five-minute wake-up; network work only 09:00–10:59 HKT.
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(1000)) return;
  try {
    const report=loadOwnerReport_();
    if(!report) {props.setProperty('LAST_STATUS','Waiting for today\'s cutoff report.');return;}
    if(report.cutoff_utc.slice(0,10)!==Utilities.formatDate(now,REPORT_TZ,'yyyy-MM-dd')) throw Error('Stale cutoff report rejected.');
    const cutoff=report.cutoff_utc;
    if(props.getProperty('LAST_HANDLED_CUTOFF')===cutoff||props.getProperty('LAST_ATTEMPTED_CUTOFF')===cutoff) return;
    if(!report.qualifies) {
      props.setProperties({LAST_HANDLED_CUTOFF:cutoff,LAST_STATUS:report.qualification_reason});
      return; // Historical 7/30-day activity alone never sends an email.
    }
    if(MailApp.getRemainingDailyQuota()<1) throw Error('Mail quota unavailable; no paid fallback.');
    const body=emailText_(report);
    if(body.length>150000) throw Error('Report exceeds safe email size.');
    // Persist before sending: an ambiguous delivery result must not cause duplicates.
    props.setProperties({LAST_ATTEMPTED_CUTOFF:cutoff,LAST_STATUS:'Send attempted; awaiting result.'});
    MailApp.sendEmail({to:REPORT_RECIPIENT,subject:'XPPanels — download activity to '+reportClock_(cutoff),body:body,name:'XPPanels reports'});
    props.setProperties({LAST_HANDLED_CUTOFF:cutoff,LAST_STATUS:'Sent to '+REPORT_RECIPIENT});
  } catch(e) {
    // Retain status privately; no failure/zero-activity email is sent by this script.
    props.setProperty('LAST_STATUS','Needs review: '+String(e.message).slice(0,300));
  } finally {lock.releaseLock();}
}
function previewDailyReport() {
  const report=loadOwnerReport_();
  console.log(report?JSON.stringify({qualifies:report.qualifies,reason:report.qualification_reason,body:emailText_(report)}):'Current cutoff report not ready.');
}
function activateDailyReports() {
  const props=PropertiesService.getScriptProperties();
  if(props.getProperty('OWNER_CONFIRMED')!=='true') throw Error('Owner authorization and private access must be confirmed first.');
  if(!props.getProperty('OWNER_REPORT_URL')||!props.getProperty('OWNER_REPORT_KEY')) throw Error('Missing private report access.');
  // Reuse an existing trigger to avoid creating a second sender.
  if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='checkDailyReport')) ScriptApp.newTrigger('checkDailyReport').timeBased().everyMinutes(5).create();
  props.setProperty('REPORTING_ENABLED','true');
}
function pauseDailyReports() {PropertiesService.getScriptProperties().setProperty('REPORTING_ENABLED','false');}
