/* Anonymous landing-page loads only; no cookies, identifiers or navigation dependency. */
(() => {
  'use strict';
  const config=window.XPPanelsAnalyticsConfig;
  const pages={
    '/XPPanelsVR-Companion/':'vision','/XPPanelsVR-Companion/index.html':'vision',
    '/XPPanelsVR-Quest/':'quest','/XPPanelsVR-Quest/index.html':'quest',
  };
  const path=window.location.pathname,product=pages[path];
  if(window.location.origin!=='https://aldomm.github.io'||!product||!config?.enabled||window.__xppanelsPageViewStarted) return;
  let endpoint;
  try {
    endpoint=new URL(config.endpoint);
    if(endpoint.protocol!=='https:'||endpoint.hostname!=='xppanels-download-analytics.aldoapps.workers.dev'||endpoint.pathname!=='/event'||endpoint.search||endpoint.hash||endpoint.username||endpoint.password) return;
    endpoint.pathname='/page-view';
  } catch {return;}
  window.__xppanelsPageViewStarted=true; // Per-document guard, never persistent storage.
  let sent=false;
  function track() {
    if(sent||document.prerendering) return;
    sent=true;
    try {
      Promise.resolve(fetch(endpoint.href,{
        method:'POST',body:JSON.stringify({product,path}),
        headers:{'Content-Type':'text/plain;charset=UTF-8'},
        keepalive:true,credentials:'omit',referrerPolicy:'no-referrer',
        cache:'no-store',mode:'cors',redirect:'error',
      })).catch(()=>{});
    } catch { /* Page use and downloads continue if tracking fails. */ }
  }
  if(document.prerendering) document.addEventListener('prerenderingchange',track,{once:true});
  else track();
})();
