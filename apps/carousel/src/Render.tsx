// dev 전용: decks/<폴더>/deck.json 을 그대로 그린다(pnpm export 가 헤드리스 크롬으로 찍는다).
// 모든 장을 세로로 늘어놓고, 폰트·이미지가 다 뜨면 window.__ready 를 켠다.
import { domToJpeg } from "modern-screenshot";
import { useEffect, useState } from "react";
import { LocalAssets } from "./assets";
import { type Deck, H, normalizeDeck, W } from "./model";
import { codeLayersReady, SlideView } from "./SlideView";

export function RenderLocal({ folder }: { folder: string }) {
	const [deck, setDeck] = useState<Deck | null>(null);
	useEffect(() => {
		fetch(`/files/${encodeURIComponent(folder)}/deck.json`)
			.then((r) => r.json())
			.then((raw) => setDeck(normalizeDeck(raw)));
	}, [folder]);
	useEffect(() => {
		if (!deck) return;
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
			(window as any).__ready = true;
		})();
	}, [deck]);
	if (!deck) return null;
	return (
		<LocalAssets value={true}>
			<div className="render">
				{deck.slides.map((s, i) => (
					<SlideView key={s.id} deck={deck} slug={folder} index={i} />
				))}
			</div>
		</LocalAssets>
	);
}

