const DEFAULTS = { enabled: true, numbers: false, disabledHosts: [] };
const $ = (id) => document.getElementById(id);

(async () => {
  const s = await chrome.storage.sync.get(DEFAULTS);
  $("enabled").checked = s.enabled;
  $("numbers").checked = s.numbers;

  let host = null;
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const res = await chrome.tabs.sendMessage(tab.id, {
      type: "monttang:status",
    });
    host = res?.host;
  } catch (_) {
    // chrome:// 페이지, 웹 스토어 등 확장이 들어갈 수 없는 탭
  }

  const siteRow = $("siteRow");
  if (host) {
    $("host").textContent = host;
    $("site").checked = !s.disabledHosts.includes(host);
  } else {
    $("site").disabled = true;
    siteRow.classList.add("disabled");
  }
  const syncSiteRow = () =>
    siteRow.classList.toggle("disabled", !host || !$("enabled").checked);
  syncSiteRow();

  $("enabled").addEventListener("change", (e) => {
    chrome.storage.sync.set({ enabled: e.target.checked });
    syncSiteRow();
  });
  $("numbers").addEventListener("change", (e) =>
    chrome.storage.sync.set({ numbers: e.target.checked }),
  );
  $("site").addEventListener("change", async (e) => {
    const { disabledHosts } = await chrome.storage.sync.get(DEFAULTS);
    const set = new Set(disabledHosts);
    if (e.target.checked) set.delete(host);
    else set.add(host);
    chrome.storage.sync.set({ disabledHosts: [...set] });
  });
})();
