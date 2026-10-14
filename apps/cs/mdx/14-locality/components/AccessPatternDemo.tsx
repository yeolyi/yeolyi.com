/** biome-ignore-all lint/suspicious/noArrayIndexKey: fixed-size arrays */
import { useEffect, useState } from "react";

interface Props {
  sequence: number[];
  memorySize?: number;
  resetOnCycle?: boolean;
}

export function AccessPatternDemo({
  sequence,
  memorySize = 8,
  resetOnCycle = false,
}: Props) {
  const [step, setStep] = useState(0);
  const len = sequence.length;

  useEffect(() => {
    // 접근 패턴은 주기 len으로 반복되므로 화면 상태도 워밍업(len) 이후엔
    // 주기적이다 — step을 [len, 2len) 범위로 접어 무한히 커지지 않게 한다.
    const id = setInterval(
      () =>
        setStep((s) =>
          resetOnCycle ? (s + 1) % (len + 1) : s + 1 < 2 * len ? s + 1 : len,
        ),
      400,
    );
    return () => clearInterval(id);
  }, [len, resetOnCycle]);

  // 각 주소의 마지막 접근 시점 (-1이면 미접근) — 최근 len회 접근만 화면에 남는다
  const lastAccess = Array(memorySize).fill(-1) as number[];
  for (let i = Math.max(0, step - len); i < step; i++)
    lastAccess[sequence[i % len]] = i;

  return (
    // 라벨은 자기 행에 바로 붙인다(좁은 갭) — 그룹 사이 갭(gap-4)과 차이를 둬야
    // 라벨이 어느 행의 것인지 읽힌다.
    <div className="flex flex-col gap-1.5">
      <span className="text-muted-foreground">메모리 주소</span>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: memorySize }, (_, addr) => {
          const recency =
            lastAccess[addr] >= 0
              ? Math.max(0, 1 - (step - 1 - lastAccess[addr]) / len)
              : 0;

          return (
            <div
              key={addr}
              className="relative flex aspect-square w-10 items-center justify-center font-mono"
            >
              <div
                className="bg-foreground absolute inset-0 transition-opacity duration-150"
                style={{ opacity: recency }}
              />
              <span
                className={
                  recency > 0.6 ? "text-background relative" : "relative"
                }
              >
                {addr}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
