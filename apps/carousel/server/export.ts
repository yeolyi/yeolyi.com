// dev 전용: decks/<폴더> 의 로컬 사본을 /render-local 로 열어 슬라이드마다 1080×1350 JPEG 으로 찍는다.
// (앱의 내보내기는 브라우저 안에서 한다. 이건 Claude 가 결과를 눈으로 확인하는 용도.)
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { H, normalizeDeck, W } from "../src/model.ts";

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
		return { dir: out, files };
	} finally {
		await browser.close();
	}
}
