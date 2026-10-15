import Button from "@yeolyi/ui/Button";
import { clsx } from "clsx";
import { useState } from "react";

// 월 달력 — 일정 몇 개를 날짜 칸 위에 펼쳐 보인다. 고르는 달력(date picker)이 아니라 보는 달력이다(날짜 입력은 DateInput).
// 첫 일정이 있는 달부터 마지막 일정이 있는 달까지 펼치고, 넉 달이 넘으면 두 달씩 넘겨 본다.
// 달은 늘 6주라 높이가 같다. 일정이 걸친 날은 옅은 바탕, 이름은 시작한 날(그리고 주가 바뀐 날)에 적는다. 오늘은 2px 잉크 테두리, 지난 날은 보조 색.
// 진짜 <table> 이라 화면 읽기 프로그램이 달(caption)·요일(th)·날짜와 일정(td)을 그대로 읽는다. 날짜는 "YYYY-MM-DD".
export type CalendarEvent = { start: string; end?: string; label: string };

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_MONTHS = 4;
const PAGE = 2;

const ym = (d: string) => d.slice(0, 7);
const ymd = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
function monthsBetween(from: string, to: string) {
  const out: string[] = [];
  let [y, m] = from.split("-").map(Number) as [number, number];
  const [ty, tm] = to.split("-").map(Number) as [number, number];
  while (y < ty || (y === ty && m <= tm)) {
    out.push(ymd(y, m, 1).slice(0, 7));
    if (m === 12) {
      y += 1;
      m = 1;
    } else m += 1;
  }
  return out;
}

export default function MonthCalendar({
  events,
  today,
  fixedWeeks = true,
  className,
}: {
  events: CalendarEvent[];
  today?: string;
  /** 달마다 6주로 그려 높이를 같게(불러오기 전후로 흔들리면 안 되는 곳). 끄면 그 달의 주 수만큼. */
  fixedWeeks?: boolean;
  className?: string;
}) {
  const sorted = events.toSorted((a, b) => (a.start < b.start ? -1 : 1));
  const first = sorted[0];
  const months = first
    ? monthsBetween(
        ym(first.start),
        ym(
          sorted.reduce(
            (a, e) => ((e.end ?? e.start) > a ? (e.end ?? e.start) : a),
            first.start,
          ),
        ),
      )
    : [];
  const paged = months.length > MAX_MONTHS;
  const [page, setPage] = useState(0);
  const shown = paged ? months.slice(page * PAGE, page * PAGE + PAGE) : months;
  return (
    <div className={className}>
      {/* 한 달뿐이면 글 폭을 다 쓴다(두 칸 틀에서 왼쪽 절반만 차면 아래 목록과 폭이 어긋난다). */}
      <div
        className={clsx(
          "grid gap-x-6 gap-y-[1rlh]",
          shown.length > 1 && "sm:grid-cols-2",
        )}
      >
        {shown.map((mo) => (
          <Month
            key={mo}
            month={mo}
            events={sorted}
            today={today}
            fixedWeeks={fixedWeeks}
          />
        ))}
      </div>
      {paged && (
        <div className="mt-[0.5rlh] flex gap-2">
          <Button disabled={page === 0} onClick={() => setPage(page - 1)}>
            이전 달
          </Button>
          <Button
            disabled={(page + 1) * PAGE >= months.length}
            onClick={() => setPage(page + 1)}
          >
            다음 달
          </Button>
        </div>
      )}
    </div>
  );
}

function Month({
  month,
  events,
  today,
  fixedWeeks,
}: {
  month: string;
  events: CalendarEvent[];
  today?: string;
  fixedWeeks: boolean;
}) {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array(first).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  // 달마다 주 수(4~6)가 달라, fixedWeeks 면 높이가 흔들리지 않게 늘 6주로 그린다.
  while (cells.length % 7 || (fixedWeeks && cells.length < 42))
    cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) =>
    cells.slice(w * 7, w * 7 + 7),
  );
  return (
    // 넓은 화면에서 칸이 너무 커지지 않게 달 하나는 28rem(칸 64px)까지.
    <table className="w-full max-w-[28rem] table-fixed border-collapse">
      <caption className="mb-1 text-left font-bold">
        {y}년 {m}월
      </caption>
      <thead>
        <tr>
          {WEEKDAYS.map((w) => (
            <th
              key={w}
              scope="col"
              className="text-muted-foreground pb-1 text-center text-sm font-normal"
            >
              {w}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week, wi) => (
          <tr key={wi}>
            {week.map((d, di) => {
              if (d === null)
                return (
                  <td key={di} className="p-[1px]">
                    <div className="aspect-square min-h-12" />
                  </td>
                );
              const date = ymd(y, m, d);
              const on = events.filter(
                (e) => e.start <= date && date <= (e.end ?? e.start),
              );
              // 이름은 시작한 날에, 기간이 주를 넘어가면 일요일·1일에 다시 적는다.
              const named = on.filter(
                (e) => e.start === date || di === 0 || d === 1,
              );
              const past = today !== undefined && date < today;
              return (
                <td key={di} className="p-[1px] align-top">
                  <div
                    className={clsx(
                      // 칸은 폭만큼 높게(정사각형). 좁아도 글자 두 줄은 들어가게 최소 높이를 둔다.
                      "aspect-square min-h-12 px-1 text-sm leading-tight",
                      on.length > 0 && "bg-muted",
                      date === today &&
                        "outline-foreground outline-2 -outline-offset-2",
                      past && "text-muted-foreground",
                    )}
                  >
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
