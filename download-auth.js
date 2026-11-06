(() => {
  'use strict';
  const config = window.XPPanelsAuthConfig;
  if (!config?.enabled) return;

  const sessionKey = 'xppanels-email-session-v1';
  const byFile = new Map(Object.entries(config.assets || {}));
  const pageName = config.productName || 'XPPanelsVR Companion';
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  for (const link of document.querySelectorAll('a[href]')) {
    const id = byFile.get(link.href);
    if (id) {
      link.dataset.downloadId = id;
      link.href = '#download-account';
    }
  }
  const container = document.createElement('section');
  container.className = 'account-panel';
  container.id = 'download-account';
  container.setAttribute('aria-labelledby', 'download-account-title');
  container.innerHTML = `<div class="account-inner"><div><p class="account-kicker">PRIVATE DOWNLOADS · ${esc(pageName.toUpperCase())}</p><h2 id="download-account-title">Verify your email to download.</h2><p class="account-copy">This site stays open to everyone. Enter your email and open the sign-in link we send to verify it before downloading.</p><p class="account-state" role="status" aria-live="polite"></p><form class="account-form"><label for="account-email">Email address</label><div class="account-row"><input id="account-email" type="email" autocomplete="email" required maxlength="320" placeholder="you@example.com"><button class="account-send" type="submit">Email me a sign-in link</button></div></form><div class="account-signed-in" hidden><p>Verified as <strong class="account-email"></strong>. Your session stays in this browser tab.</p><button class="account-sign-out" type="button">Sign out</button></div><p class="account-privacy">We use your email only for download verification and to reply if you contact support. We do not use it for newsletters, marketing or other purposes, sell it, or share it for marketing. Supabase and its configured email provider send and verify sign-in links; Cloudflare delivers protected files. <a href="${esc(config.privacyUrl || '#')}">Full privacy details</a> · <a href="mailto:aldoapps@gmail.com">Questions? Contact AldoApps</a></p></div></div>`;
  const downloads = document.querySelector('#download-statistics, #downloads, #windows-download, #download');
  if (downloads) downloads.before(container); else (document.querySelector('main') || document.body).prepend(container);

  const form = container.querySelector('.account-form');
  const emailInput = container.querySelector('#account-email');
  const status = container.querySelector('.account-state');
  let pendingEmail = '';
  let session = null;
  try { session = JSON.parse(sessionStorage.getItem(sessionKey) || 'null'); } catch { sessionStorage.removeItem(sessionKey); }
  const authUrl = `${String(config.supabaseUrl || '').replace(/\/$/, '')}/auth/v1`;

  function say(message, error = false) {
    status.textContent = message;
    status.classList.toggle('is-error', error);
  }
  function showSession() {
    const signed = Boolean(session?.access_token);
    container.querySelector('.account-signed-in').hidden = !signed;
    container.querySelector('.account-email').textContent = signed ? (session.user?.email || pendingEmail) : '';
    form.hidden = signed;
    if (signed) say('Email verified. Protected downloads are ready.');
  }
  function saveSession(value) {
    session = { ...value, expires_at: Date.now() + (Number(value.expires_in || 3600) - 30) * 1000 };
    sessionStorage.setItem(sessionKey, JSON.stringify(session));
    showSession();
  }
  async function auth(path, body, bearer, method = body ? 'POST' : 'GET') {
    if (!config.supabaseUrl || !config.supabaseAnonKey) throw new Error('Email verification is not configured yet.');
    const headers = { apikey: config.supabaseAnonKey, 'Content-Type': 'application/json' };
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    const response = await fetch(`${authUrl}/${path}`, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.msg || data.message || data.error_description || 'Could not verify that email. Try again.');
    return data;
  }
  async function finishMagicLink() {
    const values = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = values.get('access_token');
    if (!accessToken) return;
    history.replaceState(null, '', `${location.pathname}${location.search}`);
    say('Checking your email verification…');
    try {
      const user = await auth('user', null, accessToken);
      if (!user.email_confirmed_at) throw new Error('Email confirmation did not complete. Request a new sign-in link.');
      saveSession({ access_token: accessToken, refresh_token: values.get('refresh_token'), expires_in: Number(values.get('expires_in') || 3600), user });
    } catch (error) { say(error.message, true); }
  }
  async function accessToken() {
    if (!session?.access_token) throw new Error('Verify your email before downloading.');
    if (session.expires_at > Date.now()) return session.access_token;
    const refreshed = await auth('token?grant_type=refresh_token', { refresh_token: session.refresh_token });
    saveSession(refreshed);
    return session.access_token;
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    pendingEmail = emailInput.value.trim();
    say('Sending a sign-in link…');
    try {
      await auth('otp', { email: pendingEmail, create_user: true, options: { emailRedirectTo: `${location.origin}${location.pathname}${location.search}` } });
      say(`Check ${pendingEmail} and open the sign-in link in this browser to verify your email. We will not send marketing email.`);
    } catch (error) { say(error.message, true); }
  });
  container.querySelector('.account-sign-out').addEventListener('click', async () => {
    const old = session;
    session = null;
    sessionStorage.removeItem(sessionKey);
    showSession();
    say('Signed out.');
    if (old?.access_token) auth('logout', {}, old.access_token).catch(() => {});
  });

  document.addEventListener('click', async event => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    const id = link.dataset.downloadId;
    if (!id) {
      if (link.dataset.emailVerify !== 'required' || session?.access_token && session.expires_at > Date.now()) return;
      event.preventDefault();
      container.scrollIntoView({ behavior: 'smooth', block: 'center' });
      emailInput.focus({ preventScroll: true });
      say('Verify your email before opening this download option.');
      return;
    }
    event.preventDefault();
    if (!session?.access_token) {
      container.scrollIntoView({ behavior: 'smooth', block: 'center' });
      emailInput.focus({ preventScroll: true });
      say('Verify your email to download this file.');
      return;
    }
    const label = link.textContent.trim();
    link.setAttribute('aria-busy', 'true');
    say(`Preparing ${label || 'your download'}…`);
    try {
      const token = await accessToken();
      const response = await fetch(`${String(config.workerUrl || '').replace(/\/$/, '')}/download/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) {
        const message = await response.text();
        if (response.status === 401) { session = null; sessionStorage.removeItem(sessionKey); showSession(); }
        throw new Error(message || 'Download could not be authorized.');
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const download = document.createElement('a');
      download.href = objectUrl;
      download.download = response.headers.get('Content-Disposition')?.match(/filename="?([^";]+)"?/)?.[1] || 'xppanels-download';
      document.body.append(download);
      download.click();
      download.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      say('Download started.');
    } catch (error) { say(error.message, true); }
    finally { link.removeAttribute('aria-busy'); }
  });
  finishMagicLink().finally(showSession);
})();
