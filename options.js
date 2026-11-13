const $ = id => document.getElementById(id);
function show(s) {
  $("result").innerHTML = "";
  const lines = [
    `Timezone: ${s.timezone || "—"}`,
    `Country: ${s.country || "—"} (${s.countryCode || "—"})`,
    `Public IP: ${s.ip || "—"}`,
    `Last check: ${s.checkedAt ? new Date(s.checkedAt).toLocaleString() : "—"}`,
    `Error: ${s.lastError || "None"}`
  ];
  for (const line of lines) {
    const div = document.createElement("div");
    div.textContent = line;
    $("result").appendChild(div);
  }
}
async function load() {
  const s = await chrome.runtime.sendMessage({ type: "GET_STATUS" });
  document.querySelector(`input[name="mode"][value="${s.mode}"]`)?.click();\n  $("level").value = String(s.level || 1);
  show(s);
}
$("save").addEventListener("click", async () => {
  const mode = document.querySelector('input[name="mode"]:checked')?.value || "6h";
  const level = Number($("level").value);\n  await chrome.runtime.sendMessage({ type: "SAVE_SETTINGS", mode, level });
  $("saved").textContent = "Saved. Open web tabs reloaded if the level changed.";
  setTimeout(() => $("saved").textContent = "", 1800);
});
$("check").addEventListener("click", async () => {
  $("check").disabled = true;
  $("check").textContent = "Checking…";
  const r = await chrome.runtime.sendMessage({ type: "CHECK_NOW" });
  if (r.ok) show(r);
  else $("result").textContent = r.error;
  $("check").disabled = false;
  $("check").textContent = "Check IP now";
});
load();