// 스토어 캡처화면용 장면. 실제 content script 를 돌려서 찍는다.
// 사이트들은 데모용으로 직접 쓴 가상의 페이지다(실제 서비스 흉내 아님).
import fs from "fs";

const ICON = "file:///home/claude/monttang/ext/icons/32.png";
const popupHtml = fs.readFileSync(
  "/home/claude/monttang/ext/popup.html",
  "utf8",
);
const popupStyle = popupHtml
  .match(/<style>([\s\S]*?)<\/style>/)[1]
  .replace(/:root/g, ".pp")
  .replace(/@media \(prefers-color-scheme: dark\) \{[\s\S]*?\}\s*\}/, "")
  .replace(/\bbody\s*\{/, ".pp {")
  .replace(
    /(^|\})(\s*)([^{}@]+?)\s*\{/g,
    (m, a, ws, sel) =>
      a +
      ws +
      sel
        .split(",")
        .map((x) => (x.trim().startsWith(".pp") ? x : ".pp " + x.trim()))
        .join(", ") +
      " {",
  );
const popupBody = popupHtml
  .match(/<body>([\s\S]*?)<script/)[1]
  .replace('id="enabled"', 'id="enabled" checked')
  .replace('id="site"', 'id="site" checked')
  .replace("이 탭에서는 쓸 수 없어요", "%HOST%");

const chrome = (title, url, popup) => `
<div class="cr" translate="no">
  <div class="cr-tabs">
    <div class="cr-tab"><span class="cr-fav"></span><span class="cr-tt">${title}</span><span class="cr-x">×</span></div>
    <div class="cr-plus">+</div>
  </div>
  <div class="cr-bar">
    <span class="cr-nav">‹</span><span class="cr-nav">›</span><span class="cr-nav">↻</span>
    <div class="cr-omni"><span class="cr-lock">⊙</span>${url}</div>
    <img class="cr-ext ${popup ? "on" : ""}" src="${ICON}"><span class="cr-dots">⋮</span>
  </div>
</div>
${popup ? `<div class="pp" translate="no">${popupBody.replace("%HOST%", url.split("/")[0])}</div>` : ""}`;

const BASE = `
*{box-sizing:border-box} html,body{margin:0;height:100%;overflow:hidden}
body{font-family:Pretendard,"Noto Sans CJK KR",sans-serif;background:#fff;color:#1f2328}
.cr{height:84px;background:#dee1e6;font:13px/1 Pretendard,sans-serif;color:#3c4043}
.cr-tabs{height:42px;display:flex;align-items:flex-end;padding-left:10px}
.cr-tab{width:240px;height:34px;background:#fff;border-radius:9px 9px 0 0;display:flex;align-items:center;gap:8px;padding:0 12px}
.cr-fav{width:16px;height:16px;border-radius:4px;background:var(--fav,#888)}
.cr-tt{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cr-x{color:#80868b}.cr-plus{padding:0 12px 10px;color:#5f6368;font-size:18px}
.cr-bar{height:42px;background:#fff;display:flex;align-items:center;gap:6px;padding:0 10px;border-bottom:1px solid #dadce0}
.cr-nav{width:28px;text-align:center;color:#5f6368;font-size:18px}
.cr-omni{flex:1;height:30px;border-radius:15px;background:#f1f3f4;display:flex;align-items:center;gap:8px;padding:0 14px;font-size:14px;color:#202124}
.cr-lock{color:#5f6368}
.cr-ext{width:18px;height:18px;margin:0 6px;border-radius:4px}.cr-ext.on{outline:6px solid #e8eaed;border-radius:4px}
.cr-dots{color:#5f6368;font-size:18px;padding:0 6px}
.page{height:calc(100% - 84px);overflow:hidden}
.pp{position:absolute;top:80px;right:44px;width:300px;border-radius:10px;overflow:hidden;
    box-shadow:0 2px 6px rgba(0,0,0,.18),0 12px 32px rgba(0,0,0,.18);z-index:10}
`;

export const scenes = {
  docs: {
    title: "Getting started with Web Components – Webcraft Docs",
    titleKo: "게팅 스타티드 위드 웹 컴포넌츠 – 웹크래프트 독스",
    url: "docs.webcraft.dev/guides/web-components",
    fav: "#2f6feb",
    css: `
.top{height:56px;border-bottom:1px solid #d0d7de;display:flex;align-items:center;gap:28px;padding:0 32px;font-size:15px}
.logo{font-weight:800;font-size:18px;display:flex;align-items:center;gap:8px}.logo i{width:22px;height:22px;border-radius:6px;background:#2f6feb;display:inline-block}
.top a{color:#57606a;text-decoration:none}.search{margin-left:auto;width:260px;height:34px;border:1px solid #d0d7de;border-radius:8px;color:#8c959f;display:flex;align-items:center;padding:0 12px;font-size:14px}
.wrap{display:flex;height:calc(100% - 56px)}
nav.side{width:250px;border-right:1px solid #d0d7de;padding:24px 20px;font-size:14.5px;line-height:2.1}
nav.side b{display:block;font-size:12px;letter-spacing:.06em;color:#57606a;margin-top:10px}
nav.side a{display:block;color:#1f2328;text-decoration:none;padding-left:10px;border-left:2px solid transparent}
nav.side a.cur{border-color:#2f6feb;color:#2f6feb;font-weight:600}
article{flex:1;padding:36px 56px;max-width:860px}
.crumb{font-size:13px;color:#57606a}
h1{font-size:38px;line-height:1.2;margin:10px 0 14px;letter-spacing:-.02em}
.lead{font-size:18px;line-height:1.65;color:#424a53;margin:0 0 22px}
h2{font-size:22px;margin:26px 0 10px}
p{font-size:16px;line-height:1.75;margin:0 0 14px}
pre{background:#f6f8fa;border:1px solid #d0d7de;border-radius:8px;padding:14px 18px;font:14px/1.6 ui-monospace,Menlo,monospace;margin:0 0 14px}
.note{border-left:4px solid #2f6feb;background:#ddf4ff;padding:12px 16px;border-radius:6px;font-size:15px;line-height:1.6}`,
    body: `
<div class="top"><span class="logo"><i></i>Webcraft</span><a>Docs</a><a>Tutorials</a><a>Blog</a><a>Community</a><span class="search">Search documentation</span></div>
<div class="wrap">
<nav class="side"><b>GETTING STARTED</b><a>Introduction</a><a>Installation</a><a class="cur">Web Components</a><a>Styling</a><b>GUIDES</b><a>Shadow DOM</a><a>Custom Events</a><a>Testing</a><a>Performance</a></nav>
<article>
<div class="crumb">Guides › Getting started</div>
<h1>Getting started with Web Components</h1>
<p class="lead">Build reusable custom elements that work in every modern browser, with no framework required.</p>
<h2>Create your first element</h2>
<p>A custom element is just a class that extends HTMLElement. Register it once, and you can use the new tag anywhere in your page.</p>
<pre>class HelloWorld extends HTMLElement {
  connectedCallback() { this.textContent = "Hello, world!"; }
}</pre>
<div class="note">Tip: Element names must contain a hyphen, so the browser can tell them apart from built-in tags.</div>
</article></div>`,
  },
  cafe: {
    title: "週末カフェ日記｜東京の喫茶店めぐり",
    titleKo: "주말카페일기｜동경노끽다점메구리",
    url: "shumatsu-cafe.example.jp/tokyo",
    fav: "#a0522d",
    lang: "ja",
    css: `
body{font-family:"Noto Sans CJK JP",Pretendard,sans-serif;background:#faf7f2;color:#3b2f2a}
.head{text-align:center;padding:26px 0 18px;border-bottom:1px solid #e7ddd0;background:#fff}
.head .name{font-size:28px;font-weight:700;letter-spacing:.08em}.head .sub{font-size:13px;color:#8a7a6d;margin-top:6px}
.menu{display:flex;justify-content:center;gap:34px;font-size:14px;padding:12px 0;background:#fff;border-bottom:1px solid #e7ddd0;color:#6b5b50}
.main{display:flex;gap:40px;max-width:1100px;margin:28px auto 0;padding:0 40px}
.post{flex:1}.date{font-size:13px;color:#a08f80}
h1{font-size:30px;margin:6px 0 18px;line-height:1.35}
.photo{height:170px;border-radius:10px;background:linear-gradient(135deg,#c89f7a,#7a5640);margin-bottom:18px;position:relative}
.photo span{position:absolute;left:18px;bottom:14px;color:#fff;font-size:14px;opacity:.9}
p{font-size:16px;line-height:1.9;margin:0 0 12px}
aside{width:280px}.card{background:#fff;border:1px solid #e7ddd0;border-radius:10px;padding:18px 20px}
.card h3{margin:0 0 12px;font-size:16px}.row{display:flex;justify-content:space-between;font-size:15px;padding:7px 0;border-bottom:1px dashed #e7ddd0}`,
    body: `
<div class="head"><div class="name">週末カフェ日記</div><div class="sub">東京の喫茶店めぐり</div></div>
<div class="menu"><span>ホーム</span><span>カフェ</span><span>スイーツ</span><span>レシピ</span><span>プロフィール</span></div>
<div class="main"><div class="post">
<div class="date">2026年10月4日</div>
<h1>下北沢の小さな喫茶店で、ハンドドリップのコーヒーを</h1>
<div class="photo"><span>カウンター席からの眺め</span></div>
<p>今日は友だちと下北沢へ。駅から歩いて五分、路地の奥にある小さなお店です。</p>
<p>おすすめはハンドドリップのコーヒーと、自家製のチーズケーキ。</p>
</div>
<aside><div class="card"><h3>今日のメニュー</h3>
<div class="row"><span>ブレンドコーヒー</span><span>550円</span></div>
<div class="row"><span>カフェラテ</span><span>600円</span></div>
<div class="row"><span>チーズケーキ</span><span>480円</span></div>
<div class="row"><span>ナポリタン</span><span>900円</span></div></div></aside></div>`,
  },
  travel: {
    title: "北京三日游攻略 | 旅行笔记",
    titleKo: "베이징싼르유궁뤼에 | 뤼싱비지",
    url: "lvxing-biji.example.cn/beijing",
    fav: "#d93025",
    lang: "zh",
    css: `
body{font-family:"Noto Sans CJK SC",Pretendard,sans-serif;background:#f4f5f7;color:#222}
.topnav{height:60px;background:#fff;display:flex;align-items:center;gap:30px;padding:0 48px;font-size:15px;box-shadow:0 1px 0 #e5e6eb}
.topnav .b{font-weight:800;font-size:20px;color:#d93025}
.hero{height:210px;background:linear-gradient(120deg,#8e1b12,#d93025 55%,#f0a04b);color:#fff;padding:44px 64px}
.hero h1{margin:0;font-size:40px;letter-spacing:.02em}.hero p{margin:12px 0 0;font-size:17px;opacity:.92}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;padding:26px 64px}
.c{background:#fff;border-radius:12px;padding:18px 20px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.c .d{font-size:13px;color:#d93025;font-weight:700}.c h3{margin:6px 0 8px;font-size:19px}
.c p{margin:0;font-size:15px;line-height:1.7;color:#555}`,
    body: `
<div class="topnav"><span class="b">旅行笔记</span><span>首页</span><span>目的地</span><span>美食</span><span>攻略</span></div>
<div class="hero"><h1>北京三日游攻略</h1><p>故宫、长城、胡同 —— 第一次去北京就这样玩</p></div>
<div class="grid">
<div class="c"><div class="d">第一天</div><h3>故宫和景山公园</h3><p>早上从天安门出发，下午在景山公园看日落。</p></div>
<div class="c"><div class="d">第二天</div><h3>八达岭长城</h3><p>坐高铁一个小时就到，记得穿舒服的鞋。</p></div>
<div class="c"><div class="d">第三天</div><h3>南锣鼓巷与烤鸭</h3><p>逛胡同，晚上去吃北京烤鸭。</p></div>
</div>`,
  },
};

export function page(name, { popup = false, converted = false } = {}) {
  const s = scenes[name];
  return `<!doctype html><html lang="${s.lang || "en"}"><head><meta charset="utf-8"><title>${s.title}</title>
<style>${BASE}${s.css}</style><style>.cr-fav{--fav:${s.fav}}${popupStyle}.pp h1{font-size:17px;margin:0;line-height:1.3;letter-spacing:-.02em}.pp p{margin:0;font-size:12px;line-height:1.5}.pp ul{margin:8px 0 0}.pp *{font-family:Pretendard,sans-serif}</style></head><body>
${chrome(converted ? s.titleKo : s.title, s.url, popup)}<div class="page">${s.body}</div></body></html>`;
}
