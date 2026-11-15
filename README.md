# 🌍 IP Timezone Sync

[🇮🇷 فارسی](README.fa.md)

**IP Timezone Sync** is an extension for Chromium-based browsers. It helps make the timezone websites receive from your browser more consistent with the timezone associated with your internet IP address.

## 🤔 What does it do?

Imagine you are using a VPN or proxy and your internet IP belongs to another country, while your browser is still using your device's local timezone. Some websites may then receive different timezone information from your IP and your browser.

This extension detects the approximate timezone associated with your public IP and tries to align some of the date and time information websites can read from your browser.

For example, if your IP is associated with Sweden, the extension tries to make websites see the corresponding Swedish timezone.

> 💡 **Good to know:** The extension does not change your Windows, operating-system, or browser timezone settings. Results depend on the website and the selected level. It does not guarantee perfect consistency or invisibility to detection tools.

## ✨ Features

- 🌐 Detects the approximate timezone associated with your internet IP.
- 🔄 Lets you check your IP again whenever you want.
- ⏱️ Can check automatically when the browser starts or a new tab opens.
- 🕐 Supports automatic checks every one or six hours.
- 🎚️ Offers four levels, from lightweight to broader timezone compatibility.
- ⚡ Designed to avoid unnecessary work and keep resource usage in mind.
- 🧭 Made for Chromium-based browsers that support Manifest V3 extensions, such as Google Chrome, Microsoft Edge, Brave, Opera, and Vivaldi. These are examples, not a complete list of supported browsers.

## 🎚️ Which level should I choose?

There are four levels. Higher levels try to align more of the date and time behavior websites can read. They may also use more resources or cause compatibility issues on some websites.

- **Level 1 — Light (default):** The lightest option. Recommended for everyday use and as the starting point.
- **Level 2 — More alignment:** Aligns additional date and time behavior.
- **Level 3 — Advanced:** Provides broader alignment for websites that still show timezone differences.
- **Level 4 — Maximum:** The broadest compatibility option, with a higher chance of resource use or website compatibility issues.

> ✅ **Our recommendation:** Start with Level 1. If a website still shows timezone differences, try the higher levels one at a time. You do not need to use Level 4 all the time.

## 📥 Installation

You can currently install the extension manually:

1. Download the ZIP file from the [project's GitHub page](https://github.com/web-elite/ip-timezone-sync) and extract it.
2. Open your browser's extensions page. For example:
   - Chrome and Brave: `chrome://extensions`
   - Microsoft Edge: `edge://extensions`
   - For other Chromium-based browsers, open their extensions management page.
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the extracted project folder.
5. Open the extension settings and choose your preferred level and IP-check schedule.

## ⚙️ How to use it

After installation, open the extension settings and choose when it should check your IP:

- **New tab:** Checks when a new tab is opened.
- **Browser startup:** Checks when the browser starts.
- **Every 1 hour / 6 hours:** Checks automatically every one or six hours.
- **Manual only:** Does not check automatically. Click **Check IP now** whenever you want to run a check.

Click **Save settings** to apply your changes. Changing the protection level reloads open tabs so the new setting can take effect.

## 🔐 Privacy and important notes

- To find the timezone associated with your IP, the extension uses [ipwho.is](https://ipwho.is/) and may use [ipapi.co](https://ipapi.co/) as a fallback. These services receive the public IP address used for the lookup.
- IP-based timezone detection is approximate and does not necessarily represent your actual location.
- If you use a VPN or proxy, the result depends on the IP address seen by the lookup service. A proxy configured only inside another application may not affect the extension's request.
- The extension does not change your Windows or operating-system timezone.
- Some websites may still detect your device's original timezone or use other methods to determine it.
- Higher levels may not work well with every website. If a site behaves incorrectly, lower the level or return to Level 1.
- This is not an anonymity tool and does not guarantee bypassing identity, fraud-detection, or browser-fingerprinting systems.

## 🧪 Version

**1.2.0**
