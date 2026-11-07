const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const {describeAsset,validateAsset,createLoader,update}=require('../download-stats.js');
const url='https://github.com/aldomm/XPPanelsVR-Quest/releases/download/v0.3.0-beta.1/XPPanelsQuestCompanion-0.3.0-beta.1-windows-x64-SELF-SIGNED.exe';
const expected=describeAsset('712207900',url);
const asset=count=>({id:expected.id,state:'uploaded',name:expected.name,browser_download_url:url,download_count:count});
test('uses one immutable asset ID and its exact package URL, never release/platform sums',()=>{
 assert.equal(expected.api,'https://api.github.com/repos/aldomm/XPPanelsVR-Quest/releases/assets/712207900');
 assert.equal(validateAsset(asset(5),expected),5);assert.equal(validateAsset(asset(0),expected),0);
 for(const data of [{id:712207901},{browser_download_url:url.replace('0.3.0','0.2.1')},{name:'another.exe'},{state:'new'}])assert.throws(()=>validateAsset({...asset(5),...data},expected));
});
test('unknown or invalid counts never become zero',()=>{
 for(const count of [undefined,null,-1,1.5,'5',Infinity,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>validateAsset(asset(count),expected));
 assert.throws(()=>validateAsset(null,expected));
});
test('rejects auxiliary files, other repositories and non-GitHub destinations',()=>{
 for(const link of [url.replace('.exe','.cer'),url.replace('.exe','.txt'),url.replace('aldomm','other'),url.replace('github.com','example.com'),url+'?query=x',url+'#fragment'])assert.throws(()=>describeAsset(expected.id,link));
 for(const id of [0,-1,'bad',1.5])assert.throws(()=>describeAsset(id,url));
});
test('repeated package actions share a request and use ordinary HTTP cache without credentials',async()=>{
 let calls=0;
 const load=createLoader(async(api,options)=>{calls++;assert.equal(api,expected.api);assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');assert.equal(options.cache,'default');assert.equal(options.headers.Authorization,undefined);return {ok:true,json:async()=>asset(1234)};});
 const [one,two]=await Promise.all([load(expected.id,url),load(expected.id,url)]);
 assert.equal(calls,1);assert.equal(one.count,1234);assert.equal(two.count,1234);
});
test('rate limits, network failures and invalid data do not retry',async()=>{
 for(const response of [()=>{throw Error('offline');},()=>({ok:false,status:403}),()=>({ok:false,status:429}),()=>({ok:true,json:async()=>({message:'bad'})})]){
  let calls=0;const load=createLoader(async()=>{calls++;return response();});
  await assert.rejects(load(expected.id,url));await assert.rejects(load(expected.id,url));assert.equal(calls,1);
 }
});
function fixture(){
 const field={attrs:{'data-download-asset':String(expected.id),'data-download-link':'package'},getAttribute(k){return this.attrs[k];},setAttribute(k,v){this.attrs[k]=v;}};
 const link={href:url};return {field,link,querySelectorAll:()=>[field],getElementById:()=>link};
}
test('renders lifetime counts and a truthful fallback without modifying the download',async()=>{
 for(const count of [0,1,1234]){const root=fixture();await update(root,async()=>({count,checkedAt:'2026-11-07T04:00:00Z'}));assert.equal(root.field.textContent,`${count.toLocaleString('en-US')} ${count===1?'download':'downloads'} · GitHub`);assert.match(root.field.title,/Lifetime GitHub downloads of this file/);assert.equal(root.link.href,url);assert.equal(root.field.attrs['aria-busy'],'false');}
 const root=fixture();await update(root,async()=>{throw Error('offline');});assert.equal(root.field.textContent,'Downloads unavailable · GitHub');assert.equal(root.link.href,url);assert.equal(root.field.attrs['aria-busy'],'false');
});
test('every primary package button has exactly one matching inline counter',()=>{
 const html=readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const anchors=Array.from(html.matchAll(/<a\b([^>]+)>/g)).map(m=>Object.fromEntries(Array.from(m[1].matchAll(/([\w-]+)="([^"]*)"/g),a=>[a[1],a[2]])));
 const counters=Array.from(html.matchAll(/<span class="download-counter"([^>]+)>/g)).map(m=>Object.fromEntries(Array.from(m[1].matchAll(/([\w-]+)="([^"]*)"/g),a=>[a[1],a[2]])));
 const primary=anchors.filter(a=>a.class?.split(' ').includes('button')&&/github\.com\/.+\.(exe|pkg|apk)$/.test(a.href));
 assert.ok(primary.length>=2);assert.equal(counters.length,primary.length);
 for(const a of primary){const fields=counters.filter(c=>c['data-download-link']===a.id);assert.equal(fields.length,1);assert.equal(a['aria-describedby'],fields[0].id);assert.ok(describeAsset(fields[0]['data-download-asset'],a.href));}
 assert.match(html,/download-stats\.js\?v=20261107-file-counts/);
 assert.match(html,/download-analytics\.js/);assert.match(html,/page-views\.js/);
});
