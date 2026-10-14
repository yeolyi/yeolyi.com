import { useEffect, useRef, useState } from "react";
import { usePointer, useReducedMotion } from "./pointer";

// chadcn/ui 의 마스코트(chad). 사진(294×339)이 작아 칸을 다 채우면 흐려서, 얼굴 띠(assets/chad-face.png)만
// 칸 높이에 맞춰 두고 바탕(assets/chad-bg.png)은 사진 양 끝 색을 줄마다 평균 낸 한 줄을 가로로 늘인다.
// 얼굴은 포인터를 따라 좌우로만 움직인다(프레임마다 목표로 조금씩). 얼굴 띠 양옆은 투명하게 녹여 어디 있어도 바탕에 섞인다.
const EASE = 0.15;

export default function ChadBanner({ bg, face }: { bg: string; face: string }) {
  const { pointer, handlers } = usePointer();
  const reduce = useReducedMotion();
  // 얼굴 가운데의 자리(칸 폭 대비 0~1). 포인터가 없으면 가운데.
  const goal = pointer ? pointer.x / pointer.w : 0.5;
  const [x, setX] = useState(goal);
  const goalRef = useRef(goal);
  goalRef.current = goal;

  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const step = () => {
      setX((cur) => {
        const next = cur + (goalRef.current - cur) * EASE;
        return Math.abs(next - cur) < 0.0005 ? cur : next;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  const shown = reduce ? 0.5 : x;
  return (
    <div className="absolute inset-0 overflow-hidden" {...handlers}>
      <img
        src={bg}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full"
      />
      <img
        src={face}
        alt=""
        draggable={false}
        className="absolute top-0 h-full max-w-none -translate-x-1/2"
        style={{ left: `${shown * 100}%` }}
      />
    </div>
  );
}
