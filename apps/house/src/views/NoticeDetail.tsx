import { todayYmd } from "@shared/dates.ts";
import type { Notice, Settings, Unit } from "@shared/types.ts";
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

// 목록으로 → 제목·성격 → 탭(공고 정보 | 내 자격 | 일정). 한 번에 한 덩어리만 보이게 탭으로 나눈다.
// 고른 탭은 ?tab= 에. 기본은 늘 "공고 정보".
// 아직 개인화하지 않았으면 "내 자격"은 개인화로 잇는 한 줄뿐이다.
const TABS = ["complex", "eligibility", "schedule"] as const;
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
            청약홈에서 공고문 보기
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
                {/* 이름-값 두 칸 표. 아래 주택형 표와 같은 꼴이라 "단지" 한 묶음으로 읽힌다. */}
                <table className="table">
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

                {n.address && <KakaoMap address={n.address} />}
                {n.units && n.units.length > 0 && (
                  <div className="mt-[1rlh]">
                    <Units n={n} />
                  </div>
                )}
              </>
            ),
          },
          {
            value: "eligibility",
            label: "내 자격",
            content: fresh ? (
              <p>
                <a href="/settings">개인화</a>하면 이 공고가 우리 가구에 어떤지,
                어디서 어떻게 경쟁하는지 풀어 드립니다.
              </p>
            ) : (
              <>
                <MyEligibility n={n} v={v} s={s} today={today} />
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

/** 청약홈 주택형 "084.9100A" → "84.91㎡ A". 전용면적과 타입 글자. */
export const unitLabel = (type: string) => {
  const m = /^0*(\d+(?:\.\d+)?)(.*)$/.exec(type.trim());
  if (!m) return type;
  const [, num = "", rest = ""] = m;
  const area = Number.parseFloat(num);
  const suffix = rest.trim();
  return `${Number.isInteger(area) ? area : area.toFixed(2).replace(/0$/, "")}㎡${suffix ? ` ${suffix}` : ""}`;
};

/** 주택형 표. 값이 하나도 없는 칸(공급면적, 특공 종류, 분양가)은 그리지 않는다. */
function Units({ n }: { n: Notice }) {
  const units = n.units ?? [];
  const all: { head: string; cell: (u: Unit) => string }[] = [
    { head: "공급면적", cell: (u) => (u.area ? `${u.area.toFixed(1)}㎡` : "") },
    { head: "세대", cell: (u) => (u.total ? String(u.total) : "") },
    { head: "특공", cell: (u) => (u.special ? String(u.special) : "") },
    {
      head: "신혼",
      cell: (u) =>
        String((n.kind === "신혼희망타운" ? u.special : u.newlywed) || ""),
    },
    { head: "생애최초", cell: (u) => (u.firstHome ? String(u.firstHome) : "") },
    { head: "신생아", cell: (u) => (u.newborn ? String(u.newborn) : "") },
    { head: "청년", cell: (u) => (u.young ? String(u.young) : "") },
    {
      head: "최고 분양가",
      cell: (u) =>
        u.topPriceMan ? `${(u.topPriceMan / 10000).toFixed(2)}억` : "",
    },
  ];
  const cols = all.filter((c) => units.some((u) => c.cell(u)));
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
