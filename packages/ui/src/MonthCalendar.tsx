import { clsx } from "clsx";
import { useState } from "react";
import Button from "./Button";

// 월 달력 — 일정 몇 개를 날짜 칸 위에 펼쳐 보인다. 고르는 달력(date picker)이 아니라 보는 달력이다(날짜 입력은 DateInput).
// 첫 일정이 있는 달부터 마지막 일정이 있는 달까지 펼치고, 넉 달이 넘으면 두 달씩 넘겨 본다.
// 달은 늘 6주라 높이가 같다. 일정이 걸친 날은 옅은 바탕, 이름은 시작한 날(그리고 주가 바뀐 날)에 적는다. 오늘은 2px 잉크 테두리, 지난 날은 보조 색.
// 진짜 <table> 이라 화면 읽기 프로그램이 달(caption)·요일(th)·날짜와 일정(td)을 그대로 읽는다. 날짜는 "YYYY-MM-DD".
export type CalendarEvent = { start: string; end?: string; label: string };

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_MONTHS = 4;
const PAGE = 2;

const ym = (d: string) => d.slice(0, 7);
const ymd = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
function monthsBetween(from: string, to: string) {
  const out: string[] = [];
  let [y, m] = from.split("-").map(Number) as [number, number];
  const [ty, tm] = to.split("-").map(Number) as [number, number];
  while (y < ty || (y === ty && m <= tm)) {
    out.push(ymd(y, m, 1).slice(0, 7));
    m === 12 ? ((y += 1), (m = 1)) : (m += 1);
  }
  return out;
}

export default function MonthCalendar({ events, today, className }: { events: CalendarEvent[]; today?: string; className?: string }) {
  const sorted = [...events].sort((a, b) => (a.start < b.start ? -1 : 1));
  const months = sorted.length ? monthsBetween(ym(sorted[0]!.start), ym(sorted.reduce((a, e) => ((e.end ?? e.start) > a ? (e.end ?? e.start) : a), sorted[0]!.start))) : [];
  const paged = months.length > MAX_MONTHS;
  const [page, setPage] = useState(0);
  const shown = paged ? months.slice(page * PAGE, page * PAGE + PAGE) : months;
  return (
    <div className={className}>
      <div className="grid gap-x-6 gap-y-[1lh] sm:grid-cols-2">
        {shown.map((mo) => (
          <Month key={mo} month={mo} events={sorted} today={today} />
        ))}
      </div>
      {paged && (
        <div className="mt-[0.5lh] flex gap-2">
          <Button disabled={page === 0} onClick={() => setPage(page - 1)}>
            이전 달
          </Button>
          <Button disabled={(page + 1) * PAGE >= months.length} onClick={() => setPage(page + 1)}>
            다음 달
          </Button>
        </div>
      )}
    </div>
  );
}

function Month({ month, events, today }: { month: string; events: CalendarEvent[]; today?: string }) {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  // 달마다 주 수(4~6)가 달라 높이가 흔들리지 않게 늘 6주로 그린다.
  while (cells.length < 42) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
  return (
    <table className="w-full table-fixed border-collapse">
      <caption className="mb-1 text-left font-bold">
        {y}년 {m}월
      </caption>
      <thead>
        <tr>
          {WEEKDAYS.map((w) => (
            <th key={w} scope="col" className="text-muted-foreground pb-1 text-center text-sm font-normal">
              {w}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week, wi) => (
          <tr key={wi}>
            {week.map((d, di) => {
              if (d === null) return <td key={di} className="h-12" />;
              const date = ymd(y, m, d);
              const on = events.filter((e) => e.start <= date && date <= (e.end ?? e.start));
              // 이름은 시작한 날에, 기간이 주를 넘어가면 일요일·1일에 다시 적는다.
              const named = on.filter((e) => e.start === date || di === 0 || d === 1);
              const past = today !== undefined && date < today;
              return (
                <td key={di} className="h-12 p-[1px] align-top">
                  <div className={clsx("h-full px-1 text-sm leading-tight", on.length > 0 && "bg-muted", date === today && "outline-foreground outline-2 -outline-offset-2", past && "text-muted-foreground")}>
                    <span className="font-mono">{d}</span>
                    {named.map((e) => (
                      <span key={e.label} className="block truncate font-bold">
                        {e.label}
                      </span>
                    ))}
                    {date === today && <span className="sr-only">오늘</span>}
                  </div>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
