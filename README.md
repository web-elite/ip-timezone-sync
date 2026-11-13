# IP Timezone Sync

A Manifest V3 Chromium extension that looks up the IANA timezone associated with the public IP used by the extension service worker and applies it to selected JavaScript Date and Intl APIs.

## Features
- IP timezone lookup through ipwho.is, with ipapi.co fallback.
- Manual and scheduled refresh modes.
- Default timezone for Intl.DateTimeFormat unless the caller explicitly supplies one.
- Local Date getters, string/locale formatting, and local setters.
- Custom extension icon.

## Install
1. Download or clone this repository.
2. Open chrome://extensions (or the equivalent page in Edge/Brave).
3. Enable Developer mode.
4. Select Load unpacked and choose the project folder.

## Startup timing
The page-world shim starts at document_start. The isolated-world bridge obtains the saved timezone asynchronously from extension storage and forwards it to the page world. A page that executes timezone-sensitive JavaScript immediately at startup may observe the browser timezone before the update arrives. The bridge uses a readiness handshake, but cannot guarantee that every page script waits for the setting.

## Workers and frames
The shim is installed in matching frames where Chromium permits content scripts. Worker globals are not rewritten. Rewriting arbitrary worker URLs as Blob URLs can break module imports, relative paths, CORS, CSP, and origin semantics, so this version leaves native Worker and SharedWorker loading untouched. Service workers are outside the content-script injection model.

## Privacy and limitations
- Does not change the operating-system or browser-profile timezone.
- Lookup providers receive the public IP used by the extension service worker; this may differ from a tab-specific proxy or VPN route.
- IP geolocation is approximate.
- JavaScript built-in modifications are observable. No fingerprint-resistance, stealth, or fraud-detection bypass is promised.
- Some browser APIs, workers, service workers, native surfaces, and early startup observations remain outside its coverage.

## Tests
Run the Node.js smoke tests with: node tests/timezone.test.cjs
They cover local getters/setters, default Intl timezone, explicit timezone preservation, and a daylight-saving transition. They do not prove compatibility with every browser or site.

## Version
**1.0.2**
