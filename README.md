# XPPanelsVR Companion for Mac

[Official download page](https://aldomm.github.io/XPPanelsVR-Companion/) |
[Setup guide](https://aldomm.github.io/XPPanelsVR-Companion/Help.html) |
[Releases](https://github.com/aldomm/XPPanelsVR-Companion/releases)

This repository publishes the website and binary **testing previews**, not the
application source code. XPPanelsVR for Apple Vision Pro is a separate product.

## Current Preview

**0.1.2, build 3**. macOS 15+, universal arm64/x86_64 binary. Intel runtime is
not yet qualified. App, plugin and installer are Developer ID signed. Apple accepted
the package for notarization; its ticket is stapled and Gatekeeper verification passed.
**Still a testing preview, not App Store approval or a commercially cleared release.**
Live installation/streaming with the signed build and clean-Mac qualification remain
outstanding. Permissions may need reapproval when updating a differently signed build.

Use only on a trusted private LAN. Video and simulator UDP are not encrypted,
and IP-address approval is not secure pairing. Never forward ports to the internet.

Companion includes Display Bridge, hardware outside-video encoding, an optional
virtual ultrawide monitor, a control preview, and the XPPanelsBridge installer.
It does not install DeskPad, BetterDisplay, WebFMC, SDKs or developer tools.

Display Bridge is for X-Plane with licensed ToLiss A320/A321 aircraft and working
detached pop-outs. Live-tested setup: Apple silicon, X-Plane 12.4.3 and A320 v1.2.1.
A321, X-Plane 11, Intel and other versions require further qualification.

After updating Companion, quit X-Plane and choose **Install / Update Plugin** in
Setup. Updating the Mac app alone does not update the simulator plugin.

SHA-256 checksums and JSON metadata accompany every package. Read the guide and
preview terms before installation. No Windows Companion installer is supplied here.

Entertainment only, not real aviation or certified training. Independent of Apple,
Laminar Research and ToLiss. Simulator, aircraft and headset app licences are separate.

Support: [aldoapps@gmail.com](mailto:aldoapps@gmail.com).
