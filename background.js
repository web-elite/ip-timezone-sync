const DEFAULTS = {
  mode: "6h",                 // tab | startup | 1h | 6h | manual\n  level: 1,                    // 1 = light, 4 = strict
  refreshHours: 6,
  timezone: "UTC",
  ip: "",
  country: "",
  countryCode: "",
  checkedAt: 0,
  lastError: ""
};

async function getSettings() {
  return { ...DEFAULTS, ...(await chrome.storage.local.get(DEFAULTS)) };
}

async function lookupIpTimezone() {
  // Requests are made by the extension service worker, so Chromium's configured
  // system/browser proxy and a system-level VPN are used for the outbound request.
  let data;
  try {
    const r = await fetch("https://ipwho.is/", { cache: "no-store" });
    if (!r.ok) throw new Error(`ipwho.is HTTP ${r.status}`);
    data = await r.json();
    if (!data.success || !data.timezone?.id) throw new Error(data.message || "IP lookup failed");
    return {
      ip: data.ip || "",
      country: data.country || "",
      countryCode: data.country_code || "",
      timezone: data.timezone.id
    };
  } catch (firstError) {
    const r = await fetch("https://ipapi.co/json/", { cache: "no-store" });
    if (!r.ok) throw new Error(`IP lookup failed: ${firstError.message}; ipapi.co HTTP ${r.status}`);
    data = await r.json();
    if (!data.timezone) throw new Error(data.reason || data.error || "No timezone returned by fallback provider");
    return {
      ip: data.ip || "",
      country: data.country_name || "",
      countryCode: data.country_code || "",
      timezone: data.timezone
    };
  }
}

async function checkAndSave(reason = "manual") {
  const result = await lookupIpTimezone();
  const old = await getSettings();
  const next = {
    ...old,
    ...result,
    checkedAt: Date.now(),
    lastError: ""
  };
  await chrome.storage.local.set(next);
  await notifyTabs(next.timezone, next.level || 1);
  return { ...next, reason, changed: old.timezone !== next.timezone || old.ip !== next.ip };
}

async function notifyTabs(timezone, level) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (!tab.id || !/^https?:/.test(tab.url || "")) continue;
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "IPTZ_UPDATE", timezone, level });
    } catch (_) {
      // A tab may not have finished loading or may not have a content script.
    }
  }
}

async function configureAlarm() {
  await chrome.alarms.clear("ip-timezone-refresh");
  const s = await getSettings();
  if (s.mode === "1h" || s.mode === "6h") {
    chrome.alarms.create("ip-timezone-refresh", {
      delayInMinutes: 1,
      periodInMinutes: s.mode === "1h" ? 60 : 360
    });
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(null);
  await chrome.storage.local.set({ ...DEFAULTS, ...existing });
  await configureAlarm();
  try { await checkAndSave("install"); } catch (e) {
    await chrome.storage.local.set({ lastError: String(e.message || e) });
  }
});

chrome.runtime.onStartup.addListener(async () => {
  const s = await getSettings();
  if (s.mode === "startup") {
    try { await checkAndSave("startup"); }
    catch (e) { await chrome.storage.local.set({ lastError: String(e.message || e) }); }
  }
  await configureAlarm();
});

chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name !== "ip-timezone-refresh") return;
  try { await checkAndSave("scheduled"); }
  catch (e) { await chrome.storage.local.set({ lastError: String(e.message || e) }); }
});

chrome.tabs.onCreated.addListener(async tab => {
  const s = await getSettings();
  if (s.mode !== "tab") return;
  // New tab only; avoids repeated IP-provider calls every time a tab is focused.
  try { await checkAndSave("new-tab"); }
  catch (e) { await chrome.storage.local.set({ lastError: String(e.message || e) }); }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message?.type === "GET_CONFIG") {
      const s = await getSettings();
      sendResponse({ timezone: s.timezone || "UTC", level: s.level || 1 });
      return;
    }
    if (message?.type === "GET_STATUS") {
      sendResponse(await getSettings());
      return;
    }
    if (message?.type === "CHECK_NOW") {
      try { sendResponse({ ok: true, ...(await checkAndSave("manual")) }); }
      catch (e) {
        const error = String(e.message || e);
        await chrome.storage.local.set({ lastError: error });
        sendResponse({ ok: false, error });
      }
      return;
    }
    if (message?.type === "SAVE_SETTINGS") {
      const current = await getSettings();
      const mode = ["tab", "startup", "1h", "6h", "manual"].includes(message.mode)
        ? message.mode : current.mode;
      await chrome.storage.local.set({ ...current, mode });
      await configureAlarm();
      sendResponse({ ok: true });
      return;
    }
  })();
  return true;
});
