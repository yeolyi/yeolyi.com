// example.html 의 두 쪽을 그림으로 찍어 사이트 예시로 올린다(public/examples/stock-report-1.jpg, -2.jpg).
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = fileURLToPath(new URL(".", import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 832, height: 1200 },
  deviceScaleFactor: 2,
});
await page.goto(`file://${here}example.html`);
await page.evaluate(() => document.fonts.ready);
const pages = await page.$$(".pg");
for (const [i, pg] of pages.entries())
  await pg.screenshot({
    path: `${here}../../public/examples/stock-report-${i + 1}.jpg`,
    type: "jpeg",
    quality: 85,
  });
await browser.close();
