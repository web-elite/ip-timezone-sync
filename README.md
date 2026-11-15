# IP Timezone Sync

[فارسی](README.fa.md)

A Chromium Manifest V3 extension that detects the IANA timezone associated with the public IP used by the extension service worker and applies it to selected page-level JavaScript `Intl` and `Date` APIs.

> **Default protection level: Level 1 (Light).** It is designed to keep page overhead low. Higher levels progressively modify more JavaScript APIs and may have a greater performance and compatibility cost.

## Features

- Detects the public IP timezone using [ipwho.is](https://ipwho.is/) with [ipapi.co](https://ipapi.co/) as a fallback.
- Supports manual, browser-startup, new-tab, hourly, and six-hour refresh modes.
- Provides four configurable protection levels.
- Preserves an explicit `timeZone` option supplied by a website to `Intl.DateTimeFormat`.
- Runs the page shim at `document_start` in the top-level frame.
- Uses a bounded formatter cache and a reduced offset-probing strategy to limit unnecessary work.

## Protection levels

The levels are cumulative: each level includes the behavior of the levels below it.

| Level | Profile | APIs covered |
|---|---|---|
| **1** | **Light** (default) | Sets the default timezone for `Intl.DateTimeFormat`. Native `Date` behavior is unchanged. Lowest overhead, but `Date` and `Intl` may report different timezones. |
| **2** | **Core Date APIs** | Adds local `Date` getters, `getTimezoneOffset()`, date/time string methods, and locale formatting methods. |
| **3** | **Date setters** | Adds timezone-aware local `Date` setters. |
| **4** | **Full compatibility** | Adds a `Date` constructor proxy, multi-argument local date construction, and supported local date-string parsing. Broadest coverage and highest performance/compatibility risk. |

To change the level, open the extension's **Settings**, choose a protection level, and click **Save settings**. When the level changes, open HTTP(S) tabs are reloaded so the new profile is applied consistently. The default is Level 1.

**Choosing a level:** use Level 1 for everyday browsing and minimum overhead. Increase the level only on sites that need additional Date/Intl consistency. Level 4 is intended for stricter compatibility tests, not as a recommended global default.

## Installation

1. Download the repository as a ZIP and extract it, or clone it:
   ```bash
   git clone https://github.com/web-elite/ip-timezone-sync.git
   ```
2. Open `chrome://extensions` in Chrome, or the equivalent extensions page in Edge or Brave.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the extracted project directory.
5. Open the extension's **Settings** to choose a protection level and IP-check schedule.

## IP-check schedule

- **New tab:** checks when a new tab is created.
- **Browser startup:** checks when the browser starts.
- **Every 1 hour / 6 hours:** checks on a repeating schedule.
- **Manual only:** checks only when **Check IP now** is used.

The lookup runs from the extension service worker. It normally uses the browser's configured proxy or system VPN route; a proxy configured only inside another application may not affect this request.

## How it works

The extension asks an IP geolocation provider for the timezone associated with the public IP seen by the extension service worker. It then passes the resulting IANA timezone (for example, `Europe/Stockholm`) to a small shim running in the page's JavaScript world.

The shim is injected at `document_start`, while the isolated-world bridge reads the saved configuration asynchronously. A page that runs timezone-sensitive code immediately may execute before the saved timezone has reached the page. The readiness handshake reduces timing issues but cannot guarantee that every page waits for the update.

## Privacy

- The extension sends a request to ipwho.is and may use ipapi.co as a fallback.
- Those providers receive the public IP address used for the lookup.
- The lookup IP may differ from the IP used by a tab-specific proxy, VPN extension, or application-level tunnel.
- IP geolocation is approximate. The returned timezone is the provider's estimate for the public IP, not a precise device-location result.

## Limitations and compatibility

- This extension does **not** change the operating-system timezone or the browser profile's native timezone.
- The shim modifies selected JavaScript APIs in the top-level page. It does not rewrite Worker, SharedWorker, or Service Worker globals.
- Child frames are intentionally excluded; content scripts run only in the top-level frame.
- Browser-native surfaces, workers, service workers, early startup observations, and explicit website behavior may expose timezone inconsistencies.
- JavaScript built-in modifications can be observed. This project does not promise stealth, fingerprint resistance, or bypassing fraud-detection systems.
- Higher protection levels modify more APIs and can increase CPU use, expose compatibility edge cases, or break site scripts. If a site behaves incorrectly, return to Level 1.

## Tests

Requires Node.js 22 or newer. Run:

```bash
node tests/timezone.test.cjs
node tests/historical-zones.test.cjs
```

The tests cover protection-level behavior, Date parsing and construction, local getters and setters, explicit timezone overrides, UTC invariants, timezone switching, DST behavior, and historical `Intl.DateTimeFormat`-to-`Date` parsing across supported IANA zones.

These are Node.js behavioral tests. They are not a substitute for testing the extension in Chromium and on the websites you use.

## Performance notes

- Content scripts run only in the top-level frame to avoid multiplying work on iframe-heavy pages.
- `Intl.DateTimeFormat` instances are kept in a bounded 32-entry LRU cache.
- Local-time conversion samples three nearby offsets instead of scanning 33 timestamps for every conversion.
- Level 1 avoids replacing the native `Date` constructor and is the lightest profile.

## Version

**1.2.0**
