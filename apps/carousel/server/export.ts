// dev 전용: decks/<폴더> 의 로컬 사본을 /render-local 로 열어 슬라이드마다 1080×1350 JPEG 으로 찍는다.
// (앱의 내보내기는 브라우저 안에서 한다. 이건 Claude 가 결과를 눈으로 확인하는 용도.)
// 장마다 레이어 상자를 layout.json 으로 남기고, 사람이 놓치기 쉬운 배치를 경고로 돌려준다.
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { H, MARGIN, normalizeDeck, W } from "../src/model.ts";
import type { LayoutBox } from "../src/Render.tsx";

// 배치는 규칙이 정하므로 겹침·여백 걱정은 없다. 남는 건 글이 너무 길어 아래 여백(워터마크 위)을 넘는 경우뿐이다.
function warnings(layout: LayoutBox[][]) {
  const out: string[] = [];
  layout.forEach((boxes, i) => {
    const bottom = Math.max(
      0,
      ...boxes.filter((b) => b.type !== "watermark").map((b) => b.y + b.h),
    );
    if (bottom > H - MARGIN.bottom + 1)
      out.push(
        `${i + 1}장: 아래 여백을 ${Math.round(bottom - (H - MARGIN.bottom))}px 넘쳐요. 글을 줄이거나 장을 나누세요`,
      );
  });
  return out;
}

export const DECKS = path.resolve(import.meta.dirname, "..", "decks");

export async function exportLocal(baseUrl: string, folder: string) {
  const dir = path.join(DECKS, folder);
  const deck = normalizeDeck(
    JSON.parse(await fs.readFile(path.join(dir, "deck.json"), "utf8")),
  );
  const out = path.join(dir, "export");
  await fs.rm(out, { recursive: true, force: true });
  await fs.mkdir(out, { recursive: true });
  if (deck.caption.trim())
    await fs.writeFile(
      path.join(out, "caption.txt"),
      `${deck.caption.trim()}\n`,
    );

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: W, height: H },
      deviceScaleFactor: 1,
    });
    await page.goto(`${baseUrl}/render-local/${encodeURIComponent(folder)}`);
    await page.waitForFunction(() => window.__ready === true, null, {
      timeout: 30_000,
    });
    const files: string[] = [];
    for (let i = 0; i < deck.slides.length; i++) {
      const name =
        `${deck.title}.${String(i + 1).padStart(3, "0")}.jpeg`.replace(
          /[/\\]/g,
          "-",
        );
      await page
        .locator(`[data-slide-index="${i}"]`)
        .screenshot({ path: path.join(out, name), type: "jpeg", quality: 92 });
      files.push(name);
    }
    const layout = await page.evaluate(() => window.__layout?.() ?? []);
    await fs.writeFile(
      path.join(out, "layout.json"),
      `${JSON.stringify(
        layout.map((boxes, i) => ({ index: i + 1, boxes })),
        null,
        2,
      )}\n`,
    );
    return { dir: out, files, warnings: warnings(layout) };
  } finally {
    await browser.close();
  }
}
