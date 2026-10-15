// 전후 비교 패널. 캡처(또는 견본) 두 장을 "전 / 후" 틀에 넣어 1800px 폭 PNG 로 만든다.
//   node skills/carousel/compose.mjs <출력 폴더> <이름>:<v|h|stack>:<전 파일>:<후 파일>[:<배율>[:<전 crop>[:<후 crop>]]] ...
//   v 는 상하, h 는 좌우, stack 은 라벨 없이 두 조각을 이어 붙임(긴 폼의 가운데를 뺄 때). crop 은 원본 px 로 x,y,w,h.
//   글자 크기 기준은 SKILL.md "이미지 속 글자" 절. 2배율 캡처는 폭 1300px 이하로 잘라야 920px 자리에서 그 기준이 지켜진다.

import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const { chromium } = createRequire(
  new URL("../../package.json", import.meta.url),
)("playwright");
const [outDir, ...specs] = process.argv.slice(2); // name:mode:beforePath:afterPath[:cssScale]
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1000, height: 1600 },
  deviceScaleFactor: 2,
});
for (const spec of specs) {
  const [name, mode, before, after, scale = "0.75", cropB = "", cropA = ""] =
    spec.split(":"); // crop: x,y,w,h (natural px)
  const maxw = mode === "h" ? 438 : 900;
  const html = `<!doctype html><meta charset="utf-8"><style>
  @font-face{font-family:Pretendard;src:url(${new URL("../../../blog/public/fonts/PretendardVariable.woff2", import.meta.url).href}) format("woff2");font-weight:45 920}
  body{margin:0;background:#fff;font-family:Pretendard,sans-serif;color:#0a0a0a}
  #render{width:900px;display:grid;grid-template-columns:${mode === "h" ? "1fr 1fr" : "1fr"};gap:24px}
  .side{display:flex;flex-direction:column;gap:10px;min-width:0}
  .lab{font-size:30px;line-height:40px;color:#8a8a8a}
  .after .lab{color:#0a0a0a;font-weight:700}
  .stage{border:2px solid #ececec;display:flex;align-items:center;justify-content:center;padding:26px;min-height:150px;background:#fff}
  img{display:block;max-width:100%;height:auto}
  </style><div id="render">
  ${
    mode === "stack"
      ? `<div class="side"><div class="stage" style="padding:0;border:2px solid #ececec;display:block"><img src="file://${before}" data-s="${scale}" data-crop="${cropB}"><div style="border-top:2px dashed #cfcfcf;margin:0"></div><img src="file://${after}" data-s="${scale}" data-crop="${cropA}"></div></div>`
      : `<div class="side"><div class="lab">전</div><div class="stage"><img src="file://${before}" data-s="${scale}" data-crop="${cropB}"></div></div>
  <div class="side after"><div class="lab">후</div><div class="stage"><img src="file://${after}" data-s="${scale}" data-crop="${cropA}"></div></div>`
  }</div>`;
  const tmp = `${outDir}/_${name}.html`;
  writeFileSync(tmp, html);
  await page.goto("file://" + tmp);
  await page.evaluate(
    (maxw) =>
      Promise.all(
        [...document.images].map(async (img) => {
          await img.decode();
          const s = Number(img.dataset.s);
          if (img.dataset.crop) {
            const [x, y, w, h] = img.dataset.crop.split(",").map(Number);
            const k = Math.min(maxw / w, s);
            const box = document.createElement("div");
            box.style.cssText = `width:${w * k}px;height:${h * k}px;overflow:hidden;position:relative`;
            img.replaceWith(box);
            box.append(img);
            img.style.cssText = `position:absolute;left:${-x * k}px;top:${-y * k}px;width:${img.naturalWidth * k}px;max-width:none`;
          } else img.style.width = Math.min(maxw, img.naturalWidth * s) + "px";
        }),
      ),
    maxw,
  );
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(100);
  await page.locator("#render").screenshot({ path: `${outDir}/${name}.png` });
  console.log("composed", name);
}
await browser.close();
