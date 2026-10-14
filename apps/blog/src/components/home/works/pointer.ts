import { type PointerEvent, useEffect, useState } from "react";

// 배너 안 포인터 위치. 마우스는 떠나면 null 로 돌아가고, 손가락(터치·펜)은 마지막 자리에 남는다
// (손을 떼면 바로 pointerleave 가 와서, 지우면 누른 결과를 볼 수 없다).
export interface Pointer {
  // 배너 왼쪽 위 기준
  x: number;
  y: number;
  w: number;
  h: number;
  clientX: number;
  clientY: number;
}

export function usePointer() {
  const [pointer, setPointer] = useState<Pointer | null>(null);
  const update = (e: PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPointer({
      x: e.clientX - r.left,
      y: e.clientY - r.top,
      w: r.width,
      h: r.height,
      clientX: e.clientX,
      clientY: e.clientY,
    });
  };
  const handlers = {
    onPointerMove: update,
    onPointerDown: update,
    onPointerLeave: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === "mouse") setPointer(null);
    },
  };
  return { pointer, handlers };
}

export function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduce;
}
