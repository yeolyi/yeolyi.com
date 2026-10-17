// 오른쪽 속성 패널.
import Button from "@yeolyi/ui/Button";
import IconButton from "@yeolyi/ui/IconButton";
import RadioGroup from "@yeolyi/ui/RadioGroup";
import Textarea from "@yeolyi/ui/Textarea";
import { clsx } from "clsx";
import { ChevronDown, ChevronUp, Crop, EyeOff, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import {
  type Deck,
  type ImageLayer,
  type Layer,
  plainText,
  type TextLayer,
  type VAlign,
} from "../model";
import { ic } from "../ui";
import { execColor, execMark, stripRed, toggleWholeBlur } from "./richtext";
import { type Commit, mapSlide, patchLayer } from "./store";

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

// 이 장의 모든 요소. 목록 순서가 장에 쌓이는 순서(위→아래)이고, 행마다 위·아래 버튼으로 바꾼다.
function LayerList({ deck, si, layer, commit, setSel, onDelete }: Props) {
  const slide = deck.slides[si];
  const shown = slide.layers;
  const move = (i: number, dir: -1 | 1) => {
    const next = [...shown];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    commit((d) => mapSlide(d, si, () => next));
  };
  const setVAlign = (valign: VAlign) =>
    commit((d) => ({
      ...d,
      slides: d.slides.map((s, i) => (i === si ? { ...s, valign } : s)),
    }));

  return (
    <section>
      <div className="flex items-center gap-2">
        <h3 className="flex-1">
          레이어{" "}
          <span className="text-muted-foreground font-normal">
            위에서 아래로
          </span>
        </h3>
        <IconButton
          title="삭제 ⌫"
          aria-label="레이어 삭제"
          disabled={!layer}
          onClick={() => layer && onDelete(layer.id)}
        >
          <Trash2 {...ic} />
        </IconButton>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">세로 위치</span>
        <RadioGroup
          aria-label="세로 위치"
          value={slide.valign}
          options={[
            { value: "top", label: "위" },
            { value: "center", label: "가운데" },
          ]}
          onValueChange={(v) => setVAlign(v as VAlign)}
        />
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
                title="위로 ↑"
                aria-label="위로"
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                <ChevronUp {...ic} />
              </IconButton>
              <IconButton
                title="아래로 ↓"
                aria-label="아래로"
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
        <RadioGroup
          aria-label="폭"
          value={l.full ? "full" : "content"}
          options={[
            { value: "content", label: "본문 폭" },
            { value: "full", label: "꽉 채움" },
          ]}
          onValueChange={(v) => set({ full: v === "full" })}
        />
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
          <Button onClick={() => set({ crop: { x: 0, y: 0, w: 1, h: 1 } })}>
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
