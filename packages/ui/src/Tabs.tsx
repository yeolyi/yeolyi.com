import { Tabs as Base } from "@base-ui/react/tabs";
import { clsx } from "clsx";
import type { ReactNode } from "react";

// 탭 — 한 화면의 내용을 몇 덩어리로 나눠 한 번에 하나만 보인다. 고른 탭은 굵은 글씨와 그 아래 2px 잉크 선, 나머지는 보조 색.
// 탭 줄 전체 아래에 1px 선. 키보드(←→·Home/End)와 화면 읽기 프로그램(tablist·tab·tabpanel)은 Base UI Tabs 가 맡는다.
// 세그먼트(RadioGroup)는 같은 내용의 보기 방식·값을 고를 때, 탭은 서로 다른 내용 덩어리를 넘길 때 쓴다.
// 고른 탭을 주소 쿼리에 두려면 value·onValueChange 로 쓴다(새로고침·공유해도 그대로).
export type TabItem = { value: string; label: ReactNode; content: ReactNode };

export default function Tabs({
  items,
  value,
  defaultValue,
  onValueChange,
  "aria-label": ariaLabel,
  className,
}: {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  "aria-label"?: string;
  className?: string;
}) {
  return (
    <Base.Root
      value={value}
      defaultValue={
        value === undefined ? (defaultValue ?? items[0]?.value) : undefined
      }
      onValueChange={(v) => onValueChange?.(String(v))}
      className={className}
    >
      <Base.List
        activateOnFocus
        aria-label={ariaLabel}
        className="flex flex-wrap gap-x-6 border-b"
      >
        {items.map((it) => (
          <Base.Tab
            key={it.value}
            value={it.value}
            className={clsx(
              "min-h-control text-muted-foreground hover:text-foreground focus-fill -mb-px cursor-pointer border-b-2 border-transparent",
              "aria-selected:border-foreground aria-selected:text-foreground aria-selected:font-bold",
              "forced-colors:aria-selected:border-[CanvasText]",
            )}
          >
            {/* 굵어져도 폭이 바뀌지 않게, 굵은 글씨 폭을 안 보이게 깔아 둔다. */}
            <span className="grid">
              <span
                aria-hidden
                className="invisible col-start-1 row-start-1 font-bold"
              >
                {it.label}
              </span>
              <span className="col-start-1 row-start-1">{it.label}</span>
            </span>
          </Base.Tab>
        ))}
      </Base.List>
      {items.map((it) => (
        <Base.Panel
          key={it.value}
          value={it.value}
          className="pt-[1rlh] focus-visible:outline-none"
        >
          {it.content}
        </Base.Panel>
      ))}
    </Base.Root>
  );
}
