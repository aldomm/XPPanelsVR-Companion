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

The matching headset 2.0 is now available on the App Store.
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
Companion terms before installation. Windows uses its separate installer below.

## Windows full installer

**2.0 (5)** (`2.0.0-build.5`), Windows 11 x64, AldoApps self-signed installer. The publisher
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
[release metadata](windows-release.json), and the `windows-v2.0-build5` release
describe hashes, included dependencies, offline evidence and unverified live checks.
The older Windows 0.3.1 preview remains in [the archive](Windows-Releases.html). Capture/control build 3 is included in Companion build 5.

Both Mac packages retain their `-preview` filenames and bundled notices. The 0.1.2
assets, checksums and download history are preserved. The new package has its own
release tag `mac-v2.0-build3`, checksums and notarization evidence.

Entertainment only, not real aviation or certified training. Independent of Apple,
Laminar Research and ToLiss. Simulator, aircraft and headset app licences are separate.

Support: [aldoapps@gmail.com](mailto:aldoapps@gmail.com).

## Anonymous download analytics

All downloads stay public on GitHub. No email, registration, sign-in or payment is required.
The new anonymous link-request counter is prepared but disabled until its Cloudflare
Workers FREE endpoint and D1 FREE database are configured. An analytics failure or
quota limit never controls or delays the direct download link.

The planned owner-only report separates website download-link requests (by UTC day,
immutable release asset ID, file/version, platform and approximate country) from
GitHub per-asset download_count totals. Neither means completed downloads, installs,
unique people or bot-free traffic. Direct GitHub links bypass website tracking;
VPNs/proxies can change the apparent country. No email, account ID, raw IP,
fingerprint or tracking cookie is stored by the counter. Providers may process
connection information under their own terms.

The previous auth-service draft is superseded and must not be deployed. The current
setup, free limits and private report commands are documented in the Companion
repository's analytics-service/README.md. No R2, Supabase, SMTP, paid plan or domain
purchase is involved. Optional support remains aldoapps@gmail.com.

## Windows updates and retained downloads

`windows-updates.json` is the Companion's one-shot/manual website update feed.
It lists only the Windows installer actually offered on this site, independently
from Mac releases. Never advance it for an unpublished test build.
Keep prior public release assets immutable and retain links and honest headset
compatibility notes in `Windows-Releases.html` when changing the latest download.
No headset heartbeat or headset app version report is required.
Windows 2.0 publication was authorized after the headset 2.0 App Store release. No headset heartbeat or receiver rebuild is required.

The public GitHub download counter was removed from the landing page. The planned owner-only analytics service is not active.
