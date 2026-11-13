# IP Timezone Sync

A Manifest V3 extension for Chromium-based browsers that detects the timezone associated with the browser's public IP address and applies it to selected JavaScript date and internationalization APIs on web pages.

## Features

- Detects the public IP timezone using [ipwho.is](https://ipwho.is/) with [ipapi.co](https://ipapi.co/) as a fallback.
- Supports manual checks and scheduled checks (on browser startup, on new tabs, hourly, or every six hours).
- Applies the selected IANA timezone to `Intl.DateTimeFormat` when the caller does not explicitly provide a timezone.
- Overrides selected local `Date` getters and date/string formatting methods.
- Includes a popup and options page for status and settings.

## Install (developer mode)

1. Download or clone this repository.
2. Open `chrome://extensions` (or `edge://extensions` / `brave://extensions`).
3. Enable **Developer mode**.
4. Select **Load unpacked** and choose the project folder.

## How it works

The extension service worker queries the timezone lookup providers. The resulting IANA timezone is stored in extension storage and sent to matching tabs. A content-script bridge passes the setting into the page's main JavaScript world, where the extension patches selected `Date` and `Intl` APIs.

## Privacy

The timezone lookup providers receive the public IP address used by the extension's network request. The lookup is performed by the extension service worker, so the observed IP may differ from the IP used by a particular tab if the browser, operating system, or another application uses different proxy or VPN routing. Review the providers' privacy policies before use.

## Limitations

- This does **not** change the operating-system timezone or the browser's native timezone configuration.
- IP geolocation is approximate. VPN exits, mobile networks, corporate gateways, and countries with multiple timezones can produce an unexpected result.
- This is JavaScript API compatibility behavior, not a guarantee of complete fingerprint resistance or undetectability.
- Not every browser surface or date/time API is patched. Worker behavior has limitations, especially for module workers, cross-origin restrictions, and Blob-created workers.
- Page scripts may detect modified JavaScript built-ins, and sites can use other signals to infer the device's actual timezone or location.
- Validate the extension against your target browser versions and websites before relying on it.

## Version

Current extension version: **1.0.1**.
