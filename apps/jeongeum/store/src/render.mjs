import chromium from "@sparticuz/chromium";
import fs from "fs";
import { createRequire } from "module";
import puppeteer from "puppeteer-core";
import { page, scenes } from "./scenes.mjs";

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

const out = "/home/claude/monttang/store/src/out/";
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: await chromium.executablePath(),
  headless: "shell",
  args: [...chromium.args, "--allow-file-access-from-files"],
  defaultViewport: { width: 1280, height: 800, deviceScaleFactor: 1 },
});

async function shot(name, { popup, converted }, file) {
  const s = scenes[name];
  const hanMode = s.lang === "zh" ? "zh" : s.lang === "ja" ? "ko" : undefined;
  s.titleKo = conv(s.title, { hanMode });
  const html = out + `${name}.html`;
  fs.writeFileSync(html, page(name, { popup, converted }));
  const p = await browser.newPage();
  await p.goto("file://" + html, { waitUntil: "load" });
  await p.evaluate(() => document.fonts.ready);
  if (converted) {
    await p.evaluate(() => {
      window.chrome = {
        storage: {
          sync: { get: (d, cb) => cb(d) },
          onChanged: { addListener() {} },
        },
        runtime: { onMessage: { addListener() {} } },
      };
    });
    for (const f of ["data.js", "engine.js", "content.js"])
      await p.evaluate(fs.readFileSync(ext + f, "utf8"));
    await new Promise((r) => setTimeout(r, 300));
  }
  await p.screenshot({ path: out + file });
  await p.close();
}

await shot("docs", { popup: true, converted: true }, "docs_on_popup.png");
await shot("docs", { popup: false, converted: false }, "docs_off.png");
await shot("docs", { popup: false, converted: true }, "docs_on.png");
await shot("cafe", { popup: false, converted: true }, "cafe_on.png");
await shot("cafe", { popup: false, converted: false }, "cafe_off.png");
await shot("travel", { popup: false, converted: true }, "travel_on.png");
await shot("travel", { popup: false, converted: false }, "travel_off.png");
await browser.close();
console.log("done");
