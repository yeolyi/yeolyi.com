// 정음 — 페이지의 글자를 한글 음차로 바꾸고, 끄면 원래대로 돌려놓는다.
(() => {
  const DEFAULTS = { enabled: true, numbers: false, disabledHosts: [] };
  const SKIP = new Set([
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "TEXTAREA",
    "INPUT",
    "SELECT",
    "OPTION",
    "CODE",
    "PRE",
    "KBD",
    "SAMP",
    "VAR",
    "MATH",
    "TEMPLATE",
    "IFRAME",
    "CANVAS",
  ]);
  const HAS_FOREIGN = /[A-Za-zÀ-ɏぁ-ヿ一-鿿]/;
  const host = location.hostname;

  let settings = { ...DEFAULTS };
  let convert = null;
  let active = false;
  let observer = null;
  const originals = new WeakMap(); // 텍스트 노드 → { orig, conv }
  const touched = new Set(); // 되돌리기용 (WeakRef)

  function getConverter() {
    if (convert) return convert;
    const D = globalThis.MONTTANG_DATA;
    const en = new Map();
    for (const line of D.en.split("\n")) {
      const t = line.indexOf("\t");
      en.set(line.slice(0, t), line.slice(t + 1));
    }
    convert = globalThis.MonttangEngine.createConverter({
      en,
      zh: D.zh.split("|"),
      ko: D.ko.split("|"),
    });
    return convert;
  }

  function hanModeFor() {
    const lang = (document.documentElement.lang || "").toLowerCase();
    if (lang.startsWith("ja") || lang.startsWith("ko")) return "ko";
    if (lang.startsWith("zh")) return "zh";
    return null; // 노드마다 가나가 섞였는지 보고 정한다
  }

  function skippable(node) {
    for (let el = node.parentElement; el; el = el.parentElement) {
      if (
        SKIP.has(el.tagName) ||
        el.isContentEditable ||
        (el.hasAttribute("contenteditable") &&
          el.getAttribute("contenteditable") !== "false") ||
        el.getAttribute("translate") === "no"
      )
        return true;
    }
    return false;
  }

  function processNode(node, conv, opts) {
    const value = node.nodeValue;
    if (!value || !HAS_FOREIGN.test(value)) return;
    const rec = originals.get(node);
    if (rec && rec.conv === value) return; // 이미 바꾼 그대로
    if (skippable(node)) return;
    const out = conv(value, opts);
    if (out === value) return;
    originals.set(node, { orig: value, conv: out });
    touched.add(new WeakRef(node));
    node.nodeValue = out;
  }

  function walk(rootNode) {
    const conv = getConverter();
    const opts = { numbers: settings.numbers, hanMode: hanModeFor() };
    const tw = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode())
      processNode(n, conv, opts);
    if (rootNode === document.documentElement || rootNode === document.body) {
      // <title> 은 TreeWalker 에도 잡히지만 SPA 가 document.title 로 바꾸는 경우를 위해 한 번 더
      const t = document.querySelector("title");
      if (t && t.firstChild) processNode(t.firstChild, conv, opts);
    }
  }

  // 페이지가 계속 바뀌는 사이트(SPA, 무한 스크롤)를 위해 변경을 모아서 처리
  let pending = new Set();
  let scheduled = false;
  function schedule(node) {
    pending.add(node);
    if (scheduled) return;
    scheduled = true;
    setTimeout(flush, 60);
  }
  function flush() {
    scheduled = false;
    if (!active) {
      pending.clear();
      return;
    }
    const nodes = pending;
    pending = new Set();
    observer.disconnect();
    const conv = getConverter();
    const opts = { numbers: settings.numbers, hanMode: hanModeFor() };
    for (const node of nodes) {
      if (!node.isConnected) continue;
      if (node.nodeType === Node.TEXT_NODE) processNode(node, conv, opts);
      else walk(node);
    }
    observe();
  }
  function observe() {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  function start() {
    if (active) return;
    active = true;
    walk(document.documentElement);
    observer =
      observer ||
      new MutationObserver((muts) => {
        for (const m of muts) {
          if (m.type === "characterData") schedule(m.target);
          else
            for (const n of m.addedNodes)
              if (
                n.nodeType === Node.TEXT_NODE ||
                n.nodeType === Node.ELEMENT_NODE
              )
                schedule(n);
        }
      });
    observe();
  }

  function stop() {
    if (!active) return;
    active = false;
    if (observer) observer.disconnect();
    for (const ref of touched) {
      const node = ref.deref();
      if (!node) continue;
      const rec = originals.get(node);
      if (rec && node.nodeValue === rec.conv) node.nodeValue = rec.orig;
      originals.delete(node);
    }
    touched.clear();
  }

  function shouldRun() {
    return settings.enabled && !settings.disabledHosts.includes(host);
  }

  function apply() {
    stop();
    if (shouldRun()) start();
  }

  chrome.storage.sync.get(DEFAULTS, (s) => {
    settings = { ...DEFAULTS, ...s };
    if (shouldRun()) start();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    for (const [k, { newValue }] of Object.entries(changes))
      settings[k] = newValue ?? DEFAULTS[k];
    apply();
  });

  // 팝업이 지금 탭의 사이트 주소와 상태를 물어볼 때
  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg && msg.type === "monttang:status") reply({ host, active });
  });
})();
