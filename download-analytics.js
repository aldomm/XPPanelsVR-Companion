/* Anonymous link-request counts only. GitHub links always work independently. */
(() => {
  'use strict';
  const config = window.XPPanelsAnalyticsConfig;
  if (!config?.enabled || !config.endpoint) return;
  let endpoint;
  try {
    endpoint = new URL(config.endpoint);
    if (endpoint.protocol !== 'https:' || !endpoint.hostname.endsWith('.workers.dev') ||
        endpoint.pathname !== '/event' || endpoint.search || endpoint.hash ||
        endpoint.username || endpoint.password) return;
  } catch { return; }
  function track(event) {
    if (!event.isTrusted || event.defaultPrevented ||
        (event.type === 'click' ? event.button !== 0 : event.button !== 1)) return;
    const link = event.target?.closest?.('a[href]');
    const asset = link && config.assets?.[link.href];
    if (!asset) return;
    try {
      // No await, preventDefault, URL rewriting, storage, retry or cookies.
      // Keepalive can finish after navigation; failures leave the native link alone.
      Promise.resolve(fetch(endpoint.href, {
        method: 'POST', body: JSON.stringify({ asset }),
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        keepalive: true, credentials: 'omit', referrerPolicy: 'no-referrer',
        cache: 'no-store', mode: 'cors', redirect: 'error',
      })).catch(() => {});
    } catch { /* Even synchronous tracking failures must not interrupt downloads. */ }
  }
  document.addEventListener('click', track);
  document.addEventListener('auxclick', track);
})();
