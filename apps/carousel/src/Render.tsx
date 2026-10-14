// 헤드리스 크롬이 찍는 렌더 화면. 모든 장을 세로로 늘어놓고, 폰트·이미지·코드 레이어가 다 뜨면 window.__ready 를 켠다.
//   /render-local/<폴더>  dev 전용. decks/<폴더>/deck.json 을 그린다(pnpm export).
//   /render              서버(/api/render)가 window.__RENDER__ 로 덱과 이미지 서명 URL 을 넣어 준다. 스스로는 아무것도 읽지 않는다.
// window.__layout() 은 장마다 레이어 상자(캔버스 px)를 돌려준다. 에이전트가 배치를 짐작하지 않고 재게 하려는 것.
import { domToJpeg } from "modern-screenshot";
import { useEffect, useState } from "react";
import { AssetResolver, localResolve, type Resolve } from "./assets";
import { type Deck, H, normalizeDeck, W } from "./model";
import { codeLayersReady, SlideView } from "./SlideView";

export type LayoutBox = { id: string; type: "text" | "image" | "code" | "watermark"; x: number; y: number; w: number; h: number };

function measure(): LayoutBox[][] {
	return [...document.querySelectorAll<HTMLElement>("[data-slide-index]")].map((slide) => {
		const base = slide.getBoundingClientRect();
		const box = (el: Element, id: string, type: LayoutBox["type"]): LayoutBox => {
			const r = el.getBoundingClientRect();
			const round = (v: number) => Math.round(v * 10) / 10;
			return { id, type, x: round(r.left - base.left), y: round(r.top - base.top), w: round(r.width), h: round(r.height) };
		};
		const layers = [...slide.querySelectorAll(".layer[data-id]")].map((el) => {
			const type = el.classList.contains("txt") ? "text" : el.classList.contains("img") ? "image" : "code";
			return box(el, el.getAttribute("data-id") ?? "", type);
		});
		const wm = slide.querySelector(".watermark");
		return wm ? [...layers, box(wm, "", "watermark")] : layers;
	});
}

function RenderDeck({ deck, slug, resolve }: { deck: Deck; slug: string; resolve: Resolve }) {
	useEffect(() => {
		(async () => {
			await document.fonts.ready;
			await codeLayersReady(document);
			await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
			// 앱의 브라우저 내보내기(exportClient)와 같은 방식으로 찍어 보는 dev 훅. 헤드리스 크롬 결과와 비교용.
			(window as any).__capture = (i: number) =>
				domToJpeg(document.querySelector(`[data-slide-index="${i}"]`) as HTMLElement, {
					width: W,
					height: H,
					scale: 1,
					quality: 0.92,
					backgroundColor: "#fff",
				});
			(window as any).__layout = measure;
			(window as any).__ready = true;
		})();
	}, []);
	return (
		<AssetResolver value={resolve}>
			<div className="render">
				{deck.slides.map((s, i) => (
					<SlideView key={s.id} deck={deck} slug={slug} index={i} />
				))}
			</div>
		</AssetResolver>
	);
}

export function RenderLocal({ folder }: { folder: string }) {
	const [deck, setDeck] = useState<Deck | null>(null);
	useEffect(() => {
		fetch(`/files/${encodeURIComponent(folder)}/deck.json`)
			.then((r) => r.json())
			.then((raw) => setDeck(normalizeDeck(raw)));
	}, [folder]);
	return deck && <RenderDeck deck={deck} slug={folder} resolve={localResolve} />;
}

type Injected = { id: string; deck: unknown; urls: Record<string, string> };

export function RenderInjected() {
	const data = (window as any).__RENDER__ as Injected | undefined;
	if (!data) return null;
	const deck = normalizeDeck(data.deck);
	return <RenderDeck deck={deck} slug={data.id} resolve={(_, src) => data.urls[src] ?? ""} />;
}
