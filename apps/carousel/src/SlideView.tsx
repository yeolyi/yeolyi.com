// 슬라이드 렌더러. 편집 화면·썸네일·내보내기가 모두 이걸 쓴다(내보내기 결과 == 편집 화면).
import {
  type CSSProperties,
  type ReactNode,
  type Ref,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AssetResolver, assetUrl, useAssetUrl } from "./assets";
import {
  type CodeLayer,
  type Deck,
  H,
  type ImageLayer,
  type Layer,
  parseMarkup,
  RED,
  type Slide,
  TEXT_STYLES,
  type TextLayer,
  W,
  WATERMARK,
} from "./model";

export function textBoxStyle(l: TextLayer): CSSProperties {
  const st = TEXT_STYLES[l.style];
  return {
    left: l.x,
    top: l.y,
    // 내용에 맞춘 너비가 캔버스 오른쪽 끝을 넘지 않게. 넘을 만큼 긴 단어는 그 자리에서 접힌다.
    maxWidth: W - Math.max(0, l.x),
    fontSize: st.size,
    lineHeight: st.lineHeight,
    color: l.color === "red" ? RED : st.color,
    textAlign: l.align,
  };
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

export function ImageContent({ slug, l }: { slug: string; l: ImageLayer }) {
  const url = useAssetUrl(slug, l.src);
  const fw = l.w / l.crop.w;
  const fh = l.h / l.crop.h;
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
  ref?: Ref<HTMLDivElement>;
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

// 내보내기 전에 코드 레이어가 다 그려질 때까지(최대 10초) 기다린다.
export async function codeLayersReady(root: ParentNode) {
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
        style={{ left: l.x, top: l.y, ...style }}
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
        style={{ ...textBoxStyle(l), ...style }}
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
      >
        {children ?? (
          <TextRuns text={l.text} color={textBoxStyle(l).color as string} />
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
      style={{ left: l.x, top: l.y, width: l.w, height: l.h, ...style }}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      <ImageContent slug={slug} l={l} />
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
  return (
    <div
      className="slide"
      style={{ width: W, height: H }}
      data-slide-index={index}
    >
      {slide.layers.map((l) => (
        <LayerView key={l.id} slug={slug} layer={l} />
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
