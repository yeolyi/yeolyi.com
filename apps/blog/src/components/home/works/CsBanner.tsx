import { useEffect, useRef, useState } from "react";
import { usePointer, useReducedMotion } from "./pointer";

interface Img {
  src: string;
  srcset: string;
}

const SIZES = "(max-width: 45rem) 100vw, 45rem";

// 경계는 포인터를 바로 따라가지 않고 매 프레임 남은 거리의 일부만큼 다가간다(들어올 때·움직일 때·
// 떠날 때 모두 같은 미끄러짐). 움직임 줄이기면 바로 맞춘다.
function useFollow(target: number, reduce: boolean) {
  const [value, setValue] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    if (reduce) {
      current.current = target;
      setValue(target);
      return;
    }
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      // 시간 상수 40ms 의 지수 감쇠(프레임률과 무관). 0.15초 안에 95% 따라붙는다(DS 움직임).
      const k = 1 - Math.exp(-dt / 40);
      current.current += (target - current.current) * k;
      if (Math.abs(target - current.current) < 0.05) current.current = target;
      setValue(current.current);
      if (current.current !== target) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, reduce]);
  return value;
}

// 몬드리안의 회색 나무 위로, 포인터 왼쪽만큼 사과나무가 드러난다. 떠나면 다시 회색 나무.
export default function CsBanner({ gray, apple }: { gray: Img; apple: Img }) {
  const { pointer, handlers } = usePointer();
  const reduce = useReducedMotion();
  const target = pointer ? (pointer.x / pointer.w) * 100 : 0;
  const pct = useFollow(target, reduce);

  return (
    <div {...handlers} className="absolute inset-0">
      <img
        src={gray.src}
        srcSet={gray.srcset}
        sizes={SIZES}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <img
        src={apple.src}
        srcSet={apple.srcset}
        sizes={SIZES}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          clipPath: `inset(0 ${100 - pct}% 0 0)`,
        }}
      />
      {pct > 0.5 && (
        <div
          className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-stone-50"
          style={{ left: `${pct}%` }}
        />
      )}
    </div>
  );
}
