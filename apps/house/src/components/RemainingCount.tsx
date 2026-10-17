import { anyRouteOpen } from "@shared/routes.ts";
import { dedupeNotices, isMainRound } from "@shared/site.ts";
import type { Settings } from "@shared/types.ts";
import { judge } from "@shared/verdict.ts";
import { useMemo } from "react";
import { useNotices } from "../data.ts";

// 개인화 질문 화면의 한 줄: 지금 답(저장 전 초안)이면 최근 3개월 본청약 중 몇 건에 넣을 수 있는지. 답할 때마다 바뀌어 입력이 덜 지루하게.
// 진행 중만 세면 숫자가 작아 와닿지 않아, 목록이 받아 오는 최근 3개월(진행 중 + 마감)을 다 센다.
// 무순위·임의공급은 사는 곳·통장을 안 봐서 답과 상관없이 늘 남으니 뺀다.
// 넣을 수 있다 = 목록의 후보(사는 곳·자산)이고 특공·1순위 길이 하나라도 열림(모름은 열린 것으로).
export function RemainingCount({ d }: { d: Settings }) {
  const notices = useNotices();
  const c = useMemo(() => {
    const main = dedupeNotices(notices.data ?? []).filter(
      (n) => isMainRound(n) && !judge(n, d).notSubscription,
    );
    return {
      all: main.length,
      open: main.filter((n) => judge(n, d).pass && anyRouteOpen(n, d)).length,
    };
  }, [notices.data, d]);
  if (!notices.data) return null;
  return (
    <p
      className="text-muted-foreground mt-[0.5rlh] text-base"
      aria-live="polite"
    >
      최근 3개월 본청약 {c.all}건 중 지금 답으로 넣을 수 있는{" "}
      <strong className="text-foreground">{c.open}건</strong>
    </p>
  );
}
