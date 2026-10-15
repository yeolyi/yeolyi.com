// 오른쪽 속성 패널.
import Button from "@yeolyi/ui/Button";
import IconButton from "@yeolyi/ui/IconButton";
import RadioGroup from "@yeolyi/ui/RadioGroup";
import Textarea from "@yeolyi/ui/Textarea";
import { clsx } from "clsx";
import { sumBy } from "es-toolkit";
import {
  AlignCenter,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignLeft,
  AlignRight,
  AlignVerticalSpaceAround,
  ChevronDown,
  ChevronUp,
  Crop,
  EyeOff,
  MoveHorizontal,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  type Align,
  type Deck,
  EDGE_MARGIN,
  H,
  type ImageLayer,
  type Layer,
  plainText,
  TEXT_STYLES,
  type TextLayer,
  W,
} from "../model";
import { ic } from "../ui";
import { execColor, execMark, stripRed, toggleWholeBlur } from "./richtext";
import { type Commit, mapSlide, patchLayer } from "./store";

export type ZOp = "front" | "forward" | "backward" | "back";

type Props = {
  deck: Deck;
  si: number;
  layer: Layer | null;
  editing: boolean;
  commit: Commit;
  setSel: (id: string | null) => void;
  setCropping: (id: string | null) => void;
  cropping: string | null;
  onDelete: (id: string) => void;
};

// 텍스트 상자는 너비가 없어서(내용에 맞춤) 화면에 그려진 너비를 읽는다.
const renderedWidth = (id: string) =>
  (document.querySelector(`.world [data-id="${id}"]`) as HTMLElement | null)
    ?.offsetWidth ?? 0;
const renderedHeight = (id: string) =>
  (document.querySelector(`.world [data-id="${id}"]`) as HTMLElement | null)
    ?.offsetHeight ?? 0;

// 세로 정리: 요소 사이를 본문 빈 줄 하나만큼 띄워 쌓고, 전체를 감싸는 사각형을 캔버스 세로 중앙에 둔다.
// 세로 범위가 겹치는 요소(글을 얹은 사진, 나란히 놓은 두 장)는 한 덩어리로 같이 옮겨 모양을 지킨다.
// 화면을 덮는 이미지는 배경으로 보고 건드리지 않는다(넣으면 모든 게 한 덩어리가 된다).
const STACK_GAP = TEXT_STYLES.body.size * TEXT_STYLES.body.lineHeight;
const round2 = (v: number) => Math.round(v * 100) / 100;

function stackVertically(layers: Layer[]): Layer[] {
  const isBackdrop = (l: Layer) =>
    l.type === "image" &&
    l.x <= 0 &&
    l.y <= 0 &&
    l.x + l.w >= W &&
    l.y + l.h >= H;
  const height = (l: Layer) =>
    l.type === "image" ? l.h : renderedHeight(l.id);
  const items = layers
    .filter((l) => !isBackdrop(l))
    .map((l) => ({ l, top: l.y, bottom: l.y + height(l) }));
  items.sort((a, b) => a.top - b.top);

  const groups: { top: number; bottom: number; ids: string[] }[] = [];
  for (const it of items) {
    const g = groups.at(-1);
    if (g && it.top < g.bottom) {
      g.bottom = Math.max(g.bottom, it.bottom);
      g.ids.push(it.l.id);
    } else groups.push({ top: it.top, bottom: it.bottom, ids: [it.l.id] });
  }
  if (!groups.length) return layers;

  const total =
    sumBy(groups, (g) => g.bottom - g.top) + STACK_GAP * (groups.length - 1);
  const shift = new Map<string, number>();
  let y = (H - total) / 2;
  for (const g of groups) {
    for (const id of g.ids) shift.set(id, y - g.top);
    y += g.bottom - g.top + STACK_GAP;
  }
  return layers.map((l) =>
    shift.has(l.id) ? { ...l, y: round2(l.y + (shift.get(l.id) ?? 0)) } : l,
  );
}

export function Panel(p: Props & { children?: ReactNode }) {
  const { layer, children } = p;
  return (
    <aside className="panel">
      <LayerList {...p} />
      {layer?.type === "text" && <TextProps {...p} layer={layer} />}
      {layer?.type === "image" && <ImageProps {...p} layer={layer} />}
      {children}
    </aside>
  );
}

// 이 장의 모든 요소. 위가 앞이고, 행마다 위·아래 버튼으로 겹침 순서를 바꾼다.
function LayerList({ deck, si, layer, commit, setSel, onDelete }: Props) {
  const shown = deck.slides[si].layers.toReversed();
  // 화면 순서(앞→뒤)에서 한 칸 옮긴 뒤 다시 뒤집어 저장한다.
  const move = (i: number, dir: -1 | 1) => {
    const next = [...shown];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    commit((d) => mapSlide(d, si, () => next.reverse()));
  };

  return (
    <section>
      <div className="flex items-center">
        <h3 className="flex-1">
          레이어{" "}
          <span className="text-muted-foreground font-normal">위가 앞</span>
        </h3>
        <IconButton
          title="세로 정리: 빈 줄 하나 간격으로 쌓고 세로 가운데에 놓습니다(겹친 요소는 같이 움직입니다)"
          aria-label="세로 정리"
          disabled={!shown.length}
          onClick={() => commit((d) => mapSlide(d, si, stackVertically))}
        >
          <AlignVerticalSpaceAround {...ic} />
        </IconButton>
        <IconButton
          title="삭제 ⌫"
          aria-label="레이어 삭제"
          disabled={!layer}
          onClick={() => layer && onDelete(layer.id)}
        >
          <Trash2 {...ic} />
        </IconButton>
      </div>
      <ol className="layers">
        {shown.map((l, i) => {
          const on = l.id === layer?.id;
          return (
            <li key={l.id}>
              {/* 고른 행은 반전, 나머지는 올리면 옅은 바탕(세그먼트와 같다) */}
              <button
                type="button"
                aria-current={on || undefined}
                className={clsx(
                  "focus-fill press-down min-h-control flex min-w-0 flex-1 items-center gap-3 px-2 text-left transition-colors",
                  on ? "mark" : "hover:bg-muted",
                )}
                onClick={() => setSel(l.id)}
              >
                <span
                  className={clsx(
                    "w-9 flex-none font-mono text-base",
                    !on && "text-muted-foreground",
                  )}
                >
                  {l.type === "image"
                    ? "IMG"
                    : l.type === "code"
                      ? "JS"
                      : l.style === "caption"
                        ? "CAP"
                        : "TXT"}
                </span>
                <span className="truncate">
                  {l.type === "image"
                    ? l.src.replace(/^assets\//, "")
                    : l.type === "code"
                      ? l.code.replace(/\s+/g, " ").slice(0, 60)
                      : plainText(l.text).replace(/\n/g, " ")}
                </span>
              </button>
              <IconButton
                title="앞으로 ⌘]"
                aria-label="앞으로"
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                <ChevronUp {...ic} />
              </IconButton>
              <IconButton
                title="뒤로 ⌘["
                aria-label="뒤로"
                disabled={i === shown.length - 1}
                onClick={() => move(i, 1)}
              >
                <ChevronDown {...ic} />
              </IconButton>
            </li>
          );
        })}
        {!shown.length && (
          <li className="text-muted-foreground px-2 py-2">비어 있습니다.</li>
        )}
      </ol>
    </section>
  );
}

function TextProps({
  si,
  layer: l,
  editing,
  commit,
}: Props & { layer: TextLayer }) {
  const set = (patch: Partial<TextLayer>, key?: string) =>
    commit((d) => patchLayer(d, si, l.id, patch), key);
  // 편집 중이면 선택한 글자에만, 아니면 상자 전체에 적용한다.
  const color = (c: "black" | "red") =>
    editing ? execColor(c) : set({ color: c, text: stripRed(l.text) });
  // 상자를 캔버스 왼쪽·가운데·오른쪽에 놓고, 여러 줄일 때 줄 정렬도 같은 쪽으로 맞춘다.
  const place = (where: Align) => {
    const w = renderedWidth(l.id);
    const x = {
      left: EDGE_MARGIN,
      center: (W - w) / 2,
      right: W - EDGE_MARGIN - w,
    }[where];
    set({ x: Math.round(x), align: where });
  };
  return (
    <>
      <section>
        <h3>{l.style === "caption" ? "캡션" : "텍스트"}</h3>
        <div className="flex flex-wrap gap-2">
          <RadioGroup
            aria-label="글자 크기"
            value={l.style}
            options={[
              { value: "body", label: "본문" },
              { value: "caption", label: "캡션" },
            ]}
            onValueChange={(style) =>
              set({ style: style as TextLayer["style"] })
            }
          />
          <Seg
            label="색"
            value={editing ? null : l.color}
            options={[
              ["black", "검정"],
              ["red", "빨강"],
            ]}
            title="편집 중엔 선택한 글자만, 아니면 상자 전체에 칠합니다. 빨강은 ⌘E"
            onChange={color}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <IconButton
            aria-label="블러"
            title="블러. 편집 중엔 선택한 글자만, 아니면 상자 전체를 가립니다. ⌘⇧X"
            // 텍스트 편집 중 선택이 풀리지 않게
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              editing
                ? execMark("blur")
                : set({ text: toggleWholeBlur(l.text) })
            }
          >
            <EyeOff {...ic} />
          </IconButton>
          {(
            [
              ["left", "왼쪽", AlignLeft],
              ["center", "가운데", AlignCenter],
              ["right", "오른쪽", AlignRight],
            ] as const
          ).map(([where, label, Icon]) => (
            <IconButton
              key={where}
              aria-label={`${label}에 배치`}
              title={`${label}에 배치합니다(가장자리 여백 ${EDGE_MARGIN}px, 줄도 ${label} 정렬)`}
              onClick={() => place(where)}
            >
              <Icon {...ic} />
            </IconButton>
          ))}
        </div>
      </section>
      <section>
        <div className="field">
          <label htmlFor={`raw-${l.id}`} className="leading-[1.4]">
            원문
          </label>
          <span className="text-muted-foreground font-mono text-base leading-[1.4]">
            **굵게** ==빨강== __밑줄__ ||블러||
          </span>
          <Textarea
            id={`raw-${l.id}`}
            className="mt-1 font-mono text-base"
            value={l.text}
            rows={6}
            onChange={(e) => set({ text: e.target.value }, `text:${l.id}`)}
          />
        </div>
      </section>
    </>
  );
}

function ImageProps({
  si,
  layer: l,
  commit,
  cropping,
  setCropping,
}: Props & { layer: ImageLayer }) {
  const set = (patch: Partial<ImageLayer>) =>
    commit((d) => patchLayer(d, si, l.id, patch));
  return (
    <>
      <section>
        <h3>이미지</h3>
        <p className="text-muted-foreground font-mono text-base break-all">
          {l.src.replace(/^assets\//, "")}
        </p>
        <div className="flex flex-wrap gap-2">
          <IconButton
            aria-label="가로 가운데"
            title="가로 가운데"
            onClick={() => set({ x: (W - l.w) / 2 })}
          >
            <AlignCenterHorizontal {...ic} />
          </IconButton>
          <IconButton
            aria-label="세로 가운데"
            title="세로 가운데"
            onClick={() => set({ y: (H - l.h) / 2 })}
          >
            <AlignCenterVertical {...ic} />
          </IconButton>
          <IconButton
            aria-label="너비 채우기"
            title="너비 채우기"
            onClick={() => set({ x: 0, w: W, h: (W * l.h) / l.w })}
          >
            <MoveHorizontal {...ic} />
          </IconButton>
        </div>
      </section>
      <section>
        <h3>크롭</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setCropping(cropping === l.id ? null : l.id)}
            title="이미지를 더블클릭해도 됩니다. Enter·Esc 로 끝냅니다"
          >
            <Crop {...ic} />
            {cropping === l.id ? "크롭 끝내기" : "크롭 편집"}
          </Button>
          {/* 지금 너비를 유지한 채 원본 비율로 되돌린다. */}
          <Button
            onClick={() =>
              set({ crop: { x: 0, y: 0, w: 1, h: 1 }, h: l.w * (l.nh / l.nw) })
            }
          >
            크롭 없애기
          </Button>
        </div>
      </section>
    </>
  );
}

// 세그먼트 모양의 버튼 묶음. 고른 칸만 반전(디자인 시스템의 RadioGroup 과 같은 모양).
// 글자 편집 중 선택한 글자에 바로 칠하려면 누를 때 초점을 옮기지 않아야 해서 라디오 대신 버튼으로 둔다.
function Seg<T extends string>({
  label,
  value,
  options,
  onChange,
  title,
}: {
  label: string;
  value: T | null;
  options: [T, string][];
  onChange: (v: T) => void;
  title?: string;
}) {
  return (
    <fieldset
      aria-label={label}
      title={title}
      className="border-foreground inline-flex border-2"
    >
      {options.map(([v, text], i) => (
        <button
          key={v}
          type="button"
          aria-pressed={v === value}
          className={clsx(
            "focus-fill press-down flex h-[calc(var(--spacing-control)-4px)] items-center px-3.5 whitespace-nowrap transition-colors",
            i > 0 && "border-foreground border-l-2",
            v === value ? "mark" : "hover:bg-muted",
          )}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onChange(v)}
        >
          {text}
        </button>
      ))}
    </fieldset>
  );
}
