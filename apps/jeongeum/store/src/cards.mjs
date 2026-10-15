// 스토어 캡처화면: 1장 실제 팝업, 2~4장 언어별 변환 카드. 변환 결과는 전부 실제 엔진 출력.

import chromium from "@sparticuz/chromium";
import fs from "fs";
import { createRequire } from "module";
import puppeteer from "puppeteer-core";

const require = createRequire(import.meta.url);
const ext = "/home/claude/monttang/ext/";
require(ext + "data.js");
const E = require(ext + "engine.js");
const D = globalThis.MONTTANG_DATA;
const conv = E.createConverter({
  en: new Map(D.en.split("\n").map((l) => l.split("\t"))),
  zh: D.zh.split("|"),
  ko: D.ko.split("|"),
});

const RED = "#c8321f";
const CREAM = "#fffaf0";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// 실제 팝업 마크업과 스타일(.pp 아래로 가둠)
const popupHtml = fs.readFileSync(ext + "popup.html", "utf8");
const popupStyle = popupHtml
  .match(/<style>([\s\S]*?)<\/style>/)[1]
  .replace(/@media \(prefers-color-scheme: dark\) \{[\s\S]*?\}\s*\}/, "")
  .replace(/:root/g, ".pp")
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
  .replace("이 탭에서는 쓸 수 없어요", "en.wikipedia.org");

const BASE = `*{box-sizing:border-box}html,body{margin:0;width:1280px;height:800px;overflow:hidden}
body{background:${RED};color:${CREAM};font-family:Pretendard,"Noto Sans CJK KR",sans-serif;-webkit-font-smoothing:antialiased}
.mark{position:absolute;left:96px;bottom:64px;display:flex;align-items:center;gap:12px;font-weight:700;font-size:22px}
.mark i{width:34px;height:34px;border:3px solid ${CREAM};border-radius:9px;display:grid;place-items:center;font:700 19px/1 "Noto Serif CJK KR",serif;font-style:normal}`;
const mark = `<div class="mark"><i>한</i>정음</div>`;

function popupSlide() {
  return `<style>${BASE}${popupStyle}
.pp{width:300px;border-radius:12px;overflow:hidden;box-shadow:0 24px 60px rgba(60,10,0,.35)}
.pp h1{font-size:17px;margin:0}.pp p{margin:0}.pp ul{margin:8px 0 0}
.wrap{position:absolute;right:120px;top:50%;transform:translateY(-50%) scale(1.55);transform-origin:right center}
h2{position:absolute;left:96px;top:200px;margin:0;font-size:64px;line-height:1.22;font-weight:800;letter-spacing:-.03em}
.lede{position:absolute;left:100px;top:380px;font-size:24px;line-height:1.6;opacity:.85}</style>
<h2>세종대왕 보시기에<br>좋은 인터넷</h2>
<div class="lede">켜면 영어·일본어·중국어가<br>소리 나는 대로 바뀝니다.</div>
<div class="wrap"><div class="pp">${popupBody}</div></div>`;
}

function langSlide(label, items, hanMode) {
  const rows = items
    .map(([src, big], i) => {
      const out = conv(src, { hanMode });
      const size = i === 0 ? big : 44;
      return `<div class="row ${i ? "small" : ""}"><div class="src" lang="${hanMode === "ko" ? "ja" : hanMode === "zh" ? "zh" : "en"}">${esc(src)}</div>
      <div class="out" style="font-size:${size}px">${esc(out)}</div></div>`;
    })
    .join("");
  return `<style>${BASE}
.label{position:absolute;left:96px;top:84px;font-size:22px;font-weight:700;letter-spacing:.02em;opacity:.8}
.rows{position:absolute;left:96px;right:96px;top:170px}
.row{margin-bottom:46px}.row.small{margin-bottom:26px}
.src{font-size:34px;font-weight:500;opacity:.6;margin-bottom:6px;font-family:Pretendard,"Noto Sans CJK JP","Noto Sans CJK SC",sans-serif}
.small .src{font-size:26px}
.out{font-weight:800;letter-spacing:-.03em;line-height:1.1}</style>
<div class="label">${label}</div><div class="rows">${rows}</div>${mark}`;
}

const slides = {
  "shot-1-popup": popupSlide(),
  "shot-2-english": langSlide("영어", [
    ["Hello, world!", 128],
    ["Sign in to continue", 0],
    ["Breaking news", 0],
  ]),
  "shot-3-japanese": langSlide(
    "일본어",
    [
      ["コーヒーとチョコレート", 104],
      ["東京のカフェ", 0],
    ],
    "ko",
  ),
  "shot-4-chinese": langSlide(
    "중국어",
    [
      ["北京欢迎你", 128],
      ["你好", 0],
    ],
    "zh",
  ),
};

const browser = await puppeteer.launch({
  executablePath: await chromium.executablePath(),
  headless: "shell",
  args: chromium.args,
  defaultViewport: { width: 1280, height: 800, deviceScaleFactor: 1 },
});
for (const [name, html] of Object.entries(slides)) {
  const p = await browser.newPage();
  await p.setContent(`<!doctype html><meta charset="utf-8">${html}`, {
    waitUntil: "load",
  });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: `/home/claude/monttang/store/${name}.png` });
  await p.close();
}
await browser.close();
console.log("done");
