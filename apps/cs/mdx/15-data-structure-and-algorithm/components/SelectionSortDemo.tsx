import Button from "@yeolyi/ui/Button";
import clsx from "clsx";
import { useState } from "react";
import { CELL } from "../lib/cell";

const INITIAL = [14, 3, 27, 8, 21];

type State = {
  arr: number[];
  sorted: number;
  sub: number;
  minIdx: number | null;
  minVal: number | null;
  swapTarget: number | null;
};

const INIT: State = {
  arr: [...INITIAL],
  sorted: 0,
  sub: -1,
  minIdx: null,
  minVal: null,
  swapTarget: null,
};

function advance(s: State): State {
  if (s.sub === -1) {
    let minIdx = s.sorted;
    for (let i = s.sorted + 1; i < s.arr.length; i++) {
      if (s.arr[i] < s.arr[minIdx]) minIdx = i;
    }
    return {
      ...s,
      sub: 0,
      minIdx,
      minVal: s.arr[minIdx],
      swapTarget: s.arr[s.sorted],
    };
  }

  if (s.sub === 0) {
    const next = [...s.arr];
    [next[s.sorted], next[s.minIdx!]] = [next[s.minIdx!], next[s.sorted]];
    return { ...s, arr: next, sub: 1 };
  }

  if (s.sub === 1) {
    return { ...s, sorted: s.sorted + 1, sub: 2 };
  }

  if (s.sub === 2) {
    return { ...s, sub: 3 };
  }

  if (s.sub === 3) {
    if (s.sorted >= s.arr.length - 1) return s;
    let minIdx = s.sorted;
    for (let i = s.sorted + 1; i < s.arr.length; i++) {
      if (s.arr[i] < s.arr[minIdx]) minIdx = i;
    }
    return {
      ...s,
      sub: 0,
      minIdx,
      minVal: s.arr[minIdx],
      swapTarget: s.arr[s.sorted],
    };
  }

  return s;
}

export function SelectionSortDemo() {
  const [s, setS] = useState<State>(INIT);
  const idle = s.sub === -1;
  const done = s.sub === 3 && s.sorted >= s.arr.length - 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        {s.arr.map((n, i) => {
          const current =
            (!idle && i === s.minIdx && s.sub <= 1) ||
            (!idle && i === s.sorted - 1 && s.sub >= 2);
          return (
            <span
              key={`${i}-${n}`}
              className={clsx(
                CELL,
                "transition-colors",
                current
                  ? "mark border-foreground"
                  : i < s.sorted
                    ? "bg-muted text-muted-foreground border-transparent"
                    : idle
                      ? "text-muted-foreground border-border"
                      : i >= s.sorted
                        ? "text-muted-foreground border-border"
                        : "bg-muted text-muted-foreground border-transparent",
              )}
            >
              {n}
            </span>
          );
        })}
      </div>

      <ol className="list-decimal space-y-1 pl-5">
        <li>
          <span className={clsx(!idle && s.sub === 0 && "mark")}>
            정렬되지 않은 부분에서 가장 작은 값을 찾는다.
          </span>
          {!idle && s.sub >= 0 && s.minVal !== null && (
            <span className="text-muted-foreground font-normal">
              {" "}
              (최솟값: {s.minVal})
            </span>
          )}
        </li>
        <li>
          <span className={clsx(!idle && s.sub === 1 && "mark")}>
            그 값을 정렬되지 않은 부분의 첫 번째 값과 자리를 바꾼다.
          </span>
          {!idle &&
            s.sub >= 1 &&
            s.minVal !== null &&
            s.swapTarget !== null && (
              <span className="text-muted-foreground font-normal">
                {" "}
                (
                {s.minVal === s.swapTarget
                  ? `${s.minVal}은 이미 제자리`
                  : `${s.minVal} ↔ ${s.swapTarget}`}
                )
              </span>
            )}
        </li>
        <li>
          <span className={clsx(!idle && s.sub === 2 && "mark")}>
            정렬된 부분이 한 칸 늘어난다.
          </span>
          {!idle && s.sub >= 2 && (
            <span className="text-muted-foreground font-normal">
              {" "}
              ({s.sorted}/{s.arr.length} 정렬됨)
            </span>
          )}
        </li>
        <li>
          <span className={clsx(!idle && s.sub === 3 && "mark")}>
            정렬되지 않은 부분에 값이 하나 남으면 끝난다. 아니면 1로 돌아간다.
          </span>
          {!idle && s.sub >= 3 && (
            <span className="text-muted-foreground font-normal">
              {" "}
              ({done ? "완료" : `남은 ${s.arr.length - s.sorted}개`})
            </span>
          )}
        </li>
      </ol>

      <div className="flex gap-2">
        {idle ? (
          <Button onClick={() => setS(advance(s))}>시작</Button>
        ) : (
          <>
            <Button onClick={() => setS(advance(s))} disabled={done}>
              다음 단계
            </Button>
            {done && <Button onClick={() => setS(INIT)}>초기화</Button>}
          </>
        )}
      </div>
    </div>
  );
}
