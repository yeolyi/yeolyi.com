import type { IncomeScale } from "@shared/eligibility.ts";
import { clsx as cn } from "clsx";

// 칸 너비는 물량 비율(우선 50 · 일반 20 · 추첨 30)이다 — 소득이 어디 떨어지느냐보다 그 칸이 얼마나 큰지가 당첨엔 중요하다.
// 내 소득은 해당 칸 안에서 경계 사이를 비례로 찍는다. 경계 눈금(130·170)은 칸 사이에.
export function IncomeBar({ scale }: { scale: IncomeScale }) {
  const total = scale.tiers.reduce((a, t) => a + t.sharePct, 0);
  let cursor = 0;
  let lowCap = 0;
  const segments = scale.tiers.map((t) => {
    const s = {
      ...t,
      left: cursor / total,
      width: t.sharePct / total,
      lowCap,
      highCap: t.capPct,
    };
    cursor += t.sharePct;
    lowCap = t.capPct ?? lowCap;
    return s;
  });
  const landing = segments.find(
    (s) => s.highCap === undefined || scale.pct <= s.highCap,
  );
  // 열린 마지막 칸(소득 무관)은 아래 경계에서 그 절반만큼 더 간 곳을 끝으로 본다
  const markerX = landing
    ? landing.left +
      landing.width *
        Math.min(
          1,
          Math.max(
            0,
            (scale.pct - landing.lowCap) /
              ((landing.highCap ?? landing.lowCap * 1.5) - landing.lowCap),
          ),
        )
    : 1;
  return (
    <div className="max-w-md space-y-1">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 pb-4">
          <div className="border-foreground flex h-7 border">
            {segments.map((sg) => (
              <span
                key={sg.label}
                className={cn(
                  "flex h-full items-center justify-center truncate border-r px-1 text-xs last:border-r-0",
                  sg === landing ? "mark" : "text-muted-foreground",
                )}
                style={{ width: `${sg.width * 100}%` }}
              >
                {sg.label} {sg.sharePct}%
              </span>
            ))}
          </div>
          <div
            className="bg-accent absolute top-[-4px] h-[36px] w-[3px] -translate-x-1/2"
            style={{ left: `${markerX * 100}%` }}
            aria-hidden
          />
          {segments
            .filter((sg) => sg.highCap !== undefined && sg !== segments.at(-1))
            .map((sg) => (
              <span
                key={sg.label}
                className="text-muted-foreground absolute top-7 -translate-x-1/2 font-mono text-xs tabular-nums"
                style={{ left: `${(sg.left + sg.width) * 100}%` }}
              >
                {sg.highCap}%
              </span>
            ))}
        </div>
        <div className="shrink-0 pb-4 text-sm leading-tight">
          <div className="font-mono font-bold tabular-nums">{scale.pct}%</div>
          <div className="text-muted-foreground text-xs">
            {landing ? `${landing.label} ${landing.sharePct}%` : "초과"}
          </div>
        </div>
      </div>
      <p className="text-muted-foreground text-sm">
        {scale.pct}% = 가구 세전 월소득 {scale.incomeMan.toLocaleString()}만 ÷
        도시근로자 가구당 월평균소득(3인 이하 칸){" "}
        {scale.baseMan.toLocaleString()}만. 가구원 보수월액 합산. 개인화에서
        바꿉니다.
      </p>
    </div>
  );
}
