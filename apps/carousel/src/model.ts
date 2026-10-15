// 덱 데이터 모델. 브라우저와 서버(vite 플러그인·export 스크립트)가 함께 쓰므로 DOM·React 를 import 하지 않는다.

export const W = 1080;
export const H = 1350;
export const RED = "#EE220C";
export const BLACK = "#000000";

export const TEXT_STYLES = {
  body: { size: 40, lineHeight: 1.44, color: BLACK },
  caption: { size: 30, lineHeight: 1.44, color: "#8E8E8E" },
} as const;

// #949494 는 흰 배경 대비 3.03:1. 30px 는 WCAG 의 큰 글자라 AA 기준 3:1 을 넘는다(#959595 부터는 미달).
// 왼쪽·오른쪽 배치와 스냅에서 캔버스 가장자리와 둘 여백(텍스트·이미지 공통).
export const EDGE_MARGIN = 80;

export const WATERMARK = {
  size: 30,
  weight: 400,
  color: "#949494",
  bottom: 24,
};

export type TextStyle = keyof typeof TEXT_STYLES;
export type Align = "left" | "center" | "right";
export type Crop = { x: number; y: number; w: number; h: number };

export type TextLayer = {
  id: string;
  type: "text";
  x: number;
  y: number;
  // 너비는 없다. 내용에 맞춰지고, 캔버스 오른쪽 끝에서 줄이 바뀐다.
  text: string;
  style: TextStyle;
  color: "black" | "red";
  align: Align;
};

export type ImageLayer = {
  id: string;
  type: "image";
  src: string;
  nw: number;
  nh: number;
  x: number;
  y: number;
  w: number;
  h: number;
  crop: Crop;
};

// 덱 주인이 쓴 JS 모듈. `export default (el, props, { asset }) => 정리함수?` 로 el 안을 그린다(비동기여도 된다).
// props 는 같은 코드를 장마다 다른 값으로 쓰게 하는 값 묶음, asset("assets/x.png") 는 덱 이미지의 주소를 돌려준다.
// 덱은 주인만 열 수 있어 코드도 주인 브라우저에서만 돈다. 편집 UI 는 없고 Claude 가 JSON 으로 쓴다. 크기는 그려진 내용에 맞춰진다.
export type CodeLayer = {
  id: string;
  type: "code";
  x: number;
  y: number;
  code: string;
  props: Record<string, unknown>;
};

export type Layer = TextLayer | ImageLayer | CodeLayer;

export type Slide = {
  id: string;
  memo: string;
  layers: Layer[];
};

export type Deck = {
  version: 1;
  title: string;
  watermark: string;
  caption: string; // 인스타 게시물 본문(해시태그 포함)
  slides: Slide[];
};

export const uid = () => Math.random().toString(36).slice(2, 8);

const num = (v: unknown, d: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : d;
const round = (v: number) => Math.round(v * 100) / 100;

// 사람(나 또는 Claude)이 손으로 쓴 JSON 을 받아 빠진 필드를 채운다. id·기본값·이미지 높이 등.
export function normalizeDeck(raw: any): Deck {
  const slides: Slide[] = Array.isArray(raw?.slides)
    ? raw.slides.map(normalizeSlide)
    : [];
  return {
    version: 1,
    title: typeof raw?.title === "string" ? raw.title : "제목 없음",
    // 워터마크는 계정 설정(carousel.profiles)에서 온다. 덱에는 저장하지 않는다.
    watermark: typeof raw?.watermark === "string" ? raw.watermark : "",
    caption: typeof raw?.caption === "string" ? raw.caption : "",
    slides: slides.length ? slides : [{ id: uid(), memo: "", layers: [] }],
  };
}

function normalizeSlide(raw: any): Slide {
  return {
    id: typeof raw?.id === "string" ? raw.id : uid(),
    memo: typeof raw?.memo === "string" ? raw.memo : "",
    layers: Array.isArray(raw?.layers)
      ? raw.layers.map(normalizeLayer).filter(Boolean)
      : [],
  };
}

function normalizeLayer(raw: any): Layer | null {
  const id = typeof raw?.id === "string" ? raw.id : uid();
  if (raw?.type === "text") {
    return {
      id,
      type: "text",
      x: round(num(raw.x, 90)),
      y: round(num(raw.y, 150)),
      text: typeof raw.text === "string" ? raw.text : "",
      style: raw.style === "caption" ? "caption" : "body",
      color: raw.color === "red" ? "red" : "black",
      align:
        raw.align === "center" || raw.align === "right" ? raw.align : "left",
    };
  }
  if (raw?.type === "code" && typeof raw.code === "string") {
    const props =
      raw.props && typeof raw.props === "object" && !Array.isArray(raw.props)
        ? raw.props
        : {};
    return {
      id,
      type: "code",
      x: round(num(raw.x, 80)),
      y: round(num(raw.y, 150)),
      code: raw.code,
      props,
    };
  }
  if (raw?.type === "image" && typeof raw.src === "string") {
    const nw = num(raw.nw, 1000);
    const nh = num(raw.nh, 1000);
    const c = raw.crop ?? {};
    const crop = {
      x: clamp01(num(c.x, 0)),
      y: clamp01(num(c.y, 0)),
      w: clamp01(num(c.w, 1)) || 1,
      h: clamp01(num(c.h, 1)) || 1,
    };
    const w = num(raw.w, Math.min(nw, W * 0.8));
    // 높이를 안 적었으면 크롭 비율대로 계산한다.
    const h = num(raw.h, (w * (crop.h * nh)) / (crop.w * nw));
    return {
      id,
      type: "image",
      src: raw.src,
      nw,
      nh,
      x: round(num(raw.x, (W - w) / 2)),
      y: round(num(raw.y, (H - h) / 2)),
      w: round(w),
      h: round(h),
      crop,
    };
  }
  return null;
}

const clamp01 = (v: number) =>
  Math.round(Math.min(1, Math.max(0, v)) * 1e5) / 1e5;

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
        for (const [k, m] of [...order].reverse())
          if (st[k]) {
            out += m;
            st[k] = false;
          }
        out += "\n";
      }
      if (!p) return;
      for (const [k, m] of [...order].reverse())
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
  for (const [k, m] of [...order].reverse()) if (st[k]) out += m;
  return out;
}

export function plainText(src: string): string {
  return parseMarkup(src)
    .map((r) => r.text)
    .join("");
}
