// 브라우저 안에서 내보내기: 화면 밖에 1080×1350 슬라이드를 그려 JPEG 으로 찍고 zip 으로 받는다.
// 편집 화면과 같은 SlideView 를 쓰므로 결과도 같다.
import { strToU8, zipSync } from "fflate";
import { domToJpeg } from "modern-screenshot";
import { createRoot } from "react-dom/client";
import { H, type Deck, W } from "./model";
import { codeLayersReady, SlideView } from "./SlideView";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function imagesReady(root: HTMLElement) {
	// 서명 URL 을 받아 와 src 가 채워질 때까지 기다린다.
	for (let i = 0; i < 100; i++) {
		const imgs = [...root.querySelectorAll("img")];
		if (imgs.every((img) => img.getAttribute("src"))) break;
		await wait(100);
	}
	await Promise.all([...root.querySelectorAll("img")].map((img) => img.decode().catch(() => {})));
}

const dataUrlToBytes = (url: string) => Uint8Array.from(atob(url.split(",")[1]), (c) => c.charCodeAt(0));

export type Rendered = { name: string; files: { name: string; bytes: Uint8Array<ArrayBuffer> }[]; caption: string };

// 장마다 JPEG 을 만든다. 받기(zip)·공유는 따로 한다(모바일 공유는 사용자 탭 안에서 바로 불러야 해서).
export async function renderDeck(deck: Deck, deckId: string, onProgress?: (done: number, total: number) => void): Promise<Rendered> {
	const host = document.createElement("div");
	// 화면 밖에 두되 display:none 은 쓰지 않는다(그래야 레이아웃이 잡힌다).
	host.style.cssText = `position:fixed;left:-20000px;top:0;width:${W}px;pointer-events:none;`;
	document.body.appendChild(host);
	const root = createRoot(host);
	try {
		root.render(
			<div className="render">
				{deck.slides.map((s, i) => (
					<SlideView key={s.id} deck={deck} slug={deckId} index={i} />
				))}
			</div>,
		);
		await wait(50);
		await document.fonts.ready;
		await imagesReady(host);
		await codeLayersReady(host);

		const name = deck.title.replace(/[/\\:*?"<>|]/g, "-") || "carousel";
		const files: Rendered["files"] = [];
		const slides = [...host.querySelectorAll<HTMLElement>("[data-slide-index]")];
		for (const [i, el] of slides.entries()) {
			const url = await domToJpeg(el, { width: W, height: H, scale: 1, quality: 0.92, backgroundColor: "#fff" });
			files.push({ name: `${name}.${String(i + 1).padStart(3, "0")}.jpeg`, bytes: dataUrlToBytes(url) });
			onProgress?.(i + 1, slides.length);
		}
		return { name, files, caption: deck.caption.trim() };
	} finally {
		root.unmount();
		host.remove();
	}
}

export function downloadZip(r: Rendered) {
	const entries: Record<string, Uint8Array> = Object.fromEntries(r.files.map((f) => [f.name, f.bytes]));
	if (r.caption) entries["caption.txt"] = strToU8(`${r.caption}\n`);
	const a = document.createElement("a");
	a.href = URL.createObjectURL(new Blob([zipSync(entries, { level: 0 })], { type: "application/zip" }));
	a.download = `${r.name}.zip`;
	a.click();
	setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

const toFiles = (r: Rendered) => r.files.map((f) => new File([f.bytes], f.name, { type: "image/jpeg" }));

// 휴대폰 공유 시트(사진 저장·인스타 공유)로 넘길 수 있는지.
export const canShare = (r: Rendered) => typeof navigator.canShare === "function" && navigator.canShare({ files: toFiles(r) });

export async function share(r: Rendered) {
	try {
		await navigator.share({ files: toFiles(r) });
	} catch (e) {
		if (!(e instanceof DOMException && e.name === "AbortError")) throw e;
	}
}
