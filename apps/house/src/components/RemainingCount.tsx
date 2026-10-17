import { todayYmd } from "@shared/dates.ts";
import { anyRouteOpen } from "@shared/routes.ts";
import { dedupeNotices, isLive, isMainRound } from "@shared/site.ts";
import type { Settings } from "@shared/types.ts";
import { judge } from "@shared/verdict.ts";
import { useMemo } from "react";
import { useNotices } from "../data.ts";

// 개인화 질문 화면의 한 줄: 지금 답(저장 전 초안)으로 진행 중 공고가 몇 건 남는지. 답할 때마다 줄어드는 걸 보여 입력이 덜 지루하게.
// 넣을 수 있는 공고 = 목록의 후보(사는 곳·자산). 그중 본청약은 특공·1순위 길이 하나라도 열린 것만 센다(모름은 열린 것으로).
export function RemainingCount({ d }: { d: Settings }) {
  const notices = useNotices();
  const today = todayYmd();
  const c = useMemo(() => {
    const live = dedupeNotices(notices.data ?? []).filter(
      (n) => isLive(n, today) && !judge(n, d).notSubscription,
    );
    const cand = live.filter((n) => judge(n, d).pass);
    const main = cand.filter(isMainRound);
    return {
      live: live.length,
      cand: cand.length,
      main: main.length,
      open: main.filter((n) => anyRouteOpen(n, d)).length,
    };
  }, [notices.data, d, today]);
  if (!notices.data) return null;
  return (
    <p
      className="text-muted-foreground mt-[0.5rlh] text-base"
      aria-live="polite"
    >
      {/* 묶음마다 줄이 바뀌지 않게 붙여 둔다 */}
      <span className="whitespace-nowrap">
        진행 중 {c.live}건 → 넣을 수 있는{" "}
        <strong className="text-foreground">{c.cand}건</strong>
      </span>
      {c.main > 0 && (
        <>
          {" · "}
          <span className="whitespace-nowrap">
            본청약 {c.main}건 중 특공·1순위{" "}
            <strong className="text-foreground">{c.open}건</strong>
          </span>
        </>
      )}
    </p>
  );
}
