// 슬라이드 목록 아래, 장 썸네일과 같은 크기의 인스타 캡션(게시물 본문) 칸.
import Textarea from "@yeolyi/ui/Textarea";
import { useId } from "react";
import type { Deck } from "../model";
import type { Commit } from "./store";

export function CaptionBox({ deck, commit, wide = false }: { deck: Deck; commit: Commit; wide?: boolean }) {
	const id = useId();
	return (
		<div className={`caption-item flex flex-col ${wide ? "wide" : ""}`}>
			<label htmlFor={id} className={wide ? "sr-only" : "leading-[1.4]"}>
				인스타 캡션
			</label>
			<Textarea
				id={id}
				className="mt-1"
				value={deck.caption}
				placeholder="게시물에 올릴 글과 #해시태그"
				onChange={(e) => commit((d) => ({ ...d, caption: e.target.value }), "caption")}
			/>
		</div>
	);
}
