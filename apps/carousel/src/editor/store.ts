// 덱 상태 + 실행 취소 + 자동 저장 + 바깥 변경(다른 탭·Claude 의 push) 반영.
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";
import { type Deck, type Layer, normalizeDeck } from "../model";
import { supabase } from "../supabase";

type Hist = { deck: Deck | null; past: Deck[]; future: Deck[] };
export type SaveState = "saved" | "dirty" | "saving" | "error";

const LIMIT = 200;

export function useDeckStore(slug: string) {
	const [h, setH] = useState<Hist>({ deck: null, past: [], future: [] });
	const [save, setSave] = useState<SaveState>("saved");
	const [error, setError] = useState<string | null>(null);
	const last = useRef<{ key?: string; at: number }>({ at: 0 });
	const saved = useRef<string>("");
	// 저장 요청을 보낸 뒤 응답보다 realtime 알림이 먼저(또는 다음 저장 뒤에) 올 수 있어서,
	// 최근에 보낸 내용은 모두 "내 것"으로 본다. 메아리가 늦게 와도 걸러지게 잠시 들고 있는다.
	const sent = useRef(new Set<string>());
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const deckRef = useRef<Deck | null>(null);
	deckRef.current = h.deck;

	const load = useCallback(async () => {
		try {
			const d = await api.get(slug);
			saved.current = JSON.stringify(d);
			const next = { deck: d, past: [], future: [] };
			histRef.current = next;
			deckRef.current = d;
			setH(next);
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		}
	}, [slug]);

	useEffect(() => {
		load();
	}, [load]);

	const flush = useCallback(async () => {
		clearTimeout(timer.current);
		const d = deckRef.current;
		if (!d || JSON.stringify(d) === saved.current) return setSave("saved");
		setSave("saving");
		try {
			const text = JSON.stringify(normalizeDeck(d));
			sent.current.add(text);
			setTimeout(() => sent.current.delete(text), 10_000);
			const back = await api.put(slug, d);
			saved.current = JSON.stringify(back.deck);
			setSave(JSON.stringify(deckRef.current) === JSON.stringify(d) ? "saved" : "dirty");
		} catch (e) {
			setSave("error");
			setError(e instanceof Error ? e.message : String(e));
		}
	}, [slug]);

	// 히스토리는 ref 에 두고 갱신한다. 드래그 중 연속 commit 이 렌더를 기다리지 않고 이어지게.
	const histRef = useRef(h);
	histRef.current = h;
	const apply = useCallback(
		(next: Hist) => {
			histRef.current = next;
			deckRef.current = next.deck;
			setH(next);
			setSave("dirty");
			clearTimeout(timer.current);
			timer.current = setTimeout(flush, 400);
		},
		[flush],
	);

	// 같은 key 로 1초 안에 들어온 변경은 실행 취소 한 칸으로 묶는다(드래그·타이핑).
	const commit = useCallback(
		(fn: (d: Deck) => Deck, key?: string) => {
			const cur = histRef.current;
			if (!cur.deck) return;
			const next = fn(cur.deck);
			if (next === cur.deck) return;
			const now = Date.now();
			const merge = key !== undefined && key === last.current.key && now - last.current.at < 1000;
			last.current = { key, at: now };
			apply({ deck: next, past: merge ? cur.past : [...cur.past.slice(-LIMIT), cur.deck], future: [] });
		},
		[apply],
	);

	const undo = useCallback(() => {
		const cur = histRef.current;
		if (!cur.deck || !cur.past.length) return;
		last.current = { at: 0 };
		apply({ deck: cur.past[cur.past.length - 1], past: cur.past.slice(0, -1), future: [cur.deck, ...cur.future] });
	}, [apply]);

	const redo = useCallback(() => {
		const cur = histRef.current;
		if (!cur.deck || !cur.future.length) return;
		last.current = { at: 0 };
		apply({ deck: cur.future[0], past: [...cur.past, cur.deck], future: cur.future.slice(1) });
	}, [apply]);

	// DB 의 덱이 바깥에서 바뀌면(내 저장이 아닌 경우만) 실행 취소 한 칸으로 받아들인다.
	useEffect(() => {
		const channel = supabase
			.channel(`deck:${slug}`)
			.on("postgres_changes", { event: "UPDATE", schema: "carousel", table: "decks", filter: `id=eq.${slug}` }, ({ new: row }) => {
				// DB 행에는 워터마크가 없다(계정 설정). 지금 것을 채워야 내 저장의 메아리를 바깥 변경으로 잘못 보지 않는다.
				const d = normalizeDeck({ ...row, watermark: deckRef.current?.watermark ?? "" });
				const text = JSON.stringify(d);
				if (text === saved.current || sent.current.has(text)) return;
				saved.current = text;
				clearTimeout(timer.current);
				last.current = { at: 0 };
				const cur = histRef.current;
				const next = { deck: d, past: cur.deck ? [...cur.past, cur.deck] : cur.past, future: [] };
				histRef.current = next;
				deckRef.current = d;
				setH(next);
				setSave("saved");
			})
			.subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	}, [slug]);

	useEffect(() => {
		const warn = (e: BeforeUnloadEvent) => {
			if (deckRef.current && JSON.stringify(deckRef.current) !== saved.current) e.preventDefault();
		};
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, []);

	return {
		deck: h.deck,
		canUndo: h.past.length > 0,
		canRedo: h.future.length > 0,
		save,
		error,
		setError,
		commit,
		undo,
		redo,
		flush,
	};
}

export type Commit = (fn: (d: Deck) => Deck, key?: string) => void;

export function mapSlide(d: Deck, si: number, fn: (layers: Layer[]) => Layer[]): Deck {
	return { ...d, slides: d.slides.map((s, i) => (i === si ? { ...s, layers: fn(s.layers) } : s)) };
}

export function patchLayer(d: Deck, si: number, id: string, patch: Partial<Layer> | ((l: Layer) => Partial<Layer>)): Deck {
	return mapSlide(d, si, (ls) =>
		ls.map((l) => (l.id === id ? ({ ...l, ...(typeof patch === "function" ? patch(l) : patch) } as Layer) : l)),
	);
}
