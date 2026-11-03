# XPPanelsVR Companion for Mac and Windows · Apple Vision Pro

[Official download page](https://aldomm.github.io/XPPanelsVR-Companion/) |
[Setup guide](https://aldomm.github.io/XPPanelsVR-Companion/Help.html) |
[Releases](https://github.com/aldomm/XPPanelsVR-Companion/releases)

This repository publishes the official Mac and Windows Companion installers and website, not the
application source code. Companion supplies live instrument and Outside View streaming
for XPPanelsVR, available separately on the Apple Vision Pro App Store.

## Current Mac Installer

**2.0, build 3**. macOS 15+, universal arm64/x86_64 binary. Intel runtime is
not yet qualified. App, plugin and installer are Developer ID signed. Apple accepted
the package for notarization; its ticket is stapled and Gatekeeper verification passed.
The Mac Companion is directly distributed by AldoApps; the Vision Pro app has its own
App Store approval. Permissions may need reapproval when updating a differently signed build.

The matching headset 2.0 (3) has been uploaded but is not yet publicly released.
This Mac package retains its bundled preview terms and qualification notices;
notarization does not complete clean-Mac, Intel or sustained headset qualification.
The unchanged [0.1.2 installer](https://github.com/aldomm/XPPanelsVR-Companion/releases/tag/v0.1.2-preview)
remains available for the earlier headset version and as a rollback option.
Version 2.0 includes the product-specific uninstaller, ISCS preparation/input,
optional X-Plane audio and the updated hand-flight plugin. Install / Update Plugin
with X-Plane closed; an application update alone does not replace that plugin.

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
Companion terms before installation. Windows uses the separate preview below.

## Windows full installer

**0.3.1-preview.1**, Windows 11 x64, free self-signed testing preview. The publisher
is not automatically trusted by Windows. Keep OS security enabled; the public
certificate is provided for inspection, without requiring a trust-store import.

The complete installer includes the app/private Python runtime, native capture
and media bridge, command plugin and optional experimental curved foveated sender.
Application-private CloudXR Runtime 6.2.3 and Stream Manager 6.1.0 runtime portions,
OpenXR loader, managed dependencies, VC runtime DLLs and their notices are included.
No developer SDK bundle, headers, import libraries, audio driver or compiler is
distributed. Experimental mode requires separate NVIDIA terms/opt-in and supported
NVIDIA hardware/drivers; it does not change the global OpenXR runtime.

Use Custom JSON UDP 49002, media TCP 49200 and explicit curved signaling 55010.
Native stereo 55000 and native UDP receiver routing are not qualified here.
Installer never launches the simulator/sharing or installs a simulator plugin
automatically. Use Companion's guarded plugin Install / Update with X-Plane closed.
Quest remains a separate product. [Windows guide](Windows-Help.html),
[release metadata](windows-release.json), and the `windows-v0.3.1-preview.1` release
describe hashes, included dependencies, offline evidence and unverified live checks.
Windows assets and version are unchanged by the Mac 2.0 (3) publication.

Both Mac packages retain their `-preview` filenames and bundled notices. The 0.1.2
assets, checksums and download history are preserved. The new package has its own
release tag `mac-v2.0-build3`, checksums and notarization evidence.

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

## Windows updates and retained downloads

`windows-updates.json` is the Companion's one-shot/manual website update feed.
It lists only the Windows installer actually offered on this site, independently
from Mac releases. Never advance it for an unpublished test build.
Keep prior public release assets immutable and retain links and honest headset
compatibility notes in `Windows-Releases.html` when changing the latest download.
No headset heartbeat or headset app version report is required.
Windows 2.0 remains held; the submitted App Store app is unchanged.
