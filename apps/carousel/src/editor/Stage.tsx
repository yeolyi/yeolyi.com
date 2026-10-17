// 가운데 캔버스: 선택·크롭·텍스트 직접 편집·이미지 드롭. 배치는 규칙(layoutSlide)이 정하므로 끌어 옮기지 않는다.

import { clamp } from "es-toolkit";
import { GripVertical } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { useAssetUrl } from "../assets";
import {
  type Box,
  type Deck,
  H,
  type ImageLayer,
  type Layer,
  type TextLayer,
  uid,
  W,
} from "../model";
import {
  LayerView,
  textBoxStyle,
  useSlideLayout,
  Watermark,
} from "../SlideView";
import { execMark, htmlToMarkup, markupToHtml } from "./richtext";
import { type Commit, mapSlide, patchLayer } from "./store";

type Pt = { x: number; y: number };

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
  onFiles: (files: File[]) => void;
};

export function Stage(p: StageProps) {
  const { deck, slug, si, sel, editing, cropping, commit } = p;
  const slide = deck.slides[si];
  const stageRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ scale: 0.5, ox: 0, oy: 0 });
  const { boxes, overflow, ref } = useSlideLayout(slide);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect();
      const scale = Math.min((width - 64) / W, (height - 64) / H);
      setView({
        scale,
        ox: (width - W * scale) / 2,
        oy: (height - H * scale) / 2,
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { scale, ox, oy } = view;
  const boxOf = (l: Layer): Box => boxes[l.id] ?? { x: 0, y: 0, w: 0, h: 0 };

  // 공통 드래그 루프(크롭에서만 쓴다). move 가 commit 할 다음 상태를 만든다.
  const drag = (
    e: React.PointerEvent,
    move: (dx: number, dy: number, key: string) => void,
  ) => {
    const sx = e.clientX;
    const sy = e.clientY;
    const key = `drag:${uid()}`;
    let started = false;
    const onMove = (ev: PointerEvent) => {
      if (!started && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 3) return;
      started = true;
      move((ev.clientX - sx) / scale, (ev.clientY - sy) / scale, key);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
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

  const select = (l: Layer, e: React.PointerEvent) => {
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
  };

  // 크롭: 틀의 자리·폭은 배치가 정하고, 여기서는 원본에서 보일 영역(crop)만 바꾼다.
  // 안을 끌면 그림이 틀 안에서 움직이고, 손잡이는 보일 영역의 가장자리를 옮긴다(폭이 고정이라 좁히면 확대된다).
  const startCrop = (l: ImageLayer, handle: string, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const b = boxOf(l);
    const fw = b.w / l.crop.w;
    const fh = b.h / l.crop.h;
    const F0 = { x: b.x - l.crop.x * fw, y: b.y - l.crop.y * fh, w: fw, h: fh };
    const R0 = { ...b };
    drag(e, (dx, dy, key) => {
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
        if (handle.includes("e"))
          right = clamp(right + dx, left + MIN, F.x + F.w);
        if (handle.includes("n")) top = clamp(R0.y + dy, F.y, bottom - MIN);
        if (handle.includes("s"))
          bottom = clamp(bottom + dy, top + MIN, F.y + F.h);
        R = { x: left, y: top, w: right - left, h: bottom - top };
      }
      const crop = {
        x: (R.x - F.x) / F.w,
        y: (R.y - F.y) / F.h,
        w: R.w / F.w,
        h: R.h / F.h,
      };
      commit((d) => patchLayer(d, si, l.id, { crop }), key);
    });
  };

  const onBackground = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    p.setSel(null);
    p.setCropping(null);
  };

  const onDrop = (e: React.DragEvent) => {
    const files = [...e.dataTransfer.files].filter((f) =>
      f.type.startsWith("image/"),
    );
    if (!files.length) return;
    e.preventDefault();
    p.onFiles(files);
  };

  const selLayer = slide.layers.find((l) => l.id === sel) ?? null;
  const S = (v: number) => v * scale;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: 캔버스 바탕. 키보드는 Editor 단축키가 맡는다
    <div
      ref={stageRef}
      className="stage"
      onPointerDown={onBackground}
      onDragOver={(e) =>
        e.dataTransfer.types.includes("Files") && e.preventDefault()
      }
      onDrop={onDrop}
    >
      <div
        className="world"
        style={{
          left: ox,
          top: oy,
          transform: `scale(${scale})`,
          ["--s" as string]: scale,
        }}
      >
        <div className="slide" style={{ width: W, height: H }}>
          {slide.layers.map((l) =>
            editing?.id === l.id && l.type === "text" ? (
              <RichEdit
                key={l.id}
                layer={l}
                box={boxOf(l)}
                caret={editing.caret}
                elRef={ref(l.id)}
                onDone={(text) => {
                  p.setEditing(null);
                  if (!text.trim())
                    commit((d) =>
                      mapSlide(d, si, (ls) => ls.filter((x) => x.id !== l.id)),
                    );
                  else if (text !== l.text)
                    commit((d) => patchLayer(d, si, l.id, { text }));
                }}
              />
            ) : (
              <LayerView
                key={l.id}
                slug={slug}
                layer={l}
                box={boxOf(l)}
                ref={l.type === "image" ? undefined : ref(l.id)}
                className={l.id === sel ? "selected" : ""}
                // 코드 레이어는 내용을 늘 조작할 수 있게 두고, 선택은 손잡이로 한다.
                onPointerDown={
                  l.type === "code" ? undefined : (e) => select(l, e)
                }
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  openLayer(l, { x: e.clientX, y: e.clientY });
                }}
              >
                {/* false 를 넘기면 텍스트 레이어가 글자 대신 그걸 그린다(children ?? 글자) */}
                {l.type === "code" ? (
                  <div
                    className="move-handle"
                    title="선택"
                    onPointerDown={(e) => select(l, e)}
                  >
                    <GripVertical size={14} strokeWidth={2.5} />
                  </div>
                ) : undefined}
              </LayerView>
            ),
          )}
          <Watermark deck={deck} index={si} />
        </div>
        <div
          className="mask"
          style={{ left: -1e4, top: -1e4, width: W + 2e4, height: 1e4 }}
        />
        <div
          className="mask"
          style={{ left: -1e4, top: H, width: W + 2e4, height: 1e4 }}
        />
        <div
          className="mask"
          style={{ left: -1e4, top: 0, width: 1e4, height: H }}
        />
        <div
          className="mask"
          style={{ left: W, top: 0, width: 1e4, height: H }}
        />
      </div>

      <div className="overlay">
        <div
          className="frame"
          style={{ left: ox, top: oy, width: S(W), height: S(H) }}
        />
        {overflow > 0 && (
          <div className="overflow-note" style={{ left: ox, top: oy + S(H) }}>
            글이 {Math.ceil(overflow)}px 넘칩니다. 줄이거나 장을 나누세요
          </div>
        )}
        {selLayer &&
          cropping !== selLayer.id &&
          editing?.id !== selLayer.id && (
            <div
              className="selbox"
              style={{
                left: ox + S(boxOf(selLayer).x),
                top: oy + S(boxOf(selLayer).y),
                width: S(boxOf(selLayer).w),
                height: S(boxOf(selLayer).h),
              }}
            />
          )}
        {selLayer?.type === "image" && cropping === selLayer.id && (
          <CropBox
            slug={slug}
            l={selLayer}
            box={boxOf(selLayer)}
            S={S}
            ox={ox}
            oy={oy}
            onHandle={(h, e) => startCrop(selLayer, h, e)}
          />
        )}
      </div>
    </div>
  );
}

function CropBox({
  slug,
  l,
  box,
  S,
  ox,
  oy,
  onHandle,
}: {
  slug: string;
  l: ImageLayer;
  box: Box;
  S: (v: number) => number;
  ox: number;
  oy: number;
  onHandle: (h: string, e: React.PointerEvent) => void;
}) {
  const url = useAssetUrl(slug, l.src);
  const fw = box.w / l.crop.w;
  const fh = box.h / l.crop.h;
  const fx = box.x - l.crop.x * fw;
  const fy = box.y - l.crop.y * fh;
  return (
    <>
      <img
        className="crop-ghost"
        src={url}
        alt=""
        style={{
          left: ox + S(fx),
          top: oy + S(fy),
          width: S(fw),
          height: S(fh),
        }}
      />
      <div
        className="cropbox"
        style={{
          left: ox + S(box.x),
          top: oy + S(box.y),
          width: S(box.w),
          height: S(box.h),
        }}
        onPointerDown={(e) => onHandle("pan", e)}
      >
        {["n", "s", "e", "w", "nw", "ne", "sw", "se"].map((h) => (
          <div
            key={h}
            className={`handle h-${h}`}
            onPointerDown={(e) => onHandle(h, e)}
          />
        ))}
      </div>
    </>
  );
}

function RichEdit({
  layer,
  box,
  caret,
  elRef,
  onDone,
}: {
  layer: TextLayer;
  box: Box;
  caret?: Pt;
  elRef: (el: HTMLDivElement | null) => void;
  onDone: (text: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
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
    // biome-ignore lint/a11y/noStaticElementInteractions: contentEditable 글 상자. 포인터 이벤트가 캔버스로 새지 않게만 막는다
    <div
      ref={(el) => {
        ref.current = el;
        elRef(el);
      }}
      className="layer txt editing"
      style={textBoxStyle(layer, box)}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onPointerDown={(e) => e.stopPropagation()}
      onBlur={(e) => onDone(htmlToMarkup(e.currentTarget))}
      onPaste={(e) => {
        e.preventDefault();
        document.execCommand(
          "insertText",
          false,
          e.clipboardData.getData("text/plain"),
        );
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
