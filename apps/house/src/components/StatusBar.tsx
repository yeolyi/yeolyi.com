import { useLastRun } from "../data.ts";
import { fmtClock } from "../util.ts";

/** 마지막 수집. 평소엔 아무것도 그리지 않고, 실패했거나 두 시간 넘게 멈췄을 때만 반전으로 알린다. */
export function StatusBar() {
  const run = useLastRun();
  const r = run.data;
  const stale =
    r && Date.now() - new Date(r.finishedAt).getTime() > 2 * 3600_000;
  const bad = !!(run.error || r?.error || stale);
  if (!bad) return null;
  const text = run.error
    ? `상태를 못 읽음: ${run.error.message}`
    : r?.error
      ? `${fmtClock(r.finishedAt)} 수집 실패: ${r.error}`
      : `${fmtClock(r!.finishedAt)} 뒤로 수집이 멈춰 있습니다`;
  return <p className="mark w-fit px-1 text-base">{text}</p>;
}
