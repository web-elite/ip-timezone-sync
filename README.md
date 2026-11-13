# IP Timezone Sync

A Manifest V3 Chromium extension prototype.

## Install
1. Extract the ZIP.
2. Open `chrome://extensions` (or `edge://extensions` / `brave://extensions`).
3. Enable Developer mode.
4. Choose **Load unpacked** and select this folder.

## Behavior
- IP lookup from the extension service worker using ipwho.is, with ipapi.co fallback.
- Schedules: new tab, browser startup, every hour, every six hours, or manual.
- Uses the detected IANA timezone for selected JavaScript date/Intl APIs.
- Popup displays the last IP/country/timezone result.

## Important
This is a functional starting version, not a guarantee of complete fingerprint resistance. It does not change the operating-system timezone. Some worker implementations, module-worker timing, Blob-created workers, cross-origin worker restrictions, and native browser surfaces are not fully covered. Validate against the exact browser version and target sites before relying on it.

The IP lookup providers receive the public IP used by the request. IP-to-timezone is approximate, especially in countries spanning multiple timezones.
