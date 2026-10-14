// 가운데 캔버스: 선택·이동·리사이즈·스냅·크롭·텍스트 직접 편집·이미지 드롭.
import { GripVertical } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { type Align, type Deck, H, type ImageLayer, type Layer, EDGE_MARGIN, type TextLayer, uid, W } from "../model";
import { useAssetUrl } from "../assets";
import { LayerView, textBoxStyle, Watermark } from "../SlideView";
import { execMark, htmlToMarkup, markupToHtml } from "./richtext";
import { type Commit, mapSlide, patchLayer } from "./store";

type Pt = { x: number; y: number };
type Box = { x: number; y: number; w: number; h: number };
type Guides = { v: number[]; h: number[] };

const SNAP_PX = 8;
const MIN = 20;

export type StageProps = {
	deck: Deck;
	slug: string;
	si: number;
	sel: string | null;
	setSel: (id: string | null) => void;
	editing: { id: string; caret?: Pt } | null;
	setEditing: (e: { id: string; caret?: Pt } | null) => void;
	cropping: string | null;
	setCropping: (id: string | null) => void;
	commit: Commit;
	onFiles: (files: File[], at?: Pt) => void;
};

function snap(vals: number[], targets: number[], thr: number) {
	let best: { d: number; t: number } | null = null;
	for (const v of vals)
		for (const t of targets) {
			const d = t - v;
			if (Math.abs(d) <= thr && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, t };
		}
	return best;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const r2 = (v: number) => Math.round(v * 100) / 100;

export function Stage(p: StageProps) {
	const { deck, slug, si, sel, editing, cropping, commit } = p;
	const slide = deck.slides[si];
	const stageRef = useRef<HTMLDivElement>(null);
	const [view, setView] = useState({ scale: 0.5, ox: 0, oy: 0 });
	const els = useRef(new Map<string, HTMLDivElement>());
	const [sizes, setSizes] = useState<Record<string, { w: number; h: number }>>({});
	const [guides, setGuides] = useState<Guides>({ v: [], h: [] });

	useLayoutEffect(() => {
		const el = stageRef.current;
		if (!el) return;
		const ro = new ResizeObserver(() => {
			const { width, height } = el.getBoundingClientRect();
			const scale = Math.min((width - 64) / W, (height - 64) / H);
			setView({ scale, ox: (width - W * scale) / 2, oy: (height - H * scale) / 2 });
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	// 텍스트·코드 상자는 내용에 맞춰지므로 크기를 렌더 결과에서 읽는다(스냅·선택 테두리용).
	useLayoutEffect(() => {
		const next: Record<string, { w: number; h: number }> = {};
		let changed = Object.keys(sizes).length !== slide.layers.length;
		for (const l of slide.layers) {
			const el = els.current.get(l.id);
			const sz = { w: el?.offsetWidth ?? 0, h: el?.offsetHeight ?? 0 };
			next[l.id] = sz;
			if (sizes[l.id]?.w !== sz.w || sizes[l.id]?.h !== sz.h) changed = true;
		}
		if (changed) setSizes(next);
	});

	const { scale, ox, oy } = view;
	const boxOf = (l: Layer): Box =>
		l.type === "image" ? { x: l.x, y: l.y, w: l.w, h: l.h } : { x: l.x, y: l.y, w: sizes[l.id]?.w ?? 0, h: sizes[l.id]?.h ?? 0 };
	const toCanvas = (cx: number, cy: number): Pt => {
		const r = stageRef.current?.getBoundingClientRect();
		return { x: (cx - (r?.left ?? 0) - ox) / scale, y: (cy - (r?.top ?? 0) - oy) / scale };
	};

	// 스냅은 배치 버튼과 같은 세 자리뿐: 왼쪽 여백선·가운데선·오른쪽 여백선.
	const SPOTS: [Align, number][] = [
		["left", EDGE_MARGIN],
		["center", W / 2],
		["right", W - EDGE_MARGIN],
	];
	const placeSnap = (x: number, w: number, thr: number) => {
		let best: { d: number; t: number; where: Align } | null = null;
		for (const [where, t] of SPOTS) {
			const v = where === "left" ? x : where === "center" ? x + w / 2 : x + w;
			if (Math.abs(t - v) <= thr && (!best || Math.abs(t - v) < Math.abs(best.d))) best = { d: t - v, t, where };
		}
		return best;
	};

	// 공통 드래그 루프. move 가 commit 할 다음 상태를 만든다.
	const drag = (e: React.PointerEvent, move: (dx: number, dy: number, ev: PointerEvent, key: string) => void) => {
		const sx = e.clientX;
		const sy = e.clientY;
		const key = `drag:${uid()}`;
		let started = false;
		const onMove = (ev: PointerEvent) => {
			const dx = (ev.clientX - sx) / scale;
			const dy = (ev.clientY - sy) / scale;
			if (!started && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 3) return;
			started = true;
			move(dx, dy, ev, key);
		};
		const onUp = () => {
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
			setGuides({ v: [], h: [] });
		};
		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
	};

	// 터치에서는 dblclick 이 잘 안 와서 두 번 탭을 직접 잡는다.
	const lastTap = useRef<{ id: string; at: number } | null>(null);
	const openLayer = (l: Layer, at?: Pt) => {
		if (l.type === "text") p.setEditing({ id: l.id, caret: at });
		else if (l.type === "image") p.setCropping(l.id);
	};

	const startMove = (l: Layer, e: React.PointerEvent) => {
		if (e.button !== 0 || editing?.id === l.id) return;
		e.stopPropagation();
		if (e.pointerType === "touch") {
			const now = Date.now();
			if (lastTap.current?.id === l.id && now - lastTap.current.at < 350) {
				lastTap.current = null;
				p.setSel(l.id);
				openLayer(l, { x: e.clientX, y: e.clientY });
				return;
			}
			lastTap.current = { id: l.id, at: now };
		}
		p.setSel(l.id);
		if (cropping && cropping !== l.id) p.setCropping(null);
		if (cropping === l.id) return;
		const b0 = boxOf(l);
		const thr = SNAP_PX / scale;
		drag(e, (dx, dy, ev, key) => {
			let nx = b0.x + dx;
			const ny = b0.y + dy;
			// 붙으면 텍스트는 줄 정렬도 같은 쪽으로 맞춘다.
			const s = ev.altKey ? null : placeSnap(nx, b0.w, thr);
			if (s) nx += s.d;
			setGuides({ v: s ? [s.t] : [], h: [] });
			const align = l.type === "text" && s ? { align: s.where } : {};
			commit((d) => patchLayer(d, si, l.id, { x: r2(nx), y: r2(ny), ...align }), key);
		});
	};

	const startResize = (l: ImageLayer, handle: string, e: React.PointerEvent) => {
		e.stopPropagation();
		e.preventDefault();
		const b0 = boxOf(l);
		const xs = SPOTS.map(([, t]) => t);
		const thr = SNAP_PX / scale;
		const west = handle.includes("w");
		const north = handle.includes("n");
		drag(e, (dx, dy, ev, key) => {
			const g: Guides = { v: [], h: [] };
			const ratio = b0.h / b0.w;
			const byX = b0.w + (west ? -dx : dx);
			const byY = (b0.h + (north ? -dy : dy)) / ratio;
			let w = Math.abs(byX - b0.w) >= Math.abs(byY - b0.w) ? byX : byY;
			if (!ev.altKey) {
				const edge = west ? b0.x + b0.w - w : b0.x + w;
				const s = snap([edge], xs, thr);
				if (s) (w += west ? -s.d : s.d), g.v.push(s.t);
			}
			w = Math.max(MIN, w);
			const h = w * ratio;
			setGuides(g);
			commit(
				(d) =>
					patchLayer(d, si, l.id, {
						x: r2(west ? b0.x + b0.w - w : b0.x),
						y: r2(north ? b0.y + b0.h - h : b0.y),
						w: r2(w),
						h: r2(h),
					}),
				key,
			);
		});
	};

	const startCrop = (l: ImageLayer, handle: string, e: React.PointerEvent) => {
		e.stopPropagation();
		e.preventDefault();
		const fw = l.w / l.crop.w;
		const fh = l.h / l.crop.h;
		const F0 = { x: l.x - l.crop.x * fw, y: l.y - l.crop.y * fh, w: fw, h: fh };
		const R0 = { x: l.x, y: l.y, w: l.w, h: l.h };
		drag(e, (dx, dy, _ev, key) => {
			const F = { ...F0 };
			let R = { ...R0 };
			if (handle === "pan") {
				F.x = clamp(F0.x + dx, R.x + R.w - F.w, R.x);
				F.y = clamp(F0.y + dy, R.y + R.h - F.h, R.y);
			} else {
				let left = R0.x;
				let top = R0.y;
				let right = R0.x + R0.w;
				let bottom = R0.y + R0.h;
				if (handle.includes("w")) left = clamp(R0.x + dx, F.x, right - MIN);
				if (handle.includes("e")) right = clamp(right + dx, left + MIN, F.x + F.w);
				if (handle.includes("n")) top = clamp(R0.y + dy, F.y, bottom - MIN);
				if (handle.includes("s")) bottom = clamp(bottom + dy, top + MIN, F.y + F.h);
				R = { x: left, y: top, w: right - left, h: bottom - top };
			}
			const crop = { x: (R.x - F.x) / F.w, y: (R.y - F.y) / F.h, w: R.w / F.w, h: R.h / F.h };
			commit((d) => patchLayer(d, si, l.id, { x: r2(R.x), y: r2(R.y), w: r2(R.w), h: r2(R.h), crop }), key);
		});
	};

	const onBackground = (e: React.PointerEvent) => {
		if (e.button !== 0) return;
		p.setSel(null);
		p.setCropping(null);
	};

	const onDrop = (e: React.DragEvent) => {
		const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/"));
		if (!files.length) return;
		e.preventDefault();
		p.onFiles(files, toCanvas(e.clientX, e.clientY));
	};

	const selLayer = slide.layers.find((l) => l.id === sel) ?? null;
	const S = (v: number) => v * scale;

	return (
		<div
			ref={stageRef}
			className="stage"
			onPointerDown={onBackground}
			onDragOver={(e) => e.dataTransfer.types.includes("Files") && e.preventDefault()}
			onDrop={onDrop}
		>
			<div
				className="world"
				style={{ left: ox, top: oy, transform: `scale(${scale})`, ["--s" as string]: scale }}
			>
				<div className="slide" style={{ width: W, height: H }}>
					{slide.layers.map((l) =>
						editing?.id === l.id && l.type === "text" ? (
							<RichEdit
								key={l.id}
								layer={l}
								caret={editing.caret}
								elRef={(el) => (el ? els.current.set(l.id, el) : els.current.delete(l.id))}
								onDone={(text) => {
									p.setEditing(null);
									if (!text.trim()) commit((d) => mapSlide(d, si, (ls) => ls.filter((x) => x.id !== l.id)));
									else if (text !== l.text) commit((d) => patchLayer(d, si, l.id, { text }));
								}}
							/>
						) : (
							<LayerView
								key={l.id}
								slug={slug}
								layer={l}
								ref={(el) => {
									if (el) els.current.set(l.id, el);
									else els.current.delete(l.id);
								}}
								className={l.id === sel ? "selected" : ""}
								// 코드 레이어는 내용을 늘 조작할 수 있게 두고, 옮기기·선택은 손잡이로 한다.
								onPointerDown={l.type === "code" ? undefined : (e) => startMove(l, e)}
								onDoubleClick={(e) => {
									e.stopPropagation();
									openLayer(l, { x: e.clientX, y: e.clientY });
								}}
							>
								{/* false 를 넘기면 텍스트 레이어가 글자 대신 그걸 그린다(children ?? 글자) */}
								{l.type === "code" ? (
									<div className="move-handle" title="끌어서 옮기기" onPointerDown={(e) => startMove(l, e)}>
										<GripVertical size={14} strokeWidth={2.5} />
									</div>
								) : undefined}
							</LayerView>
						),
					)}
					<Watermark deck={deck} index={si} />
				</div>
				<div className="mask" style={{ left: -1e4, top: -1e4, width: W + 2e4, height: 1e4 }} />
				<div className="mask" style={{ left: -1e4, top: H, width: W + 2e4, height: 1e4 }} />
				<div className="mask" style={{ left: -1e4, top: 0, width: 1e4, height: H }} />
				<div className="mask" style={{ left: W, top: 0, width: 1e4, height: H }} />
			</div>

			<div className="overlay">
				<div className="frame" style={{ left: ox, top: oy, width: S(W), height: S(H) }} />
				{guides.v.map((x) => (
					<div key={`v${x}`} className="guide v" style={{ left: ox + S(x) }} />
				))}
				{guides.h.map((y) => (
					<div key={`h${y}`} className="guide h" style={{ top: oy + S(y) }} />
				))}
				{selLayer && cropping !== selLayer.id && editing?.id !== selLayer.id && (
					<SelectionBox
						box={boxOf(selLayer)}
						kind={selLayer.type}
						S={S}
						ox={ox}
						oy={oy}
						onHandle={(h, e) => selLayer.type === "image" && startResize(selLayer, h, e)}
					/>
				)}
				{selLayer?.type === "image" && cropping === selLayer.id && (
					<CropBox slug={slug} l={selLayer} S={S} ox={ox} oy={oy} onHandle={(h, e) => startCrop(selLayer, h, e)} />
				)}
			</div>
		</div>
	);
}

function SelectionBox({
	box,
	kind,
	S,
	ox,
	oy,
	onHandle,
}: {
	box: Box;
	kind: Layer["type"];
	S: (v: number) => number;
	ox: number;
	oy: number;
	onHandle: (h: string, e: React.PointerEvent) => void;
}) {
	// 텍스트는 크기 조절 손잡이가 없다(내용에 맞춤).
	const handles = kind === "image" ? ["nw", "ne", "sw", "se"] : [];
	return (
		<div className="selbox" style={{ left: ox + S(box.x), top: oy + S(box.y), width: S(box.w), height: S(box.h) }}>
			{handles.map((h) => (
				<div key={h} className={`handle h-${h}`} onPointerDown={(e) => onHandle(h, e)} />
			))}
		</div>
	);
}

function CropBox({
	slug,
	l,
	S,
	ox,
	oy,
	onHandle,
}: {
	slug: string;
	l: ImageLayer;
	S: (v: number) => number;
	ox: number;
	oy: number;
	onHandle: (h: string, e: React.PointerEvent) => void;
}) {
	const url = useAssetUrl(slug, l.src);
	const fw = l.w / l.crop.w;
	const fh = l.h / l.crop.h;
	const fx = l.x - l.crop.x * fw;
	const fy = l.y - l.crop.y * fh;
	return (
		<>
			<img
				className="crop-ghost"
				src={url}
				alt=""
				style={{ left: ox + S(fx), top: oy + S(fy), width: S(fw), height: S(fh) }}
			/>
			<div
				className="cropbox"
				style={{ left: ox + S(l.x), top: oy + S(l.y), width: S(l.w), height: S(l.h) }}
				onPointerDown={(e) => onHandle("pan", e)}
			>
				{["n", "s", "e", "w", "nw", "ne", "sw", "se"].map((h) => (
					<div key={h} className={`handle h-${h}`} onPointerDown={(e) => onHandle(h, e)} />
				))}
			</div>
		</>
	);
}

function RichEdit({
	layer,
	caret,
	elRef,
	onDone,
}: {
	layer: TextLayer;
	caret?: Pt;
	elRef: (el: HTMLDivElement | null) => void;
	onDone: (text: string) => void;
}) {
	const ref = useRef<HTMLDivElement>(null);
	// biome-ignore lint/correctness/useExhaustiveDependencies: 편집 시작 때 한 번만
	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;
		el.innerHTML = markupToHtml(layer.text);
		el.focus();
		const sel = window.getSelection();
		const range = document.createRange();
		const pos = caret && document.caretPositionFromPoint?.(caret.x, caret.y);
		if (pos && el.contains(pos.offsetNode)) {
			range.setStart(pos.offsetNode, pos.offset);
			range.collapse(true);
		} else range.selectNodeContents(el);
		sel?.removeAllRanges();
		sel?.addRange(range);
	}, []);

	return (
		<div
			ref={(el) => {
				ref.current = el;
				elRef(el);
			}}
			className="layer txt editing"
			style={textBoxStyle(layer)}
			contentEditable
			suppressContentEditableWarning
			spellCheck={false}
			onPointerDown={(e) => e.stopPropagation()}
			onBlur={(e) => onDone(htmlToMarkup(e.currentTarget))}
			onPaste={(e) => {
				e.preventDefault();
				document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
			}}
			onKeyDown={(e) => {
				e.stopPropagation();
				if (e.nativeEvent.isComposing) return;
				const k = e.key.toLowerCase();
				if (e.metaKey && e.shiftKey && k === "x") {
					e.preventDefault();
					execMark("blur");
				} else if (e.metaKey && (k === "b" || k === "e" || k === "u")) {
					e.preventDefault();
					execMark(k === "b" ? "bold" : k === "e" ? "red" : "underline");
				} else if (e.key === "Enter") {
					e.preventDefault();
					document.execCommand("insertLineBreak");
				} else if (e.key === "Escape") {
					e.currentTarget.blur();
				}
			}}
		/>
	);
}
