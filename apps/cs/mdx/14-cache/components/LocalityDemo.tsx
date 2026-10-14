/** biome-ignore-all lint/suspicious/noArrayIndexKey: fixed-size arrays */

import Button from "@yeolyi/ui/Button";
import clsx from "clsx";
import { minBy, randomInt } from "es-toolkit";
import { useState } from "react";

interface AccessResult {
  address: number;
  hit: boolean;
}

function simulateAccesses(
  sequence: number[],
  cacheSize: number,
): { results: AccessResult[]; hitRate: number } {
  const cache: { address: number; accessTime: number }[] = [];
  let hits = 0;

  const results = sequence.map((address, tick) => {
    const hitIndex = cache.findIndex((e) => e.address === address);
    if (hitIndex !== -1) {
      cache[hitIndex].accessTime = tick;
      hits++;
      return { address, hit: true };
    }
    if (cache.length < cacheSize) {
      cache.push({ address, accessTime: tick });
    } else {
      const oldest = minBy(cache, (e) => e.accessTime);
      if (oldest) Object.assign(oldest, { address, accessTime: tick });
    }
    return { address, hit: false };
  });

  return {
    results,
    hitRate:
      sequence.length > 0 ? Math.round((hits / sequence.length) * 100) : 0,
  };
}

const SEQUENTIAL = [0, 1, 2, 3, 0, 1, 2, 3, 4, 5, 6, 7, 4, 5, 6, 7];

function randomSequence() {
  return Array.from({ length: SEQUENTIAL.length }, () => randomInt(16));
}

const CACHE_SIZE = 4;

export function LocalityDemo() {
  const [mode, setMode] = useState<"sequential" | "random" | null>(null);
  const [random, setRandom] = useState(randomSequence);

  const current =
    mode === "sequential"
      ? simulateAccesses(SEQUENTIAL, CACHE_SIZE)
      : mode === "random"
        ? simulateAccesses(random, CACHE_SIZE)
        : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Button onClick={() => setMode("sequential")}>순차 접근</Button>
        <Button
          onClick={() => {
            setRandom(randomSequence());
            setMode("random");
          }}
        >
          랜덤 접근
        </Button>
      </div>

      <div className="flex flex-wrap gap-1">
        {current
          ? current.results.map((r, i) => (
              <div
                key={`${i}-${r.address}-${r.hit}`}
                className={clsx(
                  "flex h-8 w-8 items-center justify-center font-mono",
                  r.hit ? "mark" : "border-border border",
                )}
              >
                {r.address}
              </div>
            ))
          : Array.from({ length: SEQUENTIAL.length }, (_, i) => (
              <div
                key={i}
                className="bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center font-mono"
              >
                ·
              </div>
            ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <span className="flex items-center gap-1">
            <span className="bg-foreground inline-block h-3 w-3" />
            히트
          </span>
          <span className="flex items-center gap-1">
            <span className="border-border inline-block h-3 w-3 border" />
            미스
          </span>
        </div>
        <span>적중률 {current ? `${current.hitRate}%` : "-%"}</span>
      </div>
    </div>
  );
}
