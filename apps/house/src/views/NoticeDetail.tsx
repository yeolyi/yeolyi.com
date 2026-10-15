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
import { clsx } from "clsx";
import { ArrowLeft } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { Facts } from "../components/Facts.tsx";
import { IncomeBar } from "../components/IncomeBar.tsx";
import { MapLinks } from "../components/MapLinks.tsx";
import { Mark } from "../components/Mark.tsx";
import { NoticeGuides } from "../components/NoticeGuides.tsx";
import { Schedule } from "../components/Schedule.tsx";
import { useNotice } from "../data.ts";
import { ic } from "../util.ts";
import { isFresh } from "./Settings.tsx";

// 한 단짜리 글처럼: 목록으로 → 제목·성격 → 단지(기본 정보 + 주택형) → 넣을 수 있나(가구 판정 + 사람별 사다리) → 일정 → 관련 가이드.
// 아직 개인화하지 않았으면 "넣을 수 있나"는 개인화로 잇는 한 줄뿐이다.
export function NoticeDetail({ id, s }: { id: string; s: Settings }) {
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
    [
      "공고문",
      n.url ? (
        <a href={n.url} target="_blank" rel="noreferrer">
          청약홈에서 보기
        </a>
      ) : undefined,
    ],
  ];

  return (
    <article>
      {back}
      <h1 className="mt-[1rlh]">{n.name}</h1>
      <div className="mt-[0.25rlh]">
        <Facts n={n} />
      </div>
      <dl className="mt-[1rlh] grid grid-cols-[max-content_1fr] gap-x-4">
        {info
          .filter(([, val]) => val)
          .map(([k, val]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd>{val}</dd>
            </div>
          ))}
      </dl>

      {n.units && n.units.length > 0 && (
        <div className="mt-[1rlh]">
          <Units n={n} />
        </div>
      )}

      <Section title="넣을 수 있나">
        {fresh ? (
          <p>
            <a href="/settings">개인화</a>하면 이 공고에 넣을 수 있는지, 넣으면
            어느 소득 구간에 드는지 계산합니다.
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
                  <span className="text-muted-foreground">{c.detail}</span>
                </li>
              ))}
            </ul>
            <div className="mt-[1rlh]">
              <People n={n} v={v} s={s} today={today} />
            </div>
            <p className="text-muted-foreground mt-[1rlh] text-base">
              개인화에 넣은 답으로 계산한 참고용입니다. 자격은 공고문으로
              확인하세요.
            </p>
          </>
        )}
      </Section>

      <Section title="일정">
        <Schedule n={n} today={today} fixedWeeks={false} />
      </Section>

      <Section title="관련 가이드">
        <NoticeGuides n={n} v={v} />
      </Section>
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-[2rlh]">
      <h2 className="mb-[0.5rlh]">{title}</h2>
      {children}
    </section>
  );
}

/** 사람별 사다리. 특공은 가구에서 한 명만 넣으니 추천된 사람에게만 펼친다. */
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
  const applicant = w.people.find((f) => f.special)?.person.name;
  // 무순위·임의공급은 통장·순위를 안 봐서 사람마다 다를 게 없다. 한 번만 보인다.
  if (!isMainRound(n)) {
    const filled = w.people.find((f) => personFilled(f.person));
    if (!filled)
      return (
        <p className="text-muted-foreground">
          정보가 없습니다. <a href="/settings">개인화</a>에서
          생년월일·주소·통장을 넣으면 계산합니다.
        </p>
      );
    return (
      <div className="space-y-[1rlh]">
        {w.blocked && <p className="font-bold">{w.blocked}</p>}
        {ladders(filled.person, n, v, s, today).map((l) => (
          <LadderView key={l.title} l={l} />
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-[1rlh]">
      {w.blocked && <p className="font-bold">{w.blocked}</p>}
      {w.people.map((f) => (
        <div key={f.person.name}>
          <h3>{f.person.name}</h3>
          {!personFilled(f.person) ? (
            <p className="text-muted-foreground">
              정보가 없습니다. <a href="/settings">개인화</a>에서
              생년월일·주소·통장을 넣으면 계산합니다.
            </p>
          ) : v.assetBlocked ? (
            <p className="text-muted-foreground">
              자산 기준에 걸려 이 공고엔 넣을 수 없습니다.
            </p>
          ) : (
            ladders(f.person, n, v, s, today).map((l) => {
              const isSpecial = l.title.startsWith("예비신혼");
              if (isSpecial && !f.special)
                return (
                  <p
                    key={l.title}
                    className="text-muted-foreground mt-[0.5rlh]"
                  >
                    {l.title}: 가구에서 한 명만 넣습니다.{" "}
                    {applicant
                      ? `추천은 ${applicant}.`
                      : "통장 조건이 되는 사람이 없습니다."}
                  </p>
                );
              return <LadderView key={l.title} l={l} recommended={isSpecial} />;
            })
          )}
        </div>
      ))}
    </div>
  );
}

/** 사다리 하나: 제목·물량, 전제, 줄(또는 소득 막대), 줄 안의 순서. */
function LadderView({ l, recommended }: { l: Ladder; recommended?: boolean }) {
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
