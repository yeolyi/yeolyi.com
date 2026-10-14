/** biome-ignore-all lint/suspicious/noArrayIndexKey: fixed-size arrays */

import Button from "@yeolyi/ui/Button";
import clsx from "clsx";
import { ArrowRight } from "lucide-react";
import { useState } from "react";

type Level = { name: string; capacity: number; speed?: string };

const DEFAULT_LEVELS: Level[] = [
  { name: "L1", capacity: 2, speed: "~4 사이클" },
  { name: "L2", capacity: 4, speed: "~10 사이클" },
  { name: "L3", capacity: 8, speed: "~40 사이클" },
  { name: "RAM", capacity: 16, speed: "~200 사이클" },
];

// 마지막 레벨은 RAM으로 취급한다 — 모든 주소를 항상 보유, LRU 갱신 없음.
// speed가 없으면 속도 표기와 하단 요약을 생략한다.
export function MemoryHierarchy({
  levels = DEFAULT_LEVELS,
  addressCount = 16,
}: {
  levels?: Level[];
  addressCount?: number;
}) {
  const addresses = Array.from({ length: addressCount }, (_, i) => i);

  const [caches, setCaches] = useState<number[][]>(levels.map(() => []));
  const [hitLevel, setHitLevel] = useState<number | null>(null);
  const [lastAddress, setLastAddress] = useState<number | null>(null);

  const access = (address: number) => {
    let found = levels.length - 1;
    for (let i = 0; i < levels.length - 1; i++) {
      if (caches[i].includes(address)) {
        found = i;
        break;
      }
    }

    setHitLevel(found);
    setLastAddress(address);

    setCaches((prev) =>
      prev.map((cache, i) => {
        if (i > found) return cache;
        if (i === found && found === levels.length - 1) return cache;
        const without = cache.filter((a) => a !== address);
        return [address, ...without].slice(0, levels[i].capacity);
      }),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 조작 영역 — 라벨을 버튼 행에 바로 붙여(좁은 갭) 한 덩어리로 묶는다.
          결과 영역(L1~RAM)과는 gap-4 로 구분. */}
      <div className="flex flex-col gap-1.5">
        <span className="text-muted-foreground">메모리 주소, 눌러서 접근</span>
        <div className="flex flex-wrap gap-1.5">
          {addresses.map((addr) => (
            <Button
              key={addr}
              className="font-mono"
              onClick={() => access(addr)}
            >
              {addr}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {levels.map((level, i) => {
          const isRam = i === levels.length - 1;
          const isHit = hitLevel === i && lastAddress !== null;
          const isMiss =
            hitLevel !== null && lastAddress !== null && i < hitLevel;

          return (
            <div
              key={i}
              className={clsx(
                "flex items-center gap-3 border px-3 py-2 transition-colors",
                isHit
                  ? "border-foreground bg-muted"
                  : isMiss
                    ? "border-border"
                    : "border-transparent",
              )}
            >
              <span className="w-8">{level.name}</span>
              <div className="flex flex-1 flex-wrap gap-1">
                {isRam ? (
                  <span className="text-muted-foreground">모든 주소 보유</span>
                ) : (
                  <>
                    {caches[i].map((addr) => (
                      <span
                        key={addr}
                        className={clsx(
                          "flex h-6 w-6 items-center justify-center font-mono",
                          lastAddress === addr && isHit ? "mark" : "bg-muted",
                        )}
                      >
                        {addr}
                      </span>
                    ))}
                    {Array.from(
                      { length: level.capacity - caches[i].length },
                      (_, j) => (
                        <span
                          key={`empty-${j}`}
                          className="text-muted-foreground flex h-6 w-6 items-center justify-center border font-mono"
                        >
                          ·
                        </span>
                      ),
                    )}
                  </>
                )}
              </div>
              {level.speed && (
                <span className="text-muted-foreground">{level.speed}</span>
              )}
            </div>
          );
        })}
      </div>

      {hitLevel !== null && levels[hitLevel].speed && (
        <span className="text-muted-foreground">
          주소 {lastAddress}{" "}
          <ArrowRight
            aria-hidden
            className="inline size-[1.2em] align-[-0.25em]"
          />{" "}
          {hitLevel === levels.length - 1
            ? "RAM에서 가져옴"
            : `${levels[hitLevel].name} 히트`}{" "}
          ({levels[hitLevel].speed})
        </span>
      )}
    </div>
  );
}
