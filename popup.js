const $ = id => document.getElementById(id);
function render(s) {
  $("timezone").textContent = s.timezone || "Not detected";
  $("country").textContent = [s.country, s.countryCode].filter(Boolean).join(" · ");
  $("ip").textContent = s.ip ? `Public IP: ${s.ip}` : "";
  $("checked").textContent = s.checkedAt ? `Last checked: ${new Date(s.checkedAt).toLocaleString()}` : "Not checked yet";
  $("error").textContent = s.lastError || "";
}
chrome.runtime.sendMessage({ type: "GET_STATUS" }).then(render);
$("check").addEventListener("click", async () => {
  $("check").disabled = true;
  $("check").textContent = "Checking…";
  const result = await chrome.runtime.sendMessage({ type: "CHECK_NOW" });
  if (result.ok) render(result);
  else $("error").textContent = result.error;
  $("check").disabled = false;
  $("check").textContent = "Check IP now";
});