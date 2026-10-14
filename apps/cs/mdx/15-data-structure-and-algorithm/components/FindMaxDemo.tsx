import Button from "@yeolyi/ui/Button";
import clsx from "clsx";
import { useState } from "react";
import { CELL } from "../lib/cell";

const NUMBERS = [14, 3, 27, 8, 21];

type State = {
  numIdx: number;
  sub: number;
  maxVal: number | null;
  prevMax: number | null;
};

const INIT: State = { numIdx: -1, sub: 0, maxVal: null, prevMax: null };

function advance(s: State): State {
  if (s.numIdx < 0) return { numIdx: 0, sub: 0, maxVal: null, prevMax: null };

  const cur = NUMBERS[s.numIdx];

  if (s.sub === 0) {
    const newMax = s.maxVal === null || cur > s.maxVal ? cur : s.maxVal;
    return { ...s, sub: 1, prevMax: s.maxVal, maxVal: newMax };
  }

  if (s.sub === 1) return { ...s, sub: 2 };

  if (s.numIdx < NUMBERS.length - 1)
    return { ...s, numIdx: s.numIdx + 1, sub: 0 };

  return s;
}

export function FindMaxDemo() {
  const [s, setS] = useState<State>(INIT);
  const idle = s.numIdx < 0;
  const done = s.numIdx === NUMBERS.length - 1 && s.sub === 2;
  const cur = !idle ? NUMBERS[s.numIdx] : null;

  const ctx2 =
    s.sub < 1
      ? null
      : s.numIdx === 0 && s.prevMax === null
        ? `첫 번째 숫자, 최댓값 = ${cur!}`
        : cur! > s.prevMax!
          ? `${cur!} > ${s.prevMax!}, 최댓값 = ${cur!}`
          : `${cur!} < ${s.prevMax!}, 유지`;

  const ctx3 =
    s.sub < 2
      ? null
      : done
        ? `끝. 최댓값은 ${s.maxVal!}`
        : `남은 숫자 ${NUMBERS.length - s.numIdx - 1}개`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="flex flex-wrap gap-1.5">
          {NUMBERS.map((n, i) => {
            const current = !idle && i === s.numIdx;
            return (
              <span
                key={n}
                className={clsx(
                  CELL,
                  "transition-colors",
                  current
                    ? "mark border-foreground"
                    : !idle && i < s.numIdx
                      ? "bg-muted text-muted-foreground border-transparent"
                      : "text-muted-foreground border-border",
                )}
              >
                {n}
              </span>
            );
          })}
        </div>
        {!idle && (
          <span>
            최댓값: <span className="font-mono">{s.maxVal ?? "-"}</span>
          </span>
        )}
      </div>

      <ol className="list-decimal space-y-1 pl-5">
        <li>
          <span className={clsx(!idle && s.sub === 0 && "mark")}>
            숫자 하나를 본다.
          </span>
          {!idle && (
            <span className="text-muted-foreground font-normal"> ({cur!})</span>
          )}
        </li>
        <li>
          <span className={clsx(!idle && s.sub === 1 && "mark")}>
            지금까지의 최댓값보다 크면 갱신한다.
          </span>
          {ctx2 && (
            <span className="text-muted-foreground font-normal"> ({ctx2})</span>
          )}
        </li>
        <li>
          <span className={clsx(!idle && s.sub === 2 && "mark")}>
            아직 안 본 숫자가 있으면 1로 돌아간다.
          </span>
          {ctx3 && (
            <span className="text-muted-foreground font-normal"> ({ctx3})</span>
          )}
        </li>
      </ol>

      <div className="flex gap-2">
        {idle ? (
          <Button onClick={() => setS(advance(s))}>시작</Button>
        ) : (
          <>
            <Button onClick={() => setS(advance(s))} disabled={done}>
              다음
            </Button>
            {done && <Button onClick={() => setS(INIT)}>초기화</Button>}
          </>
        )}
      </div>
    </div>
  );
}
