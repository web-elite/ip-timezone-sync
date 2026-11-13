# IP Timezone Sync

A Manifest V3 Chromium extension that looks up the IANA timezone associated with the public IP used by the extension service worker and applies it to selected JavaScript Date and Intl APIs.

## Protection levels\nThe default is **Level 1 (Light)** to minimize page overhead. Levels are cumulative:\n- **Level 1 — Light:** overrides only the default timezone used by `Intl.DateTimeFormat`; native `Date` behavior remains unchanged. Lowest overhead, but intentionally partial consistency.\n- **Level 2 — Core Date APIs:** adds local `Date` getters, timezone offset, string methods, and locale methods.\n- **Level 3 — Date setters:** adds timezone-aware local setters.\n- **Level 4 — Full compatibility:** adds the custom `Date` constructor and supported local string parsing. This has the broadest API surface and the highest compatibility/performance risk.\n\nChanging the level in Settings reloads open HTTP(S) tabs so the selected profile is installed cleanly. Higher levels are not guaranteed to be undetectable and can increase CPU use or site incompatibilities.\n\n## Features
- IP timezone lookup through ipwho.is, with ipapi.co fallback.
- Manual and scheduled refresh modes.
- Default timezone for Intl.DateTimeFormat unless the caller explicitly supplies one.
- Timezone-aware local Date getters, setters, multi-argument construction, and supported local string parsing.
- Native `Date.parse` fallback for explicit-offset, UTC, and unsupported formats.
- Historical `Intl.DateTimeFormat` → `Date` parse round-trip coverage, including sub-minute historical offsets.
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
They cover Date parsing/construction, historical Intl-to-Date round trips across supported IANA zones, local getters/setters, explicit timezone overrides, UTC invariants, timezone switching, and DST transitions. They are Node-based behavioral tests, not a substitute for testing in Chromium and on target sites.

## Version
**1.2.0**


### Performance and scope (1.2.0)
- The timezone shim and bridge are injected into the top-level page only; child frames are intentionally excluded to avoid multiplying work across iframe-heavy sites.
- Formatter instances use a bounded 32-entry LRU cache.
- Local-time conversion samples three nearby offsets rather than scanning 33 timestamps for every conversion.
- The extension still modifies page-realm JavaScript Date/Intl APIs and may be detectable; it does not change the browser or operating-system timezone.
