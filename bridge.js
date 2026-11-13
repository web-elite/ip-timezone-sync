// Isolated-world bridge: obtains the current timezone from the extension and
// passes only that value to the page's MAIN world.
(async () => {
  try {
    const config = await chrome.runtime.sendMessage({ type: "GET_CONFIG" });
    if (config?.timezone) {
      window.postMessage({
        __iptz_sync__: true,
        timezone: config.timezone
      }, "*");
    }
  } catch (_) {}
})();

chrome.runtime.onMessage.addListener(message => {
  if (message?.type === "IPTZ_UPDATE" && message.timezone) {
    window.postMessage({
      __iptz_sync__: true,
      timezone: message.timezone
    }, "*");
  }
});
