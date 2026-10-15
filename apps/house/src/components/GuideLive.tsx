import { todayYmd } from "@shared/dates.ts";
import { isMainRound } from "@shared/site.ts";
import type { Notice } from "@shared/types.ts";
import type { ReactNode } from "react";
import { useGuideNotices } from "../data.ts";
import MonthCalendar from "./MonthCalendar";
import { Schedule } from "./Schedule.tsx";

// 가이드에 지금 모인 실제 공고를 끼운다. 설명이 실제 공고에서 어떻게 보이는지 바로 이어 보라고.
// 공고는 최근 1년의 수도권 본청약(useGuideNotices).
// 레이아웃 흔들림(CLS) 막기: 불러오는 동안·실패·공고가 모자랄 때도 상자는 다 불러온 뒤와 같은 줄 수로 그린다.
// 상자를 늦게 끼우거나 없애지 않고, 빈 줄은 줄 높이만 차지하는 nbsp 로 채운다.

const CAPITAL = ["서울", "경기", "인천"];
const link = (n: Notice) => `/notices/${encodeURIComponent(n.id)}`;
const byNewest = (a: Notice, b: Notice) =>
  a.announcedAt < b.announcedAt ? 1 : -1;

function useCapitalMain() {
  const q = useGuideNotices();
  const list = (q.data ?? [])
    .filter((n) => isMainRound(n) && CAPITAL.includes(n.sido))
    .sort(byNewest);
  // 불러오는 중·실패는 화면에 글로 띄우지 않고(줄이 늘었다 줄면 흔들린다) 스크린리더에만 알린다.
  const status = q.isPending
    ? "공고를 불러오는 중"
    : q.error
      ? "공고를 불러오지 못했습니다"
      : undefined;
  return { list: status ? [] : list, status, busy: q.isPending };
}

/** 늘 rows 줄. 모자라면 빈 줄로 채운다. */
function Rows({
  items,
  rows,
  render,
}: {
  items: Notice[];
  rows: number;
  render: (n: Notice) => ReactNode;
}) {
  return (
    <ul>
      {Array.from({ length: rows }, (_, i) => {
        const n = items[i];
        return (
          <li key={n?.id ?? `empty-${i}`} className="truncate">
            {n ? render(n) : " "}
          </li>
        );
      })}
    </ul>
  );
}

function Frame({
  busy,
  status,
  children,
}: {
  busy: boolean;
  status?: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-[1rlh] border p-4" aria-busy={busy}>
      {children}
      {status && <output className="sr-only">{status}</output>}
    </div>
  );
}

/** 민영과 공공: 최근 공고일 순으로 수도권 본청약을 민영·공공 4개씩. 예시라 접수 중인지는 따지지 않는다(접수 중만 고르면 공공은 1년 중 3분의 1이 빈다). */
export function SectorNow() {
  const { list, status, busy } = useCapitalMain();
  const groups = [
    { label: "민영", items: list.filter((n) => !n.publicHousing) },
    { label: "공공", items: list.filter((n) => n.publicHousing) },
  ];
  return (
    <Frame busy={busy} status={status}>
      <div className="grid gap-x-6 gap-y-[0.5rlh] sm:grid-cols-2">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="font-bold">{g.label}</p>
            <div className="mt-1">
              <Rows
                items={g.items}
                rows={4}
                render={(n) => <a href={link(n)}>{n.name}</a>}
              />
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/** 일정: 날짜가 다 찬 가장 최근 수도권 본청약 하나의 일정(달력 + 날짜 목록).
 *  불러오기 전엔 같은 꼴의 빈 두 달 달력과 7줄(공고·특공·1순위·2순위·발표·계약·입주)을 안 보이게 그려 자리를 잡는다.
 *  공고는 두 달 안에 계약까지 끝나는 것을 고른다(달력 높이가 같게). */
const SCHEDULE_ROWS = 7;
const twoMonths = (n: Notice) => {
  const [y1, m1] = n.announcedAt.split("-").map(Number) as [number, number];
  const end = n.contractEnd ?? n.contractStart;
  if (!end) return false;
  const [y2, m2] = end.split("-").map(Number) as [number, number];
  return (y2 - y1) * 12 + (m2 - m1) <= 1;
};
export function ScheduleExample() {
  const { list, status, busy } = useCapitalMain();
  const n = list.find(
    (x) =>
      x.spStart && x.r1Start && x.winnerAt && x.contractStart && twoMonths(x),
  );
  return (
    <Frame busy={busy} status={status}>
      <p className="truncate">
        {n ? (
          <>
            실제 공고: <a href={link(n)}>{n.name}</a>
          </>
        ) : (
          " "
        )}
      </p>
      <div className="mt-[0.5rlh]">
        {n ? (
          <Schedule n={n} today={todayYmd()} />
        ) : (
          <div className="invisible" aria-hidden>
            <MonthCalendar
              events={[{ start: "2026-01-01", end: "2026-02-01", label: " " }]}
            />
            <div
              className="mt-[1rlh]"
              style={{ height: `${SCHEDULE_ROWS}lh` }}
            />
          </div>
        )}
      </div>
    </Frame>
  );
}

/** 청약이 뭔가요: 가장 최근에 나온 수도권 본청약 3개. */
export function LatestNotices() {
  const { list, status, busy } = useCapitalMain();
  return (
    <Frame busy={busy} status={status}>
      <Rows
        items={list.slice(0, 3)}
        rows={3}
        render={(n) => (
          <span className="flex gap-4">
            <span className="meta shrink-0">
              {n.announcedAt.slice(5).replace("-", ".")}
            </span>
            <a href={link(n)} className="truncate">
              {n.name}
            </a>
          </span>
        )}
      />
    </Frame>
  );
}

/** 공공분양의 종류: 종류마다 가장 최근 수도권 본청약 하나. 나눔형·선택형은 1년에 몇 건이다(수도권 2025-10~2026-10: 나눔형 2, 선택형 3).
 *  없으면 없다고 적고, 줄 수는 늘 넷이다. */
const PUBLIC_KINDS = ["일반형", "나눔형", "선택형", "신혼희망타운"] as const;
const publicKind = (n: Notice) =>
  n.kind === "신혼희망타운" ? "신혼희망타운" : (n.publicType ?? "일반형");
export function PublicTypesNow() {
  const { list, status, busy } = useCapitalMain();
  const pub = list.filter((n) => n.publicHousing);
  return (
    <Frame busy={busy} status={status}>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4">
        {PUBLIC_KINDS.map((k) => {
          const n = pub.find((x) => publicKind(x) === k);
          return (
            <div key={k} className="contents">
              <dt className="font-bold">{k}</dt>
              <dd className="truncate">
                {status ? (
                  " "
                ) : n ? (
                  <a href={link(n)}>{n.name}</a>
                ) : (
                  <span className="text-muted-foreground">최근 1년엔 없음</span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </Frame>
  );
}
