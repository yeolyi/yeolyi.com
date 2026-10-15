import { fmtDate } from "@shared/dates.ts";
import { isMainRound } from "@shared/site.ts";
import type { Notice } from "@shared/types.ts";
import { clsx } from "clsx";
import MonthCalendar from "./MonthCalendar";

export type Milestone = {
  label: string;
  date: string;
  end?: string;
  month?: boolean;
};

export function milestones(n: Notice): Milestone[] {
  const out: Milestone[] = [{ label: "공고", date: n.announcedAt }];
  if (n.spStart)
    out.push({ label: "특공 접수", date: n.spStart, end: n.spEnd });
  // LH 공공 본청약은 청약홈에 특공 날짜가 비어 오고 접수 기간 하나만 온다. 그 첫날이 특공이다.
  const publicNoSpecial = isMainRound(n) && n.publicHousing && !n.spStart;
  if (n.r1Start)
    out.push({
      label: publicNoSpecial
        ? "접수(첫날 특공)"
        : isMainRound(n)
          ? "1순위 접수"
          : "접수",
      date: n.r1Start,
      end: n.r1End,
    });
  if (n.r2Start)
    out.push({ label: "2순위 접수", date: n.r2Start, end: n.r2End });
  if (n.winnerAt) out.push({ label: "당첨 발표", date: n.winnerAt });
  if (n.contractStart)
    out.push({ label: "계약", date: n.contractStart, end: n.contractEnd });
  if (n.moveInYm)
    out.push({
      label: "입주",
      date: `${n.moveInYm.slice(0, 4)}-${n.moveInYm.slice(4, 6)}-01`,
      month: true,
    });
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** 다음에 올 일정. 목록의 날짜 칸에 쓴다. */
export function nextMilestone(n: Notice, today: string): Milestone | undefined {
  return milestones(n).find(
    (m) => (m.end ?? m.date) >= today && m.label !== "공고",
  );
}

export const fmtWhen = (m: Milestone) =>
  m.month
    ? m.date.slice(0, 7).replace("-", ".")
    : m.end && m.end !== m.date
      ? `${fmtDate(m.date)}~${fmtDate(m.end)}`
      : fmtDate(m.date);

// 달력 칸에 들어갈 짧은 이름. 온전한 이름은 아래 목록에 있다.
const SHORT: Record<string, string> = {
  "특공 접수": "특공",
  "1순위 접수": "1순위",
  "2순위 접수": "2순위",
  "접수(첫날 특공)": "접수",
  "당첨 발표": "발표",
};

/** 공고~계약은 월 달력으로, 입주(몇 년 뒤라 달력에 안 들어간다)와 용어 풀이는 아래 날짜 목록으로. */
export function Schedule({
  n,
  today,
  fixedWeeks = true,
  listAll = true,
}: {
  n: Notice;
  today: string;
  fixedWeeks?: boolean;
  /** 날짜 목록에 달력에 있는 일정까지 다 적는다. 끄면 달력 밖(입주)만. */
  listAll?: boolean;
}) {
  const ms = milestones(n);
  return (
    <>
      <MonthCalendar
        events={ms
          .filter((m) => !m.month)
          .map((m) => ({
            start: m.date,
            end: m.end,
            label: SHORT[m.label] ?? m.label,
          }))}
        today={today}
        fixedWeeks={fixedWeeks}
      />
      <ScheduleList
        ms={listAll ? ms : ms.filter((m) => m.month)}
        today={today}
      />
    </>
  );
}

/** 날짜 + 일. 지난 것은 보조 색, 오늘 걸린 것은 굵게. */
function ScheduleList({ ms, today }: { ms: Milestone[]; today: string }) {
  return (
    <>
      <ul className="mt-[1rlh] grid grid-cols-[max-content_1fr] gap-x-4">
        {ms.map((m) => {
          const past = (m.end ?? m.date) < today;
          const now = m.date <= today && today <= (m.end ?? m.date);
          return (
            <li
              key={m.label}
              className={clsx(
                "contents",
                past && "text-muted-foreground",
                now && "font-bold",
              )}
            >
              <span className="font-mono">{fmtWhen(m)}</span>
              <span>
                {m.label}
                {now && " (오늘)"}
              </span>
            </li>
          );
        })}
      </ul>
      {ms.some((m) => m.label === "접수(첫날 특공)") && (
        <p className="text-muted-foreground mt-[0.5rlh] text-base">
          LH 공공 본청약은 청약홈에 접수 기간이 하나로만 와서, 그 첫날이
          특별공급이고 다음 날부터 1순위입니다. 정확한 날은 공고문에 있습니다.
        </p>
      )}
    </>
  );
}
