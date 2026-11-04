const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = name => fs.readFileSync(name, 'utf8');
test('Windows update feed matches the main Windows download, independently from Mac', () => {
  const feed = JSON.parse(read('windows-updates.json'));
  const release = JSON.parse(read('windows-release.json'));
  assert.equal(feed.platform, 'windows-x64');
  assert.equal(feed.latest.version, release.version);
  assert.equal(feed.latest.published, true);
  assert.equal(feed.latest.releaseUrl, release.releaseUrl);
  assert.equal(feed.latest.downloadPage, 'https://aldomm.github.io/XPPanelsVR-Companion/#windows-download');
  assert.ok(read('index.html').includes('id="windows-installer" href="'+release.installer.url+'"'));
  assert.ok(read('Windows-Help.html').includes(release.installer.url));
  assert.ok(read('Windows-Releases.html').includes(release.installer.url));
});
test('previous Windows and Mac downloads remain available in a visible archive section', () => {
  const index = read('index.html'), archive = read('Windows-Releases.html');
  assert.ok(index.includes('id="older-downloads"'));
  assert.ok(index.includes('href="Windows-Releases.html"'));
  assert.ok(archive.includes('/windows-v0.3.1-preview.1/XPPanelsVisionProCompanion-0.3.1-preview.1-windows-x64-SELF-SIGNED.exe'));
  assert.ok(archive.includes('not qualified across every App Store build'));
  assert.ok(index.includes('/mac-v2.0-build3/XPPanelsVR-Companion-2.0-build3-preview.pkg'));
  assert.ok(index.includes('/releases/tag/v0.1.2-preview'));
});
test('signature guidance matches this installer and does not claim automatic Windows trust', () => {
  const release = JSON.parse(read('windows-release.json')), signing = read('Windows-Signing.html');
  assert.equal(release.signing.caTrusted, false);
  assert.equal(release.signing.trustStoreImportRequired, false);
  assert.ok(signing.includes(release.installer.sha256));
  assert.ok(signing.includes(release.signing.certificateThumbprintSHA1));
  assert.ok(signing.includes(release.signing.certificateSha256));
  assert.ok(signing.includes('self-signed certificate'));
  assert.ok(signing.includes('Keep Windows security protections enabled'));
});
