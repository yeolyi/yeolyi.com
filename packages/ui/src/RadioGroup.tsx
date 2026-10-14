import { clsx } from "clsx";
import { type MouseEvent, useId, useState } from "react";

type Option = string | { value: string; label: string };

// 라디오 그룹 — 여럿 중 하나. 넷을 넘으면 Select.
// - 가로(기본): 붙은 칸(세그먼트)에서 고른 칸만 반전. 짧은 라벨 몇 개를 한 줄에.
// - 세로(orientation="vertical"): 줄마다 동그라미 + 라벨(라디오 목록). 라벨이 길거나 질문의 답을 고를 때.
//   동그라미는 모서리를 둥글리지 않는 규칙의 예외다. 체크박스(채운 네모)와 구별되고, 라디오는 누구나 동그라미로 안다.
// - options: 문자열 배열이거나 {value,label}(라벨이 값과 다를 때).
// - controlled(value+onValueChange) / uncontrolled(defaultValue) 둘 다.
// - 네이티브 radio 를 쓴다: 탭 스톱 하나, 방향키로 이동·선택은 브라우저가 한다.
// - 고대비(forced-colors)에선 브라우저가 바탕색을 덮으므로 시스템 색(Highlight·CanvasText)으로 직접 칠한다.
export default function RadioGroup({
  options,
  defaultValue,
  value,
  onValueChange,
  orientation = "horizontal",
  "aria-label": ariaLabel,
}: {
  options: Option[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  orientation?: "horizontal" | "vertical";
  "aria-label"?: string;
}) {
  const name = useId();
  const norm = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? norm[0]?.value);
  const current = controlled ? value : internal;
  const vertical = orientation === "vertical";
  const pick = (v: string) => {
    if (!controlled) setInternal(v);
    onValueChange?.(v);
  };
  // 연달아 누를 때 라벨 글자가 선택되지 않게. Button·Checkbox 와 같다.
  const noSelect = (e: MouseEvent) => {
    if (e.detail > 1) e.preventDefault();
  };

  if (vertical)
    return (
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        aria-orientation="vertical"
        className="flex flex-col items-start"
      >
        {norm.map((o) => (
          <label
            key={o.value}
            onMouseDown={noSelect}
            className="min-h-control inline-flex cursor-pointer items-center gap-2.5"
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={o.value === current}
              onChange={() => pick(o.value)}
              className="border-foreground bg-background checked:bg-foreground focus-border size-[1.25rem] shrink-0 cursor-[inherit] appearance-none rounded-full border-2 checked:shadow-[inset_0_0_0_3px_var(--color-background)] focus-visible:checked:shadow-[inset_0_0_0_3px_var(--color-background)] forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:forced-color-adjust-none forced-colors:checked:bg-[CanvasText] forced-colors:checked:shadow-[inset_0_0_0_3px_Canvas] forced-colors:focus-visible:border-[Highlight]"
            />
            {o.label}
          </label>
        ))}
      </div>
    );

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      className="border-foreground has-focus-visible:border-accent inline-flex max-w-full flex-wrap border-2 has-focus-visible:shadow-[inset_0_0_0_1px_var(--color-accent)]"
    >
      {norm.map((o, i) => (
        <label
          key={o.value}
          onMouseDown={noSelect}
          className={clsx(
            "border-foreground cursor-pointer",
            i > 0 && "border-l-2",
          )}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={o.value === current}
            onChange={() => pick(o.value)}
            className="peer sr-only"
          />
          <span className="hover:bg-muted press-down peer-checked:bg-foreground peer-checked:text-background peer-checked:hover:bg-foreground flex h-[calc(var(--spacing-control)-4px)] items-center px-3.5 whitespace-nowrap transition-colors forced-colors:peer-checked:bg-[Highlight] forced-colors:peer-checked:text-[HighlightText] forced-colors:peer-checked:forced-color-adjust-none">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}
