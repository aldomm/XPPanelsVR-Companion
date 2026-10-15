# XPPanelsVR Companion for Mac

[Official download page](https://aldomm.github.io/XPPanelsVR-Companion/) |
[Setup guide](https://aldomm.github.io/XPPanelsVR-Companion/Help.html) |
[Releases](https://github.com/aldomm/XPPanelsVR-Companion/releases)

This repository publishes the official Mac Companion installer and website, not the
application source code. Companion supplies live instrument and Outside View streaming
for XPPanelsVR, available separately on the Apple Vision Pro App Store.

## Current Mac Installer

**0.1.2, build 3**. macOS 15+, universal arm64/x86_64 binary. Intel runtime is
not yet qualified. App, plugin and installer are Developer ID signed. Apple accepted
the package for notarization; its ticket is stapled and Gatekeeper verification passed.
The Mac Companion is directly distributed by AldoApps; the Vision Pro app has its own
App Store approval. Permissions may need reapproval when updating a differently signed build.

Video travels directly between the Mac and headset on a trusted private network.
The local protocols do not add transport encryption and address approval is not
cryptographic pairing. Use devices you trust, protect Wi-Fi access, avoid shared/public
networks and do not forward simulator or streaming ports to the internet.

Companion includes Display Bridge, hardware outside-video encoding, an optional
virtual ultrawide monitor, a control preview, and the XPPanelsBridge installer.
It does not install DeskPad, BetterDisplay, WebFMC, SDKs or developer tools.

Display Bridge is for X-Plane with licensed ToLiss A320/A321 aircraft and working
detached pop-outs. Live-tested setup: Apple silicon, X-Plane 12.4.3 and A320 v1.2.1.
A321, X-Plane 11, Intel and other versions require further qualification.

After updating Companion, quit X-Plane and choose **Install / Update Plugin** in
Setup. Updating the Mac app alone does not update the simulator plugin.

SHA-256 checksums and JSON metadata accompany every package. Read the guide and
Companion terms before installation. No Windows Companion installer is supplied here.

The original release tag, installer filename and bundled documents retain the
`-preview` designation. The October 15 website revision does not replace or re-sign
that package. Existing checksums, download URLs and download statistics are preserved.

Entertainment only, not real aviation or certified training. Independent of Apple,
Laminar Research and ToLiss. Simulator, aircraft and headset app licences are separate.

Support: [aldoapps@gmail.com](mailto:aldoapps@gmail.com).

## Download Statistics

The download section reads GitHub's public release API and shows the total across
published `XPPanelsVR-Companion-*.pkg` assets and the version linked on this page.
Drafts, checksums, JSON metadata and source archives are excluded. These are download
events, including repeat downloads and tests, not unique people or installations.
Deleting/replacing assets or retiring releases can reduce the current public total.
Do not subtract totals blindly when comparing reports; compare stable asset IDs and
flag missing assets, replaced assets or reduced counts as a reporting discontinuity.

The request is unauthenticated, paginated and time-bounded. Rate limits or failures
show Unavailable, not a misleading zero. No download requests, visitor tracking,
cookies or browser storage are added. When updating the download button, also update
the `data-release` attribute to the exact public release tag.

Offline checks: `node --test tests/download-stats.test.cjs`.
Fetch a JSON snapshot without downloading any installer:

```sh
node -e 'require("./download-stats.js").loadStats().then(s => console.log(JSON.stringify(s, null, 2))).catch(e => { console.error(e.message); process.exitCode = 1; })'
```

The publisher's weekly email is a separate, private Codex scheduled task, not a
website visitor subscription or a GitHub Actions email service. It needs the local
Mac awake, Codex running and its Gmail connection available. Recipient and report
history are not stored in this public repository.
