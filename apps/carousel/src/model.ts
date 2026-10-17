// 덱 데이터 모델. 브라우저와 서버(vite 플러그인·export 스크립트)가 함께 쓰므로 DOM·React 를 import 하지 않는다.
import { clamp } from "es-toolkit";

export const W = 1080;
export const H = 1350;
export const RED = "#EE220C";
export const BLACK = "#000000";

export const TEXT_STYLES = {
  body: { size: 40, lineHeight: 1.44, color: BLACK },
  caption: { size: 30, lineHeight: 1.44, color: "#8E8E8E" },
} as const;

// 배치 규칙: 좌표 없이 위에서 아래로 쌓는다. 가로는 왼쪽 여백에 붙이고(꽉 채운 그림만 0),
// 요소 사이는 본문 한 줄(57.6px), 묶음 전체는 장마다 위(top) 또는 세로 가운데(center).
export const MARGIN = { x: 80, top: 120, bottom: 120 };
export const CONTENT_W = W - MARGIN.x * 2;
export const GAP = TEXT_STYLES.body.size * TEXT_STYLES.body.lineHeight;

// #949494 는 흰 배경 대비 3.03:1. 30px 는 WCAG 의 큰 글자라 AA 기준 3:1 을 넘는다(#959595 부터는 미달).
export const WATERMARK = {
  size: 30,
  weight: 400,
  color: "#949494",
  bottom: 24,
};

export type TextStyle = keyof typeof TEXT_STYLES;
export type VAlign = "top" | "center";
export type Crop = { x: number; y: number; w: number; h: number };
export type ImageSize = "small" | "normal" | "full";
// 그림 폭. 작게는 아이콘·로고처럼 본문 폭이면 너무 커지는 그림용(본문 폭의 절반).
export const IMAGE_W: Record<ImageSize, number> = {
  small: 460,
  normal: 920,
  full: 1080,
};

export type TextLayer = {
  id: string;
  type: "text";
  // 너비는 없다. 내용에 맞춰지고, 오른쪽 여백에서 줄이 바뀐다.
  text: string;
  style: TextStyle;
  color: "black" | "red";
};

// 크기는 배치가 정한다: 폭은 size 로(작게 460·본문 폭 920·꽉 채움 1080), 높이는 크롭한 비율대로.
// 남은 높이보다 크면 비율을 지킨 채 줄어든다. crop 은 원본 대비 보일 영역 비율 {x,y,w,h}(0~1).
export type ImageLayer = {
  id: string;
  type: "image";
  src: string;
  nw: number;
  nh: number;
  size: ImageSize;
  crop: Crop;
};

// 덱 주인이 쓴 JS 모듈. `export default (el, props, { asset }) => 정리함수?` 로 el 안을 그린다(비동기여도 된다).
// props 는 같은 코드를 장마다 다른 값으로 쓰게 하는 값 묶음, asset("assets/x.png") 는 덱 이미지의 주소를 돌려준다.
// 덱은 주인만 열 수 있어 코드도 주인 브라우저에서만 돈다. 편집 UI 는 없고 Claude 가 JSON 으로 쓴다. 크기는 그려진 내용에 맞춰진다.
export type CodeLayer = {
  id: string;
  type: "code";
  code: string;
  props: Record<string, unknown>;
};

export type Layer = TextLayer | ImageLayer | CodeLayer;

export type Slide = {
  id: string;
  memo: string;
  valign: VAlign;
  // 배열 순서 = 위에서 아래로 쌓는 순서
  layers: Layer[];
};

export type Deck = {
  version: 2;
  title: string;
  watermark: string;
  caption: string; // 인스타 게시물 본문(해시태그 포함)
  slides: Slide[];
};

export const uid = () => Math.random().toString(36).slice(2, 8);

const num = (v: unknown, d: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : d;

// ---- 배치 ----

export type Box = { x: number; y: number; w: number; h: number };

// 그림이 크롭된 채 갖는 가로세로 비율(폭/높이).
export const imageRatio = (l: ImageLayer) =>
  (l.crop.w * l.nw) / (l.crop.h * l.nh);

// 장 하나의 배치. 글·코드 높이는 그려 본 값(sizes)을 받는다. 그림은 남은 높이에 맞춰 모두 같은 비율로 줄어든다.
// overflow 는 글이 너무 길어 아래 여백을 넘친 px(0 이면 정상).
export function layoutSlide(
  slide: Slide,
  sizes: Record<string, { w: number; h: number }>,
): { boxes: Record<string, Box>; overflow: number } {
  const space = H - MARGIN.top - MARGIN.bottom;
  const ls = slide.layers;
  const fixed = ls.reduce(
    (s, l) => s + (l.type === "image" ? 0 : (sizes[l.id]?.h ?? 0)),
    0,
  );
  const natural = (l: ImageLayer) => {
    const w = IMAGE_W[l.size];
    return { w, h: w / imageRatio(l) };
  };
  const imgH = ls.reduce(
    (s, l) => s + (l.type === "image" ? natural(l).h : 0),
    0,
  );
  const room = space - fixed - GAP * Math.max(0, ls.length - 1);
  const k = imgH > 0 ? clamp(room / imgH, 0, 1) : 1;
  const sized = ls.map((l) => {
    if (l.type !== "image")
      return { l, w: sizes[l.id]?.w ?? 0, h: sizes[l.id]?.h ?? 0 };
    const n = natural(l);
    return { l, w: n.w * k, h: n.h * k };
  });
  const total =
    sized.reduce((s, it) => s + it.h, 0) + GAP * Math.max(0, ls.length - 1);
  const y0 = slide.valign === "center" ? centerTop(sized, total) : MARGIN.top;
  let y = y0;
  const boxes: Record<string, Box> = {};
  for (const it of sized) {
    // 꽉 채운 그림도 줄어들면 꽉 차지 않으니 다른 요소처럼 왼쪽 여백에 붙인다.
    const x =
      it.l.type === "image" && it.l.size === "full" && k === 1 ? 0 : MARGIN.x;
    boxes[it.l.id] = { x, y, w: it.w, h: it.h };
    y += it.h + GAP;
  }
  return { boxes, overflow: Math.max(0, total - space) };
}

// 세로 가운데: 상자 전체가 아니라 눈에 보이는 무게의 중심을 맞춘다. 그림·코드는 면적 그대로,
// 글은 획이 가늘어 면적의 TEXT_WEIGHT 만큼으로 센다. 큰 그림이 하나 있으면 그 그림이 가운데에 오고 글은 위아래에 매달린다.
// 맞추는 자리는 정가운데보다 OPTICAL_LIFT 위(광학적 중심). 위아래 여백은 넘지 않는다.
const TEXT_WEIGHT = 0.3;
const OPTICAL_LIFT = Math.round(H * 0.04);

function centerTop(
  sized: { l: Layer; w: number; h: number }[],
  total: number,
): number {
  let y = 0;
  let sum = 0;
  let moment = 0;
  for (const it of sized) {
    const wt = it.w * it.h * (it.l.type === "text" ? TEXT_WEIGHT : 1);
    sum += wt;
    moment += wt * (y + it.h / 2);
    y += it.h + GAP;
  }
  const c = sum > 0 ? moment / sum : total / 2;
  const lo = MARGIN.top;
  const hi = H - MARGIN.bottom - total;
  if (hi <= lo) return lo;
  return clamp(H / 2 - OPTICAL_LIFT - c, lo, hi);
}

// ---- 정규화 ----

// 사람(나 또는 Claude)이 손으로 쓴 JSON 을 받아 빠진 필드를 채운다. id·기본값 등.
// 좌표로 배치하던 옛 덱(version 1, Keynote 가져오기)은 위에서부터의 순서로 바꾼다(migrateSlide).
// biome-ignore lint/suspicious/noExplicitAny: 손으로 쓴 JSON 은 모양을 믿을 수 없다
export function normalizeDeck(raw: any): Deck {
  const slides: Slide[] = Array.isArray(raw?.slides)
    ? raw.slides.map((s: unknown) => normalizeSlide(migrateSlide(s)))
    : [];
  return {
    version: 2,
    title: typeof raw?.title === "string" ? raw.title : "제목 없음",
    // 워터마크는 계정 설정(carousel.profiles)에서 온다. 덱에는 저장하지 않는다.
    watermark: typeof raw?.watermark === "string" ? raw.watermark : "",
    caption: typeof raw?.caption === "string" ? raw.caption : "",
    slides: slides.length
      ? slides
      : [{ id: uid(), memo: "", valign: "top", layers: [] }],
  };
}

// biome-ignore lint/suspicious/noExplicitAny: 위와 같다
function normalizeSlide(raw: any): Slide {
  return {
    id: typeof raw?.id === "string" ? raw.id : uid(),
    memo: typeof raw?.memo === "string" ? raw.memo : "",
    valign: raw?.valign === "center" ? "center" : "top",
    layers: Array.isArray(raw?.layers)
      ? raw.layers.map(normalizeLayer).filter(Boolean)
      : [],
  };
}

// biome-ignore lint/suspicious/noExplicitAny: 위와 같다
function normalizeLayer(raw: any): Layer | null {
  const id = typeof raw?.id === "string" ? raw.id : uid();
  if (raw?.type === "text") {
    return {
      id,
      type: "text",
      text: typeof raw.text === "string" ? raw.text : "",
      style: raw.style === "caption" ? "caption" : "body",
      color: raw.color === "red" ? "red" : "black",
    };
  }
  if (raw?.type === "code" && typeof raw.code === "string") {
    const props =
      raw.props && typeof raw.props === "object" && !Array.isArray(raw.props)
        ? raw.props
        : {};
    return { id, type: "code", code: raw.code, props };
  }
  if (raw?.type === "image" && typeof raw.src === "string") {
    const c = raw.crop ?? {};
    return {
      id,
      type: "image",
      src: raw.src,
      nw: num(raw.nw, 1000),
      nh: num(raw.nh, 1000),
      size:
        raw.size === "small" || raw.size === "full"
          ? raw.size
          : raw.full === true
            ? "full"
            : "normal",
      crop: {
        x: clamp01(num(c.x, 0)),
        y: clamp01(num(c.y, 0)),
        w: clamp01(num(c.w, 1)) || 1,
        h: clamp01(num(c.h, 1)) || 1,
      },
    };
  }
  return null;
}

// 옛 덱의 장 하나를 새 규칙으로: 위쪽 좌표 순으로 쌓고, 캔버스 밖으로 나간 그림은 보이던 부분만 크롭으로 남긴다.
// 내용이 위에서 꽤 내려와 시작했으면 세로 가운데로 본다.
// 레이어에 y 좌표가 있는 장만 옛 형식으로 본다.
// biome-ignore lint/suspicious/noExplicitAny: 위와 같다
function migrateSlide(raw: any) {
  // biome-ignore lint/suspicious/noExplicitAny: 위와 같다
  const layers: any[] = Array.isArray(raw?.layers) ? raw.layers : [];
  if (!layers.some((l) => typeof l?.y === "number")) return raw;
  const top = (l: { y?: unknown }) => num(l?.y, 0);
  const out = layers
    .toSorted((a, b) => top(a) - top(b))
    .map((l) => {
      if (l?.type !== "image") return l;
      const { x = 0, y = 0, w = 0, h = 0 } = l;
      const c = { x: 0, y: 0, w: 1, h: 1, ...l.crop };
      const x0 = Math.max(x, 0);
      const y0 = Math.max(y, 0);
      const x1 = Math.min(x + w, W);
      const y1 = Math.min(y + h, H);
      const crop =
        w > 0 && h > 0 && x1 > x0 && y1 > y0
          ? {
              x: c.x + ((x0 - x) / w) * c.w,
              y: c.y + ((y0 - y) / h) * c.h,
              w: ((x1 - x0) / w) * c.w,
              h: ((y1 - y0) / h) * c.h,
            }
          : c;
      // 좌우를 다 덮던 건 꽉 채움, 가로세로 다 작던 건(아이콘 등) 작게.
      const size =
        x <= 1 && x + w >= W - 1
          ? "full"
          : w < 600 && h < 600
            ? "small"
            : "normal";
      return { ...l, crop, size };
    });
  const first = layers.length ? Math.min(...layers.map(top)) : 0;
  return { ...raw, layers: out, valign: first > 200 ? "center" : "top" };
}

const clamp01 = (v: number) => Math.round(clamp(v, 0, 1) * 1e5) / 1e5;

export function serializeDeck(d: Deck): string {
  return `${JSON.stringify(d, null, 2)}\n`;
}

// ---- 인라인 마크업: **굵게** ==빨강== __밑줄__ ||블러|| ----

export type Run = {
  text: string;
  bold: boolean;
  red: boolean;
  underline: boolean;
  blur: boolean;
};

const MARKS = {
  "**": "bold",
  "==": "red",
  __: "underline",
  "||": "blur",
} as const;

export function parseMarkup(src: string): Run[] {
  const runs: Run[] = [];
  const st = { bold: false, red: false, underline: false, blur: false };
  let buf = "";
  const flush = () => {
    if (buf) runs.push({ text: buf, ...st });
    buf = "";
  };
  for (let i = 0; i < src.length; i++) {
    const two = src.slice(i, i + 2) as keyof typeof MARKS;
    if (two in MARKS) {
      flush();
      const k = MARKS[two];
      st[k] = !st[k];
      i++;
      continue;
    }
    buf += src[i];
  }
  flush();
  return runs;
}

export function runsToMarkup(runs: Run[]): string {
  let out = "";
  const st = { bold: false, red: false, underline: false, blur: false };
  const order: [keyof typeof st, string][] = [
    ["blur", "||"],
    ["red", "=="],
    ["bold", "**"],
    ["underline", "__"],
  ];
  for (const r of runs) {
    if (!r.text) continue;
    // 줄바꿈을 마크 안쪽에 두지 않도록 줄 단위로 끊는다.
    const parts = r.text.split("\n");
    parts.forEach((p, i) => {
      if (i > 0) {
        for (const [k, m] of order.toReversed())
          if (st[k]) {
            out += m;
            st[k] = false;
          }
        out += "\n";
      }
      if (!p) return;
      for (const [k, m] of order.toReversed())
        if (st[k] && !r[k]) {
          out += m;
          st[k] = false;
        }
      for (const [k, m] of order)
        if (!st[k] && r[k]) {
          out += m;
          st[k] = true;
        }
      out += p;
    });
  }
  for (const [k, m] of order.toReversed()) if (st[k]) out += m;
  return out;
}

export function plainText(src: string): string {
  return parseMarkup(src)
    .map((r) => r.text)
    .join("");
}
