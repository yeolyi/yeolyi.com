// dev 전용: decks/<폴더> 의 로컬 사본을 /render-local 로 열어 슬라이드마다 1080×1350 JPEG 으로 찍는다.
// (앱의 내보내기는 브라우저 안에서 한다. 이건 Claude 가 결과를 눈으로 확인하는 용도.)
// 장마다 레이어 상자를 layout.json 으로 남기고, 사람이 놓치기 쉬운 배치를 경고로 돌려준다.
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { H, normalizeDeck, W } from "../src/model.ts";
import type { LayoutBox } from "../src/Render.tsx";

// 워터마크·장 번호가 들어가는 띠. 다른 레이어가 여기에 걸치면 경고한다.
const WATERMARK_BAND = { top: 1290, bottom: 1340 };

// 캔버스 밖으로 나가는 건 일부러 그러기도 해서 넘어간다.
function warnings(layout: LayoutBox[][]) {
	const out: string[] = [];
	layout.forEach((boxes, i) => {
		const n = i + 1;
		const layers = boxes.filter((b) => b.type !== "watermark");
		for (const b of layers) {
			const inBand = b.y < WATERMARK_BAND.bottom && b.y + b.h > WATERMARK_BAND.top && b.x < W / 2 + 200 && b.x + b.w > W / 2 - 200;
			if (inBand && b.y + b.h < H) out.push(`${n}장 ${b.type} ${b.id}: 워터마크 자리(y ${WATERMARK_BAND.top}~${WATERMARK_BAND.bottom})에 걸쳐요`);
			if (b.type === "text" && b.x + b.w > W - 80 + 1) out.push(`${n}장 text ${b.id}: 오른쪽 여백(x ${W - 80})을 넘어요(오른쪽 끝 ${Math.round(b.x + b.w)})`);
		}
		const texts = layers.filter((b) => b.type === "text");
		const others = layers.filter((b) => b.type !== "text");
		for (const t of texts)
			for (const o of others) {
				const ix = Math.min(t.x + t.w, o.x + o.w) - Math.max(t.x, o.x);
				const iy = Math.min(t.y + t.h, o.y + o.h) - Math.max(t.y, o.y);
				if (ix > 4 && iy > 4) out.push(`${n}장 text ${t.id} 와 ${o.type} ${o.id}: ${Math.round(ix)}×${Math.round(iy)}px 겹쳐요`);
			}
	});
	return out;
}

export const DECKS = path.resolve(import.meta.dirname, "..", "decks");

export async function exportLocal(baseUrl: string, folder: string) {
	const dir = path.join(DECKS, folder);
	const deck = normalizeDeck(JSON.parse(await fs.readFile(path.join(dir, "deck.json"), "utf8")));
	const out = path.join(dir, "export");
	await fs.rm(out, { recursive: true, force: true });
	await fs.mkdir(out, { recursive: true });
	if (deck.caption.trim()) await fs.writeFile(path.join(out, "caption.txt"), `${deck.caption.trim()}\n`);

	const browser = await chromium.launch();
	try {
		const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
		await page.goto(`${baseUrl}/render-local/${encodeURIComponent(folder)}`);
		await page.waitForFunction(() => (window as any).__ready === true, null, { timeout: 30_000 });
		const files: string[] = [];
		for (let i = 0; i < deck.slides.length; i++) {
			const name = `${deck.title}.${String(i + 1).padStart(3, "0")}.jpeg`.replace(/[/\\]/g, "-");
			await page.locator(`[data-slide-index="${i}"]`).screenshot({ path: path.join(out, name), type: "jpeg", quality: 92 });
			files.push(name);
		}
		const layout = (await page.evaluate(() => (window as any).__layout())) as LayoutBox[][];
		await fs.writeFile(path.join(out, "layout.json"), `${JSON.stringify(layout.map((boxes, i) => ({ index: i + 1, boxes })), null, 2)}\n`);
		return { dir: out, files, warnings: warnings(layout) };
	} finally {
		await browser.close();
	}
}
