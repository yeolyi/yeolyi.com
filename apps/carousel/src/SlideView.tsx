// 슬라이드 렌더러. 편집 화면·썸네일·내보내기가 모두 이걸 쓴다(내보내기 결과 == 편집 화면).
import {
  type CSSProperties,
  type ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { AssetResolver, assetUrl, useAssetUrl } from "./assets";
import {
  type Box,
  CONTENT_W,
  type CodeLayer,
  type Deck,
  H,
  type ImageLayer,
  type Layer,
  layoutSlide,
  parseMarkup,
  RED,
  type Slide,
  TEXT_STYLES,
  type TextLayer,
  W,
  WATERMARK,
} from "./model";

// 브라우저 내보내기(modern-screenshot) 옵션. 복제본은 계산된 너비(465.17px 같은 소수)를 그대로 받는데,
// SVG 로 다시 그릴 때 글자 폭이 조금이라도 넓게 재지면 마지막 띄어쓰기에서 줄이 바뀐다(Safari).
// 그래서 글 상자 복제본만 너비를 다시 내용에 맞춘다. 캔버스 끝 제한(max-width)은 그대로 남는다.
export const SHOT_OPTIONS = {
  width: W,
  height: H,
  scale: 1,
  quality: 0.92,
  backgroundColor: "#fff",
  onCloneEachNode: (n: Node) => {
    if (n instanceof HTMLElement && n.classList.contains("txt"))
      n.style.width = "max-content";
  },
};

export function textBoxStyle(l: TextLayer, box: Box): CSSProperties {
  const st = TEXT_STYLES[l.style];
  return {
    left: box.x,
    top: box.y,
    // 내용에 맞춘 너비가 오른쪽 여백을 넘지 않게. 넘을 만큼 긴 단어는 그 자리에서 접힌다.
    maxWidth: CONTENT_W,
    fontSize: st.size,
    lineHeight: st.lineHeight,
    color: l.color === "red" ? RED : st.color,
  };
}

// 장 하나의 배치. 글·코드 상자는 내용에 맞춰지므로 그려진 크기를 재서(크기가 바뀌면 다시) layoutSlide 에 넘긴다.
// 돌려주는 ref(id) 를 그 상자들에 단다.
export function useSlideLayout(slide: Slide) {
  const els = useRef(new Map<string, HTMLElement>());
  const [sizes, setSizes] = useState<Record<string, { w: number; h: number }>>(
    {},
  );
  const measure = () => {
    let changed = false;
    const next: Record<string, { w: number; h: number }> = {};
    for (const l of slide.layers) {
      if (l.type === "image") continue;
      const el = els.current.get(l.id);
      const sz = { w: el?.offsetWidth ?? 0, h: el?.offsetHeight ?? 0 };
      next[l.id] = sz;
      if (sizes[l.id]?.w !== sz.w || sizes[l.id]?.h !== sz.h) changed = true;
    }
    if (changed) setSizes(next);
  };
  const measureRef = useRef(measure);
  measureRef.current = measure;
  useLayoutEffect(() => measureRef.current());
  // 코드 레이어는 비동기로 그려지고 글꼴도 늦게 올 수 있어 크기 변화를 지켜본다.
  useEffect(() => {
    const ro = new ResizeObserver(() => measureRef.current());
    for (const el of els.current.values()) ro.observe(el);
    return () => ro.disconnect();
  });
  const ref = (id: string) => (el: HTMLElement | null) => {
    if (el) els.current.set(id, el);
    else els.current.delete(id);
  };
  return { ...layoutSlide(slide, sizes), sizes, ref };
}

// 블러(||…||): 글자를 투명하게 하고 같은 색 그림자를 흐리게 깐다(줄바꿈되는 인라인에도 먹고, 내보내기에도 그대로 찍힌다).
const blurStyle = (color: string) => ({
  color: "transparent",
  textShadow: `0 0 0.2em ${color}`,
});

export function TextRuns({
  text,
  color = TEXT_STYLES.body.color,
}: {
  text: string;
  color?: string;
}) {
  return (
    <>
      {parseMarkup(text).map((r, i) => (
        <span
          key={i}
          style={{
            fontWeight: r.bold ? 700 : undefined,
            color: r.red ? RED : undefined,
            textDecoration: r.underline ? "underline" : undefined,
            ...(r.blur && blurStyle(r.red ? RED : color)),
          }}
        >
          {r.text}
        </span>
      ))}
      {/* 마지막 줄바꿈이 높이에 반영되도록 */}
      {text.endsWith("\n") ? "​" : null}
    </>
  );
}

export function ImageContent({
  slug,
  l,
  box,
}: {
  slug: string;
  l: ImageLayer;
  box: Box;
}) {
  const url = useAssetUrl(slug, l.src);
  const fw = box.w / l.crop.w;
  const fh = box.h / l.crop.h;
  return (
    <img
      src={url}
      crossOrigin="anonymous"
      alt=""
      draggable={false}
      style={{
        position: "absolute",
        left: -l.crop.x * fw,
        top: -l.crop.y * fh,
        width: fw,
        height: fh,
        maxWidth: "none",
        userSelect: "none",
      }}
    />
  );
}

type LayerProps = {
  slug: string;
  layer: Layer;
  box: Box;
  ref?: (el: HTMLDivElement | null) => void;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  onPointerDown?: (e: React.PointerEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
};

// 코드 레이어: 문자열을 Blob URL 로 모듈처럼 import 해 default(el) 를 부른다(그래서 export·맨 위 import 를 그대로 쓸 수 있다).
// el 은 Shadow DOM 안이라 편집기 CSS(label·input 등)가 새어 들지 않는다. 글꼴(@font-face)은 문서 전체라 그대로 쓴다.
// 다 그리면 data-ready 를 켠다. 내보내기는 그때까지 기다렸다 찍는다. 오류는 그 자리에 빨간 상자로.
function CodeContent({ slug, l }: { slug: string; l: CodeLayer }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const resolve = useContext(AssetResolver);
  const propsKey = JSON.stringify(l.props);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    const el = document.createElement("div");
    shadow.replaceChildren(el);
    let alive = true;
    let cleanup: unknown;
    setError(null);
    host.removeAttribute("data-ready");
    const url = URL.createObjectURL(
      new Blob([l.code], { type: "text/javascript" }),
    );
    import(/* @vite-ignore */ url)
      .then((m) =>
        m.default(el, JSON.parse(propsKey), {
          asset: (src: string) => assetUrl(slug, src, resolve),
        }),
      )
      .then((c) => {
        if (alive) cleanup = c;
        else if (typeof c === "function") c();
      })
      .catch(
        (e) => alive && setError(e instanceof Error ? e.message : String(e)),
      )
      .finally(() => {
        URL.revokeObjectURL(url);
        host.setAttribute("data-ready", "");
      });
    return () => {
      alive = false;
      if (typeof cleanup === "function") cleanup();
      shadow.replaceChildren();
    };
  }, [l.code, propsKey, slug, resolve]);
  return (
    <>
      <div ref={ref} />
      {error && <div className="code-error">{error}</div>}
    </>
  );
}

// 내보내기 전에 코드 레이어가 다 그려질 때까지(최대 10초) 기다린다. 그 뒤 크기를 다시 재 배치가 한 번 더 바뀌므로 두 프레임 더 기다린다.
export async function codeLayersReady(root: ParentNode) {
  await codeLayersDrawn(root);
  for (let i = 0; i < 2; i++)
    await new Promise((r) => requestAnimationFrame(r));
}

async function codeLayersDrawn(root: ParentNode) {
  for (let i = 0; i < 100; i++) {
    if (
      [...root.querySelectorAll(".layer.code > div:first-child")].every((el) =>
        el.hasAttribute("data-ready"),
      )
    )
      return;
    await new Promise((r) => setTimeout(r, 100));
  }
}

export function LayerView({
  slug,
  layer: l,
  box,
  ref,
  className,
  style,
  children,
  onPointerDown,
  onDoubleClick,
}: LayerProps) {
  if (l.type === "code") {
    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: 캔버스 위 레이어. 편집기에서만 포인터를 받고 키보드는 Editor 단축키가 맡는다
      <div
        ref={ref}
        data-id={l.id}
        className={`layer code ${className ?? ""}`}
        style={{ left: box.x, top: box.y, maxWidth: CONTENT_W, ...style }}
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
      >
        <CodeContent slug={slug} l={l} />
        {children}
      </div>
    );
  }
  if (l.type === "text") {
    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: 캔버스 위 레이어. 편집기에서만 포인터를 받고 키보드는 Editor 단축키가 맡는다
      <div
        ref={ref}
        data-id={l.id}
        className={`layer txt ${className ?? ""}`}
        style={{ ...textBoxStyle(l, box), ...style }}
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
      >
        {children ?? (
          <TextRuns
            text={l.text}
            color={textBoxStyle(l, box).color as string}
          />
        )}
      </div>
    );
  }
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: 캔버스 위 레이어. 편집기에서만 포인터를 받고 키보드는 Editor 단축키가 맡는다
    <div
      ref={ref}
      data-id={l.id}
      className={`layer img ${className ?? ""}`}
      style={{
        left: box.x,
        top: box.y,
        width: box.w,
        height: box.h,
        ...style,
      }}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      <ImageContent slug={slug} l={l} box={box} />
      {children}
    </div>
  );
}

export function Watermark({ deck, index }: { deck: Deck; index: number }) {
  const label = [deck.watermark, `${index + 1}/${deck.slides.length}`]
    .filter(Boolean)
    .join(" · ");
  return (
    <div
      className="watermark"
      style={{
        bottom: WATERMARK.bottom,
        fontSize: WATERMARK.size,
        fontWeight: WATERMARK.weight,
        color: WATERMARK.color,
      }}
    >
      {label}
    </div>
  );
}

export function SlideView({
  deck,
  slug,
  index,
  slide = deck.slides[index],
}: {
  deck: Deck;
  slug: string;
  index: number;
  slide?: Slide;
}) {
  const { boxes, ref } = useSlideLayout(slide);
  return (
    <div
      className="slide"
      style={{ width: W, height: H }}
      data-slide-index={index}
    >
      {slide.layers.map((l) => (
        <LayerView
          key={l.id}
          slug={slug}
          layer={l}
          box={boxes[l.id]}
          ref={l.type === "image" ? undefined : ref(l.id)}
        />
      ))}
      <Watermark deck={deck} index={index} />
    </div>
  );
}

// 정해진 너비로 축소한 슬라이드(목록·홈 썸네일).
export function Thumb({
  deck,
  slug,
  index,
  width,
}: {
  deck: Deck;
  slug: string;
  index: number;
  width: number;
}) {
  const s = width / W;
  return (
    <div className="thumb" style={{ width, height: H * s }}>
      <div style={{ transform: `scale(${s})`, transformOrigin: "0 0" }}>
        <SlideView deck={deck} slug={slug} index={index} />
      </div>
    </div>
  );
}
