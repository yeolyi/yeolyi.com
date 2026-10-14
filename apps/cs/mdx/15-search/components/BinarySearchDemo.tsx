import { CELL } from "@mdx/15-data-structure-and-algorithm/lib/cell";
import Button from "@yeolyi/ui/Button";
import clsx from "clsx";
import { useEffect, useState } from "react";

const ARR = [
  3, 5, 8, 12, 14, 17, 19, 23, 26, 28, 31, 35, 37, 40, 42, 46, 49, 51, 54, 58,
  61, 63, 66, 70, 73, 75, 78, 82, 85, 87, 90, 94, 96, 99, 103, 106, 108, 111,
  115, 118, 120, 123, 127, 130, 132, 135, 139, 141, 144, 148,
];
const TARGET = 123;

type State = {
  active: boolean;
  sub: number;
  checked: number[];
  currentIdx: number | null;
  currentVal: number | null;
  lo: number;
  hi: number;
  found: boolean;
};

const INIT: State = {
  active: false,
  sub: 0,
  checked: [],
  currentIdx: null,
  currentVal: null,
  lo: 0,
  hi: ARR.length - 1,
  found: false,
};

function advanceLinear(s: State): State {
  if (s.sub === 0) {
    const idx = s.checked.length;
    if (idx >= ARR.length) return s;
    return { ...s, sub: 1, currentIdx: idx, currentVal: ARR[idx] };
  }
  if (s.currentVal === TARGET)
    return {
      ...s,
      sub: 0,
      found: true,
      checked: [...s.checked, s.currentIdx!],
    };
  return {
    ...s,
    sub: 0,
    checked: [...s.checked, s.currentIdx!],
    currentIdx: null,
    currentVal: null,
  };
}

function advanceBinary(s: State): State {
  if (s.sub === 0) {
    if (s.lo > s.hi) return s;
    const mid = Math.floor((s.lo + s.hi) / 2);
    return { ...s, sub: 1, currentIdx: mid, currentVal: ARR[mid] };
  }

  if (s.sub === 1) {
    if (s.currentVal === TARGET)
      return {
        ...s,
        sub: 2,
        found: true,
        checked: [...s.checked, s.currentIdx!],
      };
    const newLo = s.currentVal! < TARGET ? s.currentIdx! + 1 : s.lo;
    const newHi = s.currentVal! > TARGET ? s.currentIdx! - 1 : s.hi;
    return {
      ...s,
      sub: 2,
      lo: newLo,
      hi: newHi,
      checked: [...s.checked, s.currentIdx!],
    };
  }

  return { ...s, sub: 0, currentIdx: null, currentVal: null };
}

export function LinearSearchDemo() {
  const [s, setS] = useState(INIT);
  const started = s.active || s.found;

  useEffect(() => {
    if (!s.active || s.found) return;
    const timer = setTimeout(() => setS(advanceLinear(s)), 100);
    return () => clearTimeout(timer);
  }, [s]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        찾는 값: <span className="font-mono">{TARGET}</span>
        {started && (
          <span className="text-muted-foreground">
            {" · "}
            확인 횟수: {s.checked.length}
            {s.found && ` · ${s.checked.length}번 만에 찾음`}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        {ARR.map((n, i) => {
          const current = s.currentIdx === i && !s.checked.includes(i);
          return (
            <span
              key={n}
              className={clsx(
                CELL,
                "transition-colors duration-150",
                current
                  ? "mark border-foreground"
                  : s.checked.includes(i)
                    ? "bg-muted text-muted-foreground border-transparent"
                    : "text-muted-foreground border-border",
              )}
            >
              {n}
            </span>
          );
        })}
      </div>

      <Button
        onClick={() => setS(s.found ? INIT : { ...s, active: true })}
        disabled={s.active && !s.found}
      >
        {s.found ? "재시작" : "시작"}
      </Button>
    </div>
  );
}

export function BinarySearchDemo() {
  const [s, setS] = useState(INIT);
  const started = s.active || s.found;

  useEffect(() => {
    if (!s.active || s.found) return;
    const timer = setTimeout(() => setS(advanceBinary(s)), 400);
    return () => clearTimeout(timer);
  }, [s]);

  const inRange = (i: number) => i >= s.lo && i <= s.hi;

  return (
    <div className="flex flex-col gap-4">
      <div>
        찾는 값: <span className="font-mono">{TARGET}</span>
        {started && (
          <span className="text-muted-foreground">
            {" · "}
            확인 횟수: {s.checked.length}
            {s.found && ` · ${s.checked.length}번 만에 찾음`}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        {ARR.map((n, i) => {
          const current = s.currentIdx === i && !s.checked.includes(i);
          return (
            <span
              key={n}
              className={clsx(
                CELL,
                "transition-colors duration-150",
                current
                  ? "mark border-foreground"
                  : s.checked.includes(i)
                    ? "bg-muted text-muted-foreground border-transparent"
                    : !inRange(i)
                      ? // 범위 밖: 보조 색 글자만(가는 선도 없이)
                        "text-muted-foreground border-transparent"
                      : // 아직 범위 안: 가는 선 상자에 기본 글자색
                        "border-border",
              )}
            >
              {n}
            </span>
          );
        })}
      </div>

      <Button
        onClick={() => setS(s.found ? INIT : { ...s, active: true })}
        disabled={s.active && !s.found}
      >
        {s.found ? "재시작" : "시작"}
      </Button>
    </div>
  );
}
