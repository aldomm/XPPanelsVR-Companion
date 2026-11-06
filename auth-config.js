// Shared email verification and download worker. Keep disabled until configured and private assets are migrated.
window.XPPanelsAuthConfig = {
  enabled: false,
  productName: 'Apple Vision Pro Companion',
  supabaseUrl: '',
  supabaseAnonKey: '',
  workerUrl: '',
  privacyUrl: 'Website-Privacy.html',
  assets: {
    'https://github.com/aldomm/XPPanelsVR-Companion/releases/download/windows-v2.0-build5/XPPanelsVisionProCompanion-2.0.0-build.5-windows-x64-SELF-SIGNED.exe': 'vision-win-2.0-build5',
    'https://github.com/aldomm/XPPanelsVR-Companion/releases/download/windows-v2.0-build4/XPPanelsVisionProCompanion-2.0.0-build.4-windows-x64-SELF-SIGNED.exe': 'vision-win-2.0-build4',
    'https://github.com/aldomm/XPPanelsVR-Companion/releases/download/windows-v0.3.1-preview.1/XPPanelsVisionProCompanion-0.3.1-preview.1-windows-x64-SELF-SIGNED.exe': 'vision-win-0.3.1',
    'https://github.com/aldomm/XPPanelsVR-Companion/releases/download/mac-v2.0-build3/XPPanelsVR-Companion-2.0-build3-preview.pkg': 'vision-mac-2.0-build3',
    'https://github.com/aldomm/XPPanelsVR-Companion/releases/download/v0.1.2-preview/XPPanelsVR-Companion-0.1.2-preview.pkg': 'vision-mac-0.1.2',
    'https://github.com/aldomm/XPPanelsVR-Companion/releases/download/mac-v2.0-build3/XPPanelsVR-Companion-2.0-build3-preview.sha256': 'vision-mac-2.0-build3-checksum',
    'https://github.com/aldomm/XPPanelsVR-Companion/releases/download/windows-v2.0-build5/AldoApps-Preview-Signing.cer': 'vision-win-signing-certificate',
    'https://github.com/aldomm/XPPanelsVR-Companion/releases/download/windows-v2.0-build5/SHA256SUMS.txt': 'vision-win-checksums',
    'https://github.com/aldomm/XPPanelsVR-Companion/releases/download/windows-v0.3.1-preview.1/Windows-Setup.html': 'vision-win-legacy-setup',
    'https://github.com/aldomm/XPPanelsVR-Companion/releases/download/windows-v0.3.1-preview.1/Windows-Third-Party-Notices.zip': 'vision-win-legacy-notices',
  },
};
