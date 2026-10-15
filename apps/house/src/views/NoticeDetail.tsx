import { checks } from "@shared/checks.ts";
import { todayYmd } from "@shared/dates.ts";
import {
  type Ladder,
  ladders,
  personFilled,
  who,
} from "@shared/eligibility.ts";
import { isMainRound } from "@shared/site.ts";
import type { Notice, Settings, Unit } from "@shared/types.ts";
import { judge, type Verdict } from "@shared/verdict.ts";
import { Details, Summary } from "@yeolyi/ui/Details";
import Tabs from "@yeolyi/ui/Tabs";
import { clsx } from "clsx";
import { ArrowLeft } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { facts } from "../components/Facts.tsx";
import { IncomeBar } from "../components/IncomeBar.tsx";
import { KakaoMap } from "../components/KakaoMap.tsx";
import { MapLinks } from "../components/MapLinks.tsx";
import { Mark } from "../components/Mark.tsx";
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
            content: (
              <>
                {fresh ? (
                  <p>
                    <a href="/settings">개인화</a>하면 이 공고에 넣을 수 있는지,
                    넣으면 어느 소득 구간에 드는지 계산합니다.
                  </p>
                ) : (
                  <>
                    <p className="font-bold">{verdictLine(v)}</p>
                    <ul className="mt-[0.5rlh]">
                      {checks(n, v, s).map((c) => (
                        <li
                          key={c.key}
                          className="flex flex-wrap items-baseline gap-x-2"
                        >
                          <Mark ok={c.ok} />
                          <span>{c.label}</span>
                          <span className={clsx(c.ok === false && "font-bold")}>
                            {c.value}
                          </span>
                          <span className="text-muted-foreground">
                            {c.detail}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {/* 가구 조건(권역·자산)에서 걸렸으면 사람별 표는 보이지 않는다. */}
                    {v.pass && (
                      <div className="mt-[1rlh]">
                        <People n={n} v={v} s={s} today={today} />
                      </div>
                    )}
                    <p className="text-muted-foreground mt-[1rlh] text-base">
                      개인화에 넣은 답으로 계산한 참고용입니다. 자격은
                      공고문으로 확인하세요.
                    </p>
                  </>
                )}
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

/** 판정 한 줄. 제외면 걸린 이유. */
function verdictLine(v: Verdict): string {
  if (v.status === "candidate") return "후보입니다.";
  if (v.region === "out")
    return "제외: 사는 곳의 권역 밖 공고입니다. 혁신도시·산업단지 등 일부 지역은 사는 곳과 상관없이 넣을 수 있어 공고문을 확인하세요.";
  return `제외: 총자산이 기준(${v.assetBlocked})을 넘습니다.`;
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

/** 사람별 사다리. 위에 공급 종류 × 사람의 한 단어 결론 표, 아래 공급 종류마다 접힌 근거.
 *  특공은 가구에서 한 명만 넣으니 추천된 사람 칸만 채운다. 무순위·임의공급은 사람마다 다를 게 없어 한 번만. */
function People({
  n,
  v,
  s,
  today,
}: {
  n: Notice;
  v: Verdict;
  s: Settings;
  today: string;
}) {
  const w = who(n, v, s, today);
  const filled = w.people.filter((f) => personFilled(f.person));
  if (!filled.length)
    return (
      <p className="text-muted-foreground">
        정보가 없습니다. <a href="/settings">개인화</a>에서 생년월일·주소·통장을
        넣으면 계산합니다.
      </p>
    );
  if (!isMainRound(n))
    return (
      <div className="space-y-[1rlh]">
        {w.blocked && <p className="font-bold">{w.blocked}</p>}
        {ladders(filled[0]!.person, n, v, s, today).map((l) => (
          <LadderView key={l.title} l={l} />
        ))}
      </div>
    );

  // 공급 종류(사다리 제목)마다 사람별 사다리를 모은다.
  const rows = new Map<
    string,
    { person: string; l: Ladder | null; note?: string }[]
  >();
  for (const f of w.people) {
    const ls = personFilled(f.person) ? ladders(f.person, n, v, s, today) : [];
    for (const l of ls) {
      const special = l.title.startsWith("예비신혼");
      const list = rows.get(l.title) ?? [];
      list.push(
        special && !f.special
          ? { person: f.person.name, l: null, note: "가구에서 한 명만" }
          : { person: f.person.name, l },
      );
      rows.set(l.title, list);
    }
  }
  const people = w.people.map((f) => f.person.name);
  return (
    <div>
      {w.blocked && <p className="font-bold">{w.blocked}</p>}
      <table className="table">
        <thead>
          <tr>
            <th />
            {people.map((name) => (
              <th key={name}>{name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...rows].map(([title, cells]) => (
            <tr key={title}>
              <th scope="row" className="whitespace-normal">
                {title}
              </th>
              {people.map((name) => {
                const c = cells.find((x) => x.person === name);
                const r = c?.l ? cellOf(c.l) : undefined;
                return (
                  <td key={name} className="whitespace-normal">
                    {r ? (
                      <span className="inline-flex items-baseline gap-1.5">
                        <Mark ok={r.ok} />
                        <span className={clsx(r.ok === false && "font-bold")}>
                          {r.text}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        {c?.note ??
                          (personFilled(
                            w.people.find((f) => f.person.name === name)!
                              .person,
                          )
                            ? "–"
                            : "정보 없음")}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-[1rlh] space-y-[0.5rlh]">
        {[...rows].map(([title, cells]) => (
          <Details key={title}>
            <Summary>{title} 근거</Summary>
            {cells
              .filter((c) => c.l)
              .map((c) => (
                <div key={c.person}>
                  {people.length > 1 && <p className="font-bold">{c.person}</p>}
                  <LadderView l={c.l!} hideTitle />
                </div>
              ))}
          </Details>
        ))}
      </div>
    </div>
  );
}

/** 표 한 칸의 결론. 전제를 못 넘으면 걸린 조건, 넘으면 들어가는 줄 이름. */
function cellOf(l: Ladder): { ok: boolean | null; text: string } {
  const failed = l.prerequisites.find((p) => p.ok === false);
  // 짧은 이유(통장 미달·세대주가 아님)가 있으면 그것, 아니면 걸린 조건 이름.
  if (failed)
    return {
      ok: false,
      text:
        failed.detail && failed.detail.length <= 12
          ? failed.detail
          : `${failed.label.split(":")[0]} 안 됨`,
    };
  const on = l.tiers.find((t) => t.on);
  if (!on)
    return {
      ok: null,
      text: l.tierNote ? l.tierNote.split(",")[0]! : "줄 모름",
    };
  return { ok: true, text: on.label };
}

/** 사다리 하나: 제목·물량, 전제, 줄(또는 소득 막대), 줄 안의 순서. */
function LadderView({
  l,
  recommended,
  hideTitle,
}: {
  l: Ladder;
  recommended?: boolean;
  /** 접기 제목이 이미 공급 종류를 말할 때. */
  hideTitle?: boolean;
}) {
  return (
    <div className="mt-[0.5rlh]">
      <p>
        <strong>{l.title}</strong>
        {recommended && " (추천)"}
        {l.supply && <span className="meta"> {l.supply}</span>}
      </p>
      <ul>
        {l.prerequisites.map((st) => (
          <StepLine key={st.label} st={st} />
        ))}
      </ul>
      <div className="mt-[0.25rlh]">
        {l.income ? (
          <IncomeBar scale={l.income} />
        ) : (
          <p>
            {l.tiers.map((t, i) => (
              <Fragment key={t.label}>
                {i > 0 && <span className="text-muted-foreground"> · </span>}
                <span className={t.on ? "font-bold" : "text-muted-foreground"}>
                  {t.label}
                </span>
              </Fragment>
            ))}
            {l.tierNote && (
              <span className="text-muted-foreground"> {l.tierNote}</span>
            )}
          </p>
        )}
      </div>
      {l.within.length > 0 && (
        <ul className="mt-[0.25rlh]">
          {l.within.map((st) => (
            <StepLine key={st.label} st={st} />
          ))}
        </ul>
      )}
    </div>
  );
}

function StepLine({
  st,
}: {
  st: { ok: boolean | null; label: string; detail?: string };
}) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-2">
      <Mark ok={st.ok} neutral="·" />
      <span>{st.label}</span>
      {st.detail && (
        <span
          className={clsx(
            st.ok === false ? "font-bold" : "text-muted-foreground",
          )}
        >
          {st.detail}
        </span>
      )}
    </li>
  );
}
