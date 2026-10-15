import { isMainRound } from "@shared/site.ts";
import type { Notice } from "@shared/types.ts";

// 공고의 성격을 한 줄로: "경기 · 공공 일반형 · 본청약 · 투기과열지구". 풀이는 상세 아래 관련 가이드에 있다.
export function facts(n: Notice): string[] {
  const sector =
    n.kind === "신혼희망타운"
      ? "신혼희망타운"
      : n.publicHousing
        ? `공공 ${n.publicType ?? "일반형"}`
        : "민영";
  const round = isMainRound(n)
    ? "본청약"
    : n.kind === "임의공급"
      ? "임의공급"
      : "잔여세대(무순위)";
  return [
    sector,
    round,
    n.regulated && "투기과열지구",
    n.priceCap && "분양가상한제",
  ].filter((x): x is string => !!x);
}

export function Facts({ n }: { n: Notice }) {
  return (
    <p className="text-muted-foreground">{[n.sido, ...facts(n)].join(" · ")}</p>
  );
}
