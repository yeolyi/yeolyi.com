import { classify } from "@shared/classify.ts";
import { todayYmd } from "@shared/dates.ts";
import { loanExampleMan, MONEY_EXAMPLE } from "@shared/rules.ts";
import type { Notice, Settings, Unit } from "@shared/types.ts";
import { unitLabel } from "@shared/units.ts";
import { judge } from "@shared/verdict.ts";
import Tabs from "@yeolyi/ui/Tabs";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { facts } from "../components/Facts.tsx";
import { KakaoMap } from "../components/KakaoMap.tsx";
import { MapLinks } from "../components/MapLinks.tsx";
import { MyEligibility } from "../components/MyEligibility.tsx";
import { Schedule } from "../components/Schedule.tsx";
import { useNotice } from "../data.ts";
import { ic, setQuery } from "../util.ts";
import { isFresh } from "./Settings.tsx";

// 목록으로 → 제목·공고문 링크 → 탭(공고 정보 | 뽑는 방식 | 내 자격 | 내 순위 | 일정). 한 번에 한 덩어리만 보이게 탭으로 나눈다.
// 고른 탭은 ?tab= 에. 기본은 늘 "공고 정보".
// 아직 개인화하지 않았으면 "내 자격"은 개인화로 잇는 한 줄뿐이다.
const TABS = ["complex", "explain", "eligibility", "rank", "schedule"] as const;
type Tab = (typeof TABS)[number];

export function NoticeDetail({
  id,
  s,
  query,
}: {
  id: string;
  s: Settings;
  query: URLSearchParams;
}) {
  const { notice: n, isPending } = useNotice(id);
  const today = todayYmd();
  // 거주·통장·무주택 기간 같은 자격은 입주자모집공고일 기준(주택공급에 관한 규칙). 공고일이 없으면 오늘로 어림한다.
  const asOf = n?.announcedAt || today;
  const back = (
    <a href="/" className="inline-flex items-center gap-1">
      <ArrowLeft {...ic} />
      공고 목록
    </a>
  );

  if (isPending) return <p className="meta">불러오는 중</p>;
  if (!n)
    return (
      <>
        {back}
        <p className="mt-[1rlh]">
          공고를 찾을 수 없습니다. 접수가 끝난 지 오래된 공고일 수 있습니다.
        </p>
      </>
    );
  const v = judge(n, s);
  const fresh = isFresh(s);
  const defaultTab: Tab = "complex";
  const asked = query.get("tab") as Tab | null;
  const tab: Tab = asked && TABS.includes(asked) ? asked : defaultTab;
  const price =
    v.maxPriceEok === undefined
      ? undefined
      : v.minPriceEok === v.maxPriceEok
        ? `${v.maxPriceEok}억`
        : `${v.minPriceEok}~${v.maxPriceEok}억`;
  const info: [string, ReactNode][] = [
    [
      "주소",
      n.address ? (
        <>
          {n.address} <MapLinks n={n} />
        </>
      ) : (
        <MapLinks n={n} />
      ),
    ],
    ["종류", facts(n).join(" · ")],
    ["사업주체", n.builder],
    ["세대", n.totalUnits ? `${n.totalUnits.toLocaleString()}세대` : undefined],
    // 주택형 표가 분양가를 주택형별로 보여 주면 여기선 뺀다.
    [
      "분양가",
      n.units?.some((u) => u.topPriceMan)
        ? undefined
        : price
          ? `${price}(주택형별 최고가)`
          : "공고문 참고",
    ],
  ];

  return (
    <article>
      {back}
      <h1 className="mt-[1rlh]">{n.name}</h1>
      {/* 공고문이 그 공고의 규칙 원본이라 제목 바로 아래에 둔다(지역·성격은 목록 한 줄과 공고 정보 탭에). */}
      {n.url && (
        <p className="mt-[0.25rlh]">
          <a href={n.url} target="_blank" rel="noreferrer">
            {n.source === "myhome" ? "마이홈" : "청약홈"}에서 공고문 보기
          </a>
        </p>
      )}
      {/* 공고마다 새로(다른 공고로 가면 고른 탭을 잇지 않는다). */}
      <Tabs
        key={n.id}
        className="mt-[1rlh]"
        aria-label="공고 내용"
        value={tab}
        onValueChange={(v) => setQuery("tab", v === defaultTab ? undefined : v)}
        items={[
          {
            value: "complex",
            label: "공고 정보",
            content: (
              <>
                {/* 지도가 맨 위(어디인지가 먼저), 그 아래 이름-값 표와 주택형 표가 한 묶음. */}
                {n.address && <KakaoMap address={n.address} />}
                <table className="mt-[1rlh] table first:mt-0">
                  <tbody>
                    {info
                      .filter(([, val]) => val)
                      .map(([k, val]) => (
                        <tr key={k}>
                          <th scope="row" className="w-[6rem]">
                            {k}
                          </th>
                          <td className="whitespace-normal">{val}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {n.units && n.units.length > 0 && (
                  <div className="mt-[1rlh]">
                    <Units n={n} />
                  </div>
                )}
              </>
            ),
          },
          {
            value: "explain",
            label: "뽑는 방식",
            content: (
              <MyEligibility n={n} v={v} s={s} asOf={asOf} part="explain" />
            ),
          },
          {
            value: "eligibility",
            label: "내 자격",
            content: fresh ? (
              <p>
                <a href="/settings">개인화</a>하면 우리 가구가 이 공고에 넣을 수
                있는지 보여 줍니다.
              </p>
            ) : (
              <>
                <MyEligibility
                  n={n}
                  v={v}
                  s={s}
                  asOf={asOf}
                  part="eligibility"
                />
                <p className="text-muted-foreground mt-[2rlh] text-base">
                  개인화에 넣은 답으로 계산한 참고용입니다. 자격은 공고문으로
                  확인하세요.
                </p>
              </>
            ),
          },
          {
            value: "rank",
            label: "내 순위",
            content: fresh ? (
              <p>
                <a href="/settings">개인화</a>하면 우리 가구가 이 공고에서 몇
                순위인지 보여 줍니다.
              </p>
            ) : (
              <>
                <MyEligibility n={n} v={v} s={s} asOf={asOf} part="rank" />
                <p className="text-muted-foreground mt-[2rlh] text-base">
                  개인화에 넣은 답으로 계산한 참고용입니다. 자격은 공고문으로
                  확인하세요.
                </p>
              </>
            ),
          },
          {
            value: "schedule",
            label: "일정",
            content: (
              <>
                <Schedule
                  n={n}
                  today={today}
                  fixedWeeks={false}
                  listAll={false}
                />
              </>
            ),
          },
        ]}
      />
    </article>
  );
}

type Col = { head: string; cell: (u: Unit) => string };

/** 주택형 표 하나. 값이 하나도 없는 칸은 그리지 않는다. */
function UnitTable({ units, all }: { units: Unit[]; all: Col[] }) {
  const cols = all.filter((c) => units.some((u) => c.cell(u)));
  if (!cols.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>주택형(전용)</th>
            {cols.map((c) => (
              <th key={c.head} className="text-right">
                {c.head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {units.map((u) => (
            <tr key={u.type}>
              <td>{unitLabel(u.type)}</td>
              {cols.map((c) => (
                <td key={c.head} className="text-right">
                  {c.cell(u)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 주택형은 표 둘로 나눈다. 세대 수(특공 종류별)와 돈. 한 표에 다 넣으면 좁은 화면에서 옆으로 밀어야 한다. */
function Units({ n }: { n: Notice }) {
  const units = n.units ?? [];
  const capped = classify(n).zone !== "수도권외";
  const count = (v: number | undefined) => (v ? String(v) : "");
  const seats: Col[] = [
    { head: "공급면적", cell: (u) => (u.area ? `${u.area.toFixed(1)}㎡` : "") },
    { head: "세대", cell: (u) => count(u.total) },
    { head: "특공", cell: (u) => count(u.special) },
    {
      head: "신혼",
      cell: (u) => count(n.kind === "신혼희망타운" ? u.special : u.newlywed),
    },
    { head: "생애최초", cell: (u) => count(u.firstHome) },
    { head: "신생아", cell: (u) => count(u.newborn) },
    { head: "다자녀", cell: (u) => count(u.multiChild) },
    { head: "노부모", cell: (u) => count(u.elderly) },
    { head: "청년", cell: (u) => count(u.young) },
  ];
  const money: Col[] = [
    {
      head: "최고 분양가",
      cell: (u) => (u.topPriceMan ? eok(u.topPriceMan) : ""),
    },
    {
      head: "계약금",
      cell: (u) =>
        u.topPriceMan
          ? MONEY_EXAMPLE.depositPct
              .map((pct) => eok((u.topPriceMan ?? 0) * (pct / 100)))
              .join("~")
          : "",
    },
    {
      head: "대출 뒤 내 돈",
      cell: (u) =>
        u.topPriceMan
          ? eok(u.topPriceMan - loanExampleMan(u.topPriceMan, capped))
          : "",
    },
  ];
  const priced = units.some((u) => u.topPriceMan);
  return (
    <>
      <UnitTable units={units} all={seats} />
      {priced && (
        <>
          <div className="mt-[1rlh]">
            <UnitTable units={units} all={money} />
          </div>
          <p className="text-muted-foreground mt-[0.5rlh] text-base">
            돈은 최고 분양가로 어림한 값이고 판정에는 쓰지 않습니다. 계약금은
            흔한 비율(10~20%)이라 공고문의 비율로 확인하세요. 대출 뒤 내 돈은
            분양가에서 대출 어림(생애최초 기준 LTV {MONEY_EXAMPLE.ltvPct}%
            {capped
              ? ", 수도권·규제지역 금액 상한 집값 15억 이하 6억·25억 이하 4억·그 위 2억 중 작은 쪽"
              : ", 금액 상한 없음"}
            , 2025년 10월 기준)을 뺀 값입니다. 실제 대출은 소득(DSR)과 그때의
            규제로 정해집니다.
          </p>
        </>
      )}
    </>
  );
}

const eok = (man: number) => `${(man / 10000).toFixed(2)}억`;
