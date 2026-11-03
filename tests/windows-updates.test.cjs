const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
test('Windows update feed advertises only the retained public installer', () => {
  const feed = JSON.parse(fs.readFileSync('windows-updates.json', 'utf8'));
  const release = JSON.parse(fs.readFileSync('windows-release.json', 'utf8'));
  assert.equal(feed.platform, 'windows-x64');
  assert.equal(feed.latest.version, release.version);
  assert.equal(feed.latest.published, true);
  assert.equal(feed.latest.releaseUrl, release.releaseUrl);
  assert.equal(feed.latest.downloadPage, 'https://aldomm.github.io/XPPanelsVR-Companion/#windows-download');
  const archive = fs.readFileSync('Windows-Releases.html', 'utf8');
  assert.ok(archive.includes(release.installer.url));
  assert.ok(archive.includes(release.releaseUrl));
  assert.ok(archive.includes('not qualified across every App Store build'));
  assert.ok(fs.readFileSync('index.html', 'utf8').includes('href="Windows-Releases.html"'));
});
