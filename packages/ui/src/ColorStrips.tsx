import { clsx } from "clsx";
import { type PointerEvent, useRef, useState } from "react";

// 디자인 시스템의 색 여섯을 세로 띠로 나란히 둔 견본(블로그 홈·design 홈 배너). 값은 토큰 그대로라 두 모드에서 각자의 색으로 보인다.
// 포인터 아래의 띠 하나가 즉시 넓어지고 이름이 보인다. DS 의 호버처럼 전환 없이 딱 바뀐다.
// 띠는 포인터의 화면 x 로 고른다. 옆 띠로 넘어가는 순간 그 띠가 넓어지며 경계가 포인터 반대쪽으로 밀려나 깜빡이지 않는다.
// 마우스는 떠나면 돌아가고, 손가락(터치·펜)은 마지막 자리에 남는다(손을 떼면 바로 pointerleave 가 와서, 지우면 누른 결과를 볼 수 없다).
const SWATCHES = [
  { name: "바탕", bg: "bg-background", fg: "text-foreground" },
  { name: "옅은 바탕", bg: "bg-muted", fg: "text-foreground" },
  { name: "가는 선", bg: "bg-border", fg: "text-foreground" },
  { name: "보조", bg: "bg-muted-foreground", fg: "text-background" },
  { name: "기본", bg: "bg-foreground", fg: "text-background" },
  { name: "주황", bg: "bg-accent", fg: "text-on-accent" },
];
const GROW = 3; // 고른 띠의 폭(나머지는 1)

export default function ColorStrips() {
  const box = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(-1);
  const pick = (e: PointerEvent<HTMLDivElement>) => {
    const strips = box.current ? [...box.current.children] : [];
    setTop(
      strips.findIndex((el) => {
        const r = el.getBoundingClientRect();
        return e.clientX >= r.left && e.clientX < r.right;
      }),
    );
  };
  return (
    <div
      ref={box}
      className="absolute inset-0 flex"
      onPointerMove={pick}
      onPointerDown={pick}
      onPointerLeave={(e) => e.pointerType === "mouse" && setTop(-1)}
    >
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
