const $ = id => document.getElementById(id);

function show(s) {
  $("result").replaceChildren();
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
  const mode = document.querySelector(`input[name="mode"][value="${s.mode}"]`);
  if (mode) mode.checked = true;
  $("level").value = String(s.level || 1);
  show(s);
}

$("save").addEventListener("click", async () => {
  const mode = document.querySelector('input[name="mode"]:checked')?.value || "6h";
  const level = Math.max(1, Math.min(4, Number($("level").value) || 1));
  const result = await chrome.runtime.sendMessage({ type: "SAVE_SETTINGS", mode, level });
  $("saved").textContent = result?.ok
    ? "Settings saved. Open web tabs reload if the protection level changed."
    : "Could not save settings.";
  setTimeout(() => $("saved").textContent = "", 3000);
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

load().catch(error => {
  $("result").textContent = String(error?.message || error);
});
