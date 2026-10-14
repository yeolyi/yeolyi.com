import { clsx } from "clsx";
import { useRef } from "react";
import { usePointer } from "./pointer";

// 디자인 시스템(design.yeolyi.com)의 색 여섯을 세로 띠로 나란히 둔 견본. 값은 토큰 그대로라 두 모드에서 각자의 색으로 보인다.
// 포인터가 올라간 띠 하나가 즉시 넓어지고 이름이 보인다. DS 의 호버처럼 전환 없이 딱 바뀐다(브루탈리즘).
// 지금 화면에서 포인터 아래의 띠를 고른다. 옆 띠로 넘어가는 순간 그 띠가 넓어지며 경계가 포인터 반대쪽으로 밀려나 깜빡이지 않는다.
const SWATCHES = [
  { name: "바탕", bg: "bg-background", fg: "text-foreground" },
  { name: "옅은 바탕", bg: "bg-muted", fg: "text-foreground" },
  { name: "가는 선", bg: "bg-border", fg: "text-foreground" },
  { name: "보조", bg: "bg-muted-foreground", fg: "text-background" },
  { name: "기본", bg: "bg-foreground", fg: "text-background" },
  { name: "주황", bg: "bg-accent", fg: "text-on-accent" },
];
const GROW = 3; // 고른 띠의 폭(나머지는 1)

export default function DesignBanner() {
  const { pointer, handlers } = usePointer();
  const box = useRef<HTMLDivElement>(null);
  const strips = box.current ? [...box.current.children] : [];
  const top = pointer
    ? strips.findIndex((el) => {
        const r = el.getBoundingClientRect();
        return pointer.clientX >= r.left && pointer.clientX < r.right;
      })
    : -1;
  return (
    <div ref={box} className="absolute inset-0 flex" {...handlers}>
      {SWATCHES.map((s, i) => (
        <div
          key={s.name}
          className={clsx(s.bg, s.fg, "flex items-end overflow-hidden p-3")}
          style={{ flexGrow: i === top ? GROW : 1, flexBasis: 0 }}
        >
          <span
            className={clsx(
              "font-mono text-base whitespace-nowrap",
              i === top ? "visible" : "invisible",
            )}
          >
            {s.name}
          </span>
        </div>
      ))}
    </div>
  );
}
