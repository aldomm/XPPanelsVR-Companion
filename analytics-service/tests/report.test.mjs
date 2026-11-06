import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import {cutoffAt,makeReport,githubDelta,summarizeRows,allTimeWebsite,DAY} from '../worker/src/report-core.mjs';
import collector from '../worker/src/collector.mjs';
import worker, {prepareReport} from '../worker/src/index.mjs';
import {ASSETS} from '../worker/src/assets.mjs';
const cutoff='2026-11-10T01:00:00.000Z';
const row=(hour,count=1)=>({hour_utc:hour,repository:'aldomm/XPPanelsVR-Quest',asset_id:'1',version:'beta',filename:'app.apk',product:'quest',platform:'quest',kind:'package',country:'HK',link_requests:count});
const asset=(id,count)=>({key:'aldomm/XPPanelsVR-Quest:'+id,repository:'aldomm/XPPanelsVR-Quest',asset_id:id,filename:'app.apk',github_download_count:count});
const snapshot=(date,assets)=>({source:'scheduled',cutoff_utc:date,captured_at_utc:date,assets});
function report(rows=[],snapshots=[],started='2026-10-01T00:00:00.000Z') {return makeReport({cutoff,preparedAt:cutoff,hourlyStartedAt:started,hourlyRows:rows,snapshots});}
test('Hong Kong cutoff is fixed at 01:00 UTC even when delivery is delayed',()=>{
 assert.equal(cutoffAt('2026-11-10T00:59:59Z'),'2026-11-09T01:00:00.000Z');
 assert.equal(cutoffAt('2026-11-10T01:00:00Z'),cutoff);
 assert.equal(cutoffAt('2026-11-10T02:47:00Z'),cutoff);
});
test('hourly windows include the start and exclude the exact cutoff',()=>{
 const r=report([row('2026-11-09T00:00:00.000Z',100),row('2026-11-09T01:00:00.000Z',2),row('2026-11-10T00:00:00.000Z',3),row(cutoff,100)]);
 assert.equal(r.periods[0].website.total,5);assert.equal(r.periods[1].website.total,105);assert.equal(r.qualifies,true);
 assert.equal(r.periods[2].start_utc,'2026-10-11T01:00:00.000Z');
});
test('quiet latest 24 hours suppresses mail even with 7/30-day activity',()=>{
 const r=report([row('2026-11-08T12:00:00.000Z',20)]);assert.equal(r.periods[1].website.total,20);assert.equal(r.qualifies,false);
});
test('both headsets and all five platform combinations are always represented',()=>{
 const r=report([row('2026-11-09T12:00:00.000Z',2)]);assert.equal(r.periods[0].website.platforms.length,5);assert.equal(r.periods[0].website.platforms.find(a=>a.product==='vision'&&a.platform==='mac').count,0);
});
test('all-time uses preserved daily history plus the cutoff day hour, without duplicate copies',()=>{
 const historic={...row('2026-11-09T00:00:00.000Z',8),day_utc:'2026-11-09'};
 const today={...row('2026-11-10T00:00:00.000Z',999),day_utc:'2026-11-10'};
 const all=allTimeWebsite([historic,today],[row('2026-11-09T12:00:00.000Z',8),row('2026-11-10T00:00:00.000Z',2),row(cutoff,10)],cutoff,'2026-11-06');
 assert.equal(all.total,10);assert.equal(all.countries[0].count,10);assert.equal(all.hours,undefined);
 const r=makeReport({cutoff,preparedAt:cutoff,hourlyStartedAt:'2026-10-01T00:00:00.000Z',hourlyRows:[],snapshots:[],dailyRows:[{...historic,day_utc:'2026-11-01'}]});
 assert.equal(r.all_time.website.total,8);assert.equal(r.qualifies,false);
});
test('partial daily history waits; longer windows remain explicitly partial',()=>{
 const r=report([row('2026-11-09T12:00:00.000Z')],[],'2026-11-09T06:00:00.000Z');
 assert.equal(r.qualifies,false);assert.equal(r.qualification_reason,'waiting_for_first_full_24_hours');assert.equal(r.periods[2].website.complete,false);assert.equal(r.periods[2].github.total,null);
});
test('GitHub deltas use immutable IDs and never infer new/replaced/decreased values',()=>{
 const d=githubDelta(snapshot(cutoff,[asset('1',5),asset('2',1),asset('4',99)]),snapshot('2026-11-09T01:00:00.000Z',[asset('1',3),asset('2',2),asset('3',8)]));
 assert.equal(d.total,2);assert.deepEqual(d.files.map(a=>a.status),['continuing','counter_decreased','new_asset_baseline','missing_asset']);
 const r=report([], [snapshot(cutoff,[asset('1',5)]),snapshot('2026-11-09T01:00:00.000Z',[asset('1',3)])]);assert.equal(r.qualifies,true);assert.equal(r.periods[1].github.available,false);
});
test('auxiliary files never qualify as package downloads',()=>{assert.equal(report([{...row('2026-11-09T12:00:00.000Z'),kind:'auxiliary'}]).qualifies,false);});
function sqliteBinding(db) {
 return {prepare(sql){let args=[];return {bind(...a){args=a;return this;},run(){return db.prepare(sql).run(...args);},first(){return db.prepare(sql).get(...args)||null;},_sql:sql,_args:()=>args};},async batch(statements){db.exec('BEGIN');try{const result=statements.map(s=>s._sql.trim().startsWith('SELECT')?{success:true,results:db.prepare(s._sql).all(...s._args())}:{success:true,...db.prepare(s._sql).run(...s._args())});db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}};
}
test('collector atomically preserves daily counts and adds anonymous hourly counts',async()=>{
 const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../worker/migrations/0001_download_link_daily.sql',import.meta.url),'utf8'));db.exec(readFileSync(new URL('../worker/migrations/0002_hourly_owner_reports.sql',import.meta.url),'utf8'));
 const key=Object.keys(ASSETS)[0];const req=new Request('https://example.workers.dev/event',{method:'POST',headers:{Origin:'https://aldomm.github.io','User-Agent':'Browser'},body:JSON.stringify({asset:key})});Object.defineProperty(req,'cf',{value:{country:'HK'}});
 const res=await collector.fetch(req,{ANALYTICS:sqliteBinding(db)});assert.equal(res.status,204);
 assert.equal(db.prepare('SELECT SUM(link_requests) n FROM download_link_daily').get().n,1);assert.equal(db.prepare('SELECT SUM(link_requests) n FROM download_link_hourly').get().n,1);
 const columns=db.prepare('PRAGMA table_info(download_link_hourly)').all().map(r=>r.name);assert.ok(!columns.some(c=>/ip|visitor|email|agent/.test(c)));
 assert.equal(db.prepare('SELECT COUNT(*) n FROM download_report_meta').get().n,1);
});
test('scheduled report aggregates all preserved daily history once and retains current GitHub lifetime totals',async()=>{
 const db=new DatabaseSync(':memory:');
 db.exec(readFileSync(new URL('../worker/migrations/0001_download_link_daily.sql',import.meta.url),'utf8'));
 db.exec(readFileSync(new URL('../worker/migrations/0002_hourly_owner_reports.sql',import.meta.url),'utf8'));
 const put=(table,time,count)=>db.prepare(`INSERT INTO ${table} VALUES (?,?,?,?,?,?,?,?,?,?)`).run(time,'aldomm/XPPanelsVR-Quest','1','beta','app.apk','quest','quest','package','HK',count);
 put('download_link_daily','2026-11-06',4);
 put('download_link_daily','2026-11-08',6);
 put('download_link_daily','2026-11-10',102);
 put('download_link_hourly','2026-11-08T12:00:00.000Z',6);
 put('download_link_hourly','2026-11-10T00:00:00.000Z',2);
 put('download_link_hourly',cutoff,100);
 db.prepare('INSERT INTO download_report_meta VALUES (?,?)').run('hourly_started_at','2026-11-06T12:00:00.000Z');
 db.prepare('INSERT INTO download_report_meta VALUES (?,?)').run('page_views_started_at_quest','2026-11-06T15:55:00.000Z');
 db.prepare('INSERT INTO page_view_daily VALUES (?,?,?,?)').run('2026-11-08','quest','HK',9);
 db.prepare('INSERT INTO page_view_daily VALUES (?,?,?,?)').run('2026-11-10','quest','HK',103);
 db.prepare('INSERT INTO page_view_hourly VALUES (?,?,?,?)').run('2026-11-08T12:00:00.000Z','quest','HK',9);
 db.prepare('INSERT INTO page_view_hourly VALUES (?,?,?,?)').run('2026-11-10T00:00:00.000Z','quest','HK',3);
 db.prepare('INSERT INTO page_view_hourly VALUES (?,?,?,?)').run(cutoff,'quest','HK',100);
 const current=snapshot(cutoff,[{...asset('1',54),product:'quest',platform:'quest',version:'beta'}]);
 db.prepare('INSERT INTO download_github_snapshots VALUES (?,?,?,?)').run(cutoff,cutoff,'scheduled',JSON.stringify(current));
 await prepareReport({ANALYTICS:sqliteBinding(db)},new Date(cutoff).getTime());
 const r=JSON.parse(db.prepare('SELECT report_json FROM download_prepared_reports').get().report_json);
 assert.equal(r.all_time.website.total,12);
 assert.equal(r.all_time.website.files[0].count,12);
 assert.equal(r.all_time.website.countries[0].count,12);
 assert.equal(r.all_time.website.since_tracking_began,'2026-11-06');
 assert.equal(r.periods[0].website.total,2);
 assert.equal(r.all_time.github.total,54);
 assert.equal(r.periods[0].github.available,false);
 assert.equal(r.all_time.page_views.total,12);
 assert.equal(r.periods[0].page_views.total,3);
 assert.equal(r.periods[0].page_views.products.find(p=>p.product==='quest').complete,true);
 assert.equal(r.periods[0].page_views.products.find(p=>p.product==='vision').complete,false);
 await prepareReport({ANALYTICS:sqliteBinding(db)},new Date(cutoff).getTime());
 assert.equal(db.prepare('SELECT COUNT(*) n FROM download_prepared_reports').get().n,1);
 const body=scriptHarness(r).context.emailText_(r);
 assert.match(body,/ALL-TIME TOTALS/);
 assert.match(body,/since tracking began \(2026-11-06\): 12/);
 assert.match(body,/GitHub lifetime package total: 54/);
 assert.match(body,/quest \/ quest: 54/);
 assert.match(body,/quest lifetime total: 54/);
 assert.match(body,/Deleted\/replaced asset histories/);
 assert.match(body,/All-time anonymous page views: 12/);
 assert.match(body,/not unique visitors/);
 db.close();
});
test('page-view collector enforces landing-page allowlist, origin, bot filtering and atomic anonymous buckets',async()=>{
 const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../worker/migrations/0002_hourly_owner_reports.sql',import.meta.url),'utf8'));
 const env={ANALYTICS:sqliteBinding(db)};
 const page={product:'quest',path:'/XPPanelsVR-Quest/'};
 const send=async(body=page,headers={},method='POST')=>{
   const request=new Request('https://example.workers.dev/page-view',{method,headers:{Origin:'https://aldomm.github.io','User-Agent':'Browser',...headers},...(method==='POST'?{body:JSON.stringify(body)}:{})});
   Object.defineProperty(request,'cf',{value:{country:'HK'}});
   return worker.fetch(request,env);
 };
 assert.equal((await send()).status,204);
 assert.equal((await send({product:'vision',path:'/XPPanelsVR-Companion/index.html'})).status,204);
 for(const body of [{...page,path:'/XPPanelsVR-Quest/notices.html'},{...page,path:page.path+'?email=test'}, {...page,visitor:'not-allowed'},{product:'unknown',path:page.path},{product:'toString',path:page.path}]) assert.equal((await send(body)).status,400);
 assert.equal((await send(page,{Origin:'https://example.com'})).status,403);
 assert.equal((await send(page,{'User-Agent':'HeadlessChrome'})).status,204);
 assert.equal((await send(page,{'Sec-Purpose':'prefetch'})).status,204);
 assert.equal((await send(page,{},'OPTIONS')).status,204);
 assert.equal(db.prepare('SELECT SUM(page_views) n FROM page_view_daily').get().n,2);
 assert.equal(db.prepare('SELECT SUM(page_views) n FROM page_view_hourly').get().n,2);
 assert.deepEqual(db.prepare('PRAGMA table_info(page_view_hourly)').all().map(r=>r.name),['hour_utc','product','country','page_views']);
 db.exec("CREATE TRIGGER reject_page_hour BEFORE INSERT ON page_view_hourly BEGIN SELECT RAISE(ABORT,'test rollback'); END;");
 assert.equal((await send()).status,503);
 assert.equal(db.prepare('SELECT SUM(page_views) n FROM page_view_daily').get().n,2);
 db.close();
});
test('page views alone never qualify an email and all-time daily/hourly copies count once',()=>{
 const r=makeReport({cutoff,preparedAt:cutoff,hourlyStartedAt:'2026-10-01T00:00:00.000Z',hourlyRows:[],snapshots:[],pageViewStartedAt:{vision:'2026-11-09T12:30:00.000Z',quest:'2026-11-09T12:30:00.000Z'},pageViewHourlyRows:[{hour_utc:'2026-11-09T14:00:00.000Z',product:'vision',country:'HK',page_views:10},{hour_utc:'2026-11-10T00:00:00.000Z',product:'quest',country:'US',page_views:5}],pageViewDailyRows:[{day_utc:'2026-11-09',product:'vision',country:'HK',page_views:10},{day_utc:'2026-11-10',product:'quest',country:'US',page_views:99}]});
 assert.equal(r.periods[0].page_views.total,15);assert.equal(r.periods[0].page_views.complete,false);
 assert.equal(r.all_time.page_views.total,15);assert.equal(r.all_time.page_views.hours,undefined);
 assert.equal(r.qualifies,false);
 const h=scriptHarness(r);h.context.checkDailyReport();assert.equal(h.sent.length,0);
});
test('website page tracking sends once per document, omits identifiers and stays nonblocking',async()=>{
 const source=readFileSync(new URL('../../page-views.js',import.meta.url),'utf8');
 function harness({path='/XPPanelsVR-Quest/',origin='https://aldomm.github.io',prerendering=false,fail=false,enabled=true}={}) {
   const calls=[],events={};
   const context={URL,window:{location:{origin,pathname:path},XPPanelsAnalyticsConfig:{enabled,endpoint:'https://xppanels-download-analytics.aldoapps.workers.dev/event'}},document:{prerendering,addEventListener:(name,fn)=>events[name]=fn},fetch:(url,options)=>{calls.push({url,options});if(fail)throw Error('offline');return Promise.resolve();}};
   vm.createContext(context);return {context,calls,events,run:()=>vm.runInContext(source,context)};
 }
 const h=harness();h.run();h.run();assert.equal(h.calls.length,1);
 assert.deepEqual(JSON.parse(h.calls[0].options.body),{product:'quest',path:'/XPPanelsVR-Quest/'});
 assert.equal(h.calls[0].options.credentials,'omit');assert.equal(h.calls[0].options.referrerPolicy,'no-referrer');
 assert.ok(h.calls[0].url.endsWith('/page-view'));
 for(const settings of [{path:'/XPPanelsVR-Quest/notices.html'},{origin:'http://127.0.0.1:8765'},{enabled:false}]) {const x=harness(settings);x.run();assert.equal(x.calls.length,0);}
 const p=harness({prerendering:true});p.run();p.run();assert.equal(p.calls.length,0);p.context.document.prerendering=false;p.events.prerenderingchange();p.events.prerenderingchange();assert.equal(p.calls.length,1);
 assert.doesNotThrow(()=>harness({fail:true}).run());
});
test('owner endpoint rejects missing/wrong secrets and arbitrary query strings',async()=>{
 for(const [url,auth,status] of [['/owner/report',null,401],['/owner/report','Bearer wrong',401],['/owner/report?sql=SELECT',null,404],['/other',null,404]]){
  const r=await worker.fetch(new Request('https://example.workers.dev'+url,{headers:auth?{Authorization:auth}:{}}),{OWNER_REPORT_KEY:'x'.repeat(43)});assert.equal(r.status,status);
 }
});
function scriptHarness(payload,{mailFails=false}={}) {
 const values=new Map([['REPORTING_ENABLED','true'],['OWNER_REPORT_URL','https://report.workers.dev/owner/report'],['OWNER_REPORT_KEY','x'.repeat(43)]]),sent=[];
 const context={console,Date,JSON,Number,Error,String,Utilities:{formatDate(d,tz,fmt){if(fmt==='H')return '9';if(fmt==='yyyy-MM-dd')return cutoff.slice(0,10);return d.toISOString().slice(0,16);}},PropertiesService:{getScriptProperties:()=>({getProperty:k=>values.get(k),setProperty:(k,v)=>values.set(k,v),setProperties:o=>Object.entries(o).forEach(([k,v])=>values.set(k,v))})},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},UrlFetchApp:{fetch:()=>({getResponseCode:()=>200,getContentText:()=>JSON.stringify(payload)})},MailApp:{getRemainingDailyQuota:()=>100,sendEmail:mail=>{sent.push(mail);if(mailFails)throw Error('Ambiguous delivery');}}};
 vm.createContext(context);vm.runInContext(readFileSync(new URL('../google-sender/Code.gs',import.meta.url),'utf8'),context);return {context,values,sent};
}
test('Apps Script sends once to the confirmed recipient and suppresses repeat invocation',()=>{
 const h=scriptHarness(report([row('2026-11-09T12:00:00.000Z')]));h.context.checkDailyReport();h.context.checkDailyReport();assert.equal(h.sent.length,1);assert.equal(h.sent[0].to,'aldoapps@gmail.com');assert.match(h.sent[0].body,/LAST 30 DAYS/);
});
test('Apps Script never sends for zero recent activity or ambiguous send retries',()=>{
 const quiet=scriptHarness(report([row('2026-11-08T12:00:00.000Z')]));quiet.context.checkDailyReport();assert.equal(quiet.sent.length,0);
 const failed=scriptHarness(report([row('2026-11-09T12:00:00.000Z')]),{mailFails:true});failed.context.checkDailyReport();failed.context.checkDailyReport();assert.equal(failed.sent.length,1);assert.match(failed.values.get('LAST_STATUS'),/Needs review/);
});
