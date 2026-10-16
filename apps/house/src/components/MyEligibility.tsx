import { classify, isRegulatedZone } from "@shared/classify.ts";
import { addYears, fmtYears, yearsBetween } from "@shared/dates.ts";
import {
  account,
  earners,
  householdSize,
  incomeBonusPct,
  incomePct,
  newlywedAllowed,
  newlywedCheck,
  newlywedStage,
  newlywedTiersFor,
  personFilled,
  residency,
  stagedNewlywed,
  who,
} from "@shared/eligibility.ts";
import {
  type Check,
  homelessCheck,
  noRankChecks,
  rank1Checks,
  specialAccountChecks,
} from "@shared/requirements.ts";
import {
  bonusPoints,
  homelessStart,
  INCOME_BASE_YEAR,
  incomeBaseMan,
  LOTTERY_HOMELESS_PCT,
  lotteryHomelessFirst,
  PUBLIC_ASSET_CAP_EOK,
  PUBLIC_GENERAL,
  PUBLIC_RANK1_HOMELESS_YEARS,
  privatePointShare,
  regionsOf,
} from "@shared/rules.ts";
import { isMainRound } from "@shared/site.ts";
import {
  landingOf,
  planOk,
  type SpecialPlan,
  specialsOf,
} from "@shared/specials.ts";
import type { Notice, Person, Settings } from "@shared/types.ts";
import { assetGated, type Verdict } from "@shared/verdict.ts";
import { clsx } from "clsx";
import { sumBy, uniq } from "es-toolkit";
import { Check as Check2, CircleHelp, X } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { ic } from "../util.ts";
import { StackBars } from "./GuideCharts.tsx";
import { TierChart } from "./GuideWidgets.tsx";
import { SupplyMap } from "./SupplyMap.tsx";

// 공고 상세의 "내 자격" 탭. 청약 설명(이 공고·뽑는 방식) → 내 자격(넣을 수 있나, 체크리스트) → 내 순위(넣으면 어디쯤).
// 그림은 가이드 차트를 그대로 쓴다. 답이 비어 계산할 수 없는 줄도 틀은 남기고 "○○ 넣기" 링크를 둔다
// (그 질문 하나만 고치고 이 탭으로 돌아온다).

type Ok = boolean | null; // null: 답이 비어 모름
const P = ({ children }: { children: ReactNode }) => (
  <p className="mt-[1rlh] first:mt-0">{children}</p>
);
const H3 = ({ children }: { children: ReactNode }) => (
  <h3 className="mt-[1.5rlh] first:mt-0">{children}</h3>
);
const won = (man: number) =>
  man >= 10000
    ? `${Math.round(man / 1000) / 10}억 원`
    : `${Math.round(man).toLocaleString()}만 원`;
const seats = (total: number, pct: number) => Math.ceil((total * pct) / 100);
const exclusiveArea = (u: { type: string; area: number }) =>
  Number.parseFloat(u.type) || u.area / 1.3;

/** 체크리스트 한 줄: 아이콘 · 조건 · 우리 값(못 넘으면 조건을 굵게). */
function Item({
  ok,
  label,
  children,
}: {
  ok: Ok;
  label: ReactNode;
  children?: ReactNode;
}) {
  const Icon = ok === null ? CircleHelp : ok ? Check2 : X;
  return (
    <li className="flex gap-2">
      <Icon
        {...ic}
        aria-hidden={false}
        role="img"
        aria-label={ok === null ? "모름" : ok ? "됨" : "안 됨"}
        className={clsx(
          "mt-[0.2em] shrink-0",
          ok === null && "text-muted-foreground",
        )}
      />
      <span>
        <span className={clsx(ok === false && "font-bold")}>{label}</span>
        {children && <span className="text-muted-foreground"> {children}</span>}
      </span>
    </li>
  );
}
/** 내 자격 표: 요구 조건 | 우리 상태 | 결과. 결과는 아이콘 + 글자(색 없이도 읽히게). */
const CheckTable = ({ children }: { children: ReactNode }) => (
  <table className="mt-[0.5rlh] table first:mt-0">
    <thead>
      <tr>
        <th>요구 조건</th>
        <th>우리 상태</th>
        <th className="w-[6.5rem]">결과</th>
      </tr>
    </thead>
    <tbody>{children}</tbody>
  </table>
);
type Req = Check;
/** 표 한 줄: 요구 조건 | 우리 상태(비었으면 넣으러 가는 링크) | 결과. 결과는 아이콘 + 글자(색 없이도 읽히게). */
function CheckRow({
  c,
  Fill,
  linkEvenIfKnown,
}: {
  c: Req;
  Fill: (p: { step: string; children: ReactNode }) => ReactNode;
  linkEvenIfKnown?: boolean;
}) {
  const ok = c.ok;
  const Icon = ok === null ? CircleHelp : ok ? Check2 : X;
  return (
    <tr>
      <td className="whitespace-normal">
        <span className={clsx(ok === false && "font-bold")}>{c.label}</span>
        {/* 근거 조문. 판정이 어디서 왔는지 바로 확인할 수 있게 */}
        {c.law && (
          <span className="text-muted-foreground block text-sm">{c.law}</span>
        )}
      </td>
      <td className="text-muted-foreground whitespace-normal">
        {c.mine}
        {c.need && (ok === null || linkEvenIfKnown) && (
          <>
            {c.mine ? " · " : ""}
            <Fill step={c.need}>{c.mine ? "고치기" : "넣기"}</Fill>
          </>
        )}
      </td>
      <td>
        <span
          className={clsx(
            "inline-flex items-center gap-1.5",
            ok === null ? "text-muted-foreground" : ok === false && "font-bold",
          )}
        >
          <Icon {...ic} />
          {ok === null ? "모름" : ok ? "충족" : "미충족"}
        </span>
      </td>
    </tr>
  );
}
const List = ({ children }: { children: ReactNode }) => (
  <ul className="mt-[0.5rlh] space-y-[0.25rlh]">{children}</ul>
);

/** part: 공고 상세의 탭 하나 — 뽑는 방식(explain) · 내 자격(eligibility) · 내 순위(rank). 재료는 같이 계산한다. */
export function MyEligibility({
  n,
  v,
  s,
  today,
  part,
}: {
  n: Notice;
  v: Verdict;
  s: Settings;
  today: string;
  part: "explain" | "eligibility" | "rank";
}) {
  const back = `${location.pathname}?tab=${part}`;
  const Fill = ({ step, children }: { step: string; children: ReactNode }) => (
    <a href={`/settings/${step}?back=${encodeURIComponent(back)}`}>
      {children}
    </a>
  );
  const main = isMainRound(n);
  const sector = n.publicHousing ? "public" : "private";
  const units = n.units ?? [];
  const total = sumBy(units, (u) => u.total);
  const special = sumBy(units, (u) => u.special);
  const general = total - special;
  const t = v.tickets;
  const cls = classify(n);
  // 분양전환 공공임대는 입주 자격이 다른 체계라 판정하지 않는다. 신혼희망타운은 일반공급이 없다(별표 6의3).
  const rental = cls.supply === "공공임대";
  const hope = n.kind === "신혼희망타운";
  const staged = stagedNewlywed(n);
  const kind = rental
    ? "분양전환 공공임대"
    : hope || /신혼희망타운/.test(n.name)
      ? "신혼희망타운"
      : n.publicHousing
        ? `공공분양(${n.publicType ?? "일반형"})`
        : "민영 아파트";
  const people = s.people;
  const filled = people.filter(personFilled);
  const personStep = (p: Person) => `p${people.indexOf(p)}-birth`;

  // 신혼부부 특공의 재료
  const e = earners(s);
  const pct = incomePct(s, n);
  const bonus = incomeBonusPct(n, s);
  // 소득 기준표는 2026년 것만 있다. 다른 해 공고는 그해 표가 기준이라 순위 탭에서 우리 자리를 그리지 않는다.
  const thisYearTable = n.announcedAt.startsWith(String(INCOME_BASE_YEAR));
  const rankPct = thisYearTable ? pct : undefined;
  const tiers = newlywedTiersFor(n, e);
  const chartTiers = tiers.filter(
    (x, i) =>
      i === 0 || x.capPct === undefined || x.capPct !== tiers[i - 1]?.capPct,
  );
  const chartRows = [
    {
      label: `${n.publicHousing ? "공공" : "민영"} ${e}`,
      맞벌이: chartTiers,
      외벌이: chartTiers,
    },
  ];
  const landing =
    rankPct === undefined
      ? -2
      : tiers.findIndex((x) => x.capPct === undefined || rankPct <= x.capPct);
  const land = tiers[landing];
  const size = householdSize(s);
  const w = who(n, v, s, today);
  const applicant = w.people.find((f) => f.special)?.person;
  const hasNewlywed = main && !rental && t.newlywed > 0;
  const hasGeneral = main && !rental && !hope;
  const stage = newlywedStage(n, s);
  // 신혼 말고 다른 특공(신생아·생애최초·다자녀·노부모·청년). 요건은 specials.ts
  const specials = main ? specialsOf(n, s, today) : [];
  /** 다른 특공의 소득 구간 막대(신혼과 같은 차트). 구간이 하나뿐이거나 소득을 안 보는 공급은 그리지 않는다. */
  const specialChart = (sp: SpecialPlan) => {
    const all = sp.rule?.tiers ?? [];
    if (all.length < 2 || !all.some((x) => x.capPct !== undefined)) return null;
    // 앞 구간과 상한이 같은 칸(공공 외벌이 추첨 등)은 막대에서 합친다
    const shown = all.filter(
      (x, i) =>
        i === 0 || x.capPct === undefined || x.capPct !== all[i - 1]?.capPct,
    );
    return (
      <TierChart
        rows={[
          {
            label: `${n.publicHousing ? "공공" : "민영"}${n.publicHousing ? ` ${e}` : ""}`,
            맞벌이: shown,
            외벌이: shown,
          },
        ]}
        caption={`${all.map((x) => `${x.label} 약 ${seats(sp.units, x.sharePct)}세대`).join(" · ")}. 막대 아래 숫자는 도시근로자 월평균소득 대비 % 경계.`}
      />
    );
  };

  // 일반공급 면적대
  const bands = uniq(
    units
      .map(exclusiveArea)
      .filter((a) => a > 0)
      .map((a) => (a <= 60 ? 60 : a <= 85 ? 85 : 999)),
  ).sort((a, b) => a - b);
  const bandLabel = (b: number) =>
    b === 60 ? "60㎡ 이하" : b === 85 ? "60~85㎡" : "85㎡ 초과";
  const shareOf = (b: number) =>
    privatePointShare(b === 60 ? 59 : b === 85 ? 84 : 100, classify(n).zone);
  const shareRows = bands.flatMap((b) => {
    const sh = shareOf(b);
    return sh === "공고"
      ? []
      : [{ label: bandLabel(b), values: [sh, 100 - sh] }];
  });
  const announced = bands.filter((b) => shareOf(b) === "공고");

  // ───────── 청약 설명 ─────────
  const explain = (
    <>
      {!main ? (
        <P>
          {cls.supply === "매각"
            ? "선착순 매각 공고입니다. 청약이 아니라서 통장·순위 없이 사업주체가 정한 방법으로 팝니다."
            : cls.supply === "LH잔여"
              ? `${kind}의 남은 집을 LH가 직접 파는 공고입니다. 자격과 뽑는 방법은 공고문이 정합니다.`
              : cls.supply === "재공급"
                ? `${kind}에서 불법행위로 계약이 취소된 집을 해당 시·군에 사는 무주택 세대주에게 다시 공급합니다.${(n.units ?? []).some((u) => u.special > 0) ? " 특별공급으로 나왔던 집은 그 특별공급 요건으로 다시 뽑습니다." : ""}`
                : `${kind}의 ${n.kind === "임의공급" ? "임의공급" : "무순위(잔여세대)"}입니다. 본청약에서 남거나 취소된 집을 통장과 순위 없이 추첨${n.kind === "임의공급" ? "이나 선착순" : ""}으로 다시 팝니다.`}
        </P>
      ) : rental ? (
        <P>
          {kind} 본청약입니다. 입주 자격이 분양과 다른 체계라 이 서비스는
          판정하지 않습니다. 공고문으로 확인하세요.
        </P>
      ) : (
        <>
          <P>
            {kind} 본청약입니다.{" "}
            {!total
              ? "세대 수는 공고문에 있습니다."
              : hope
                ? `${total}세대 모두 신혼부부·예비신혼부부·한부모가족 몫입니다.`
                : `${total}세대 중 특별공급 ${special}세대, 일반공급 ${general}세대.`}
          </P>
          <SupplyMap at={[`${sector}-special`, `${sector}-general`]} />
          {hasNewlywed && (
            <>
              <H3>신혼부부 특별공급 · {t.newlywed}세대</H3>
              {staged ? (
                <P>
                  혼인 2년 이내·2세 이하 자녀·예비신혼부부는 1단계(30%, 약{" "}
                  {seats(t.newlywed, 30)}세대), 혼인 2~7년·3~6세 자녀는
                  2단계(60%, 약 {seats(t.newlywed, 60)}세대)에서 소득{" "}
                  {tiers[0]?.capPct}% 이하끼리 점수 순으로 뽑고, 1단계에서
                  떨어지면 2단계로 넘어갑니다. 나머지(약 {seats(t.newlywed, 10)}
                  세대)는 추첨입니다. 가구에서 한 명만 넣습니다.
                </P>
              ) : (
                <P>
                  가구 소득으로 구간을 나눠 뽑고, 앞 구간에서 떨어지면 다음
                  구간으로 내려갑니다. 가구에서 한 명만 넣습니다.
                </P>
              )}
              <TierChart
                rows={chartRows}
                caption={`${chartTiers.map((x) => `${x.label} 약 ${seats(t.newlywed, x.sharePct)}세대`).join(" · ")}. 막대 아래 숫자는 도시근로자 월평균소득 대비 % 경계.`}
              />
            </>
          )}
          {specials.map((sp) => (
            <Fragment key={sp.key}>
              <H3>
                {sp.title} · {sp.units}세대
              </H3>
              <P>{sp.how}</P>
              {specialChart(sp)}
            </Fragment>
          ))}
          {!hasGeneral ? null : n.publicHousing ? (
            <>
              <H3>일반공급{general > 0 ? ` · ${general}세대` : ""}</H3>
              <P>
                2세 미만 자녀 가구 50% → 1순위 순서대로 30% → 추첨 20%. 앞
                몫에서 떨어지면 다음 몫으로 내려갑니다.
              </P>
              <StackBars
                names={["2세 미만 자녀 가구", "1순위 순서대로", "추첨"]}
                rows={[
                  {
                    label: "",
                    values: [
                      PUBLIC_GENERAL.childFirstSharePct,
                      PUBLIC_GENERAL.orderedSharePct,
                      PUBLIC_GENERAL.lotterySharePct,
                    ],
                  },
                ]}
                caption={
                  general > 0
                    ? `약 ${seats(general, 50)} · ${seats(general, 30)} · ${seats(general, 20)}세대.`
                    : undefined
                }
              />
            </>
          ) : (
            <>
              <H3>일반공급{general > 0 ? ` · ${general}세대` : ""}</H3>
              <P>
                1순위 안에서 가점제로 먼저 뽑고, 떨어지면 추첨제로 넘어갑니다.
                {lotteryHomelessFirst(n.sido, classify(n).zone) &&
                  ` 추첨 물량의 ${LOTTERY_HOMELESS_PCT}%는 무주택자 먼저.`}
              </P>
              {shareRows.length > 0 && (
                <StackBars
                  names={["가점제", "추첨제"]}
                  rows={shareRows}
                  caption="주택형 면적대별 몫(전용면적 기준)."
                />
              )}
              {announced.length > 0 && (
                <P>
                  {announced.map(bandLabel).join("·")}의 가점제 몫은 시·군·구가
                  공고합니다
                  {announced.includes(999) ? "(85㎡ 초과는 모두 추첨)" : ""}.
                </P>
              )}
            </>
          )}
        </>
      )}
    </>
  );

  // ───────── 내 자격 ─────────
  // 요건은 requirements.ts 의 표에서 나온다(공고 분류 × 사람 답). 여기서는 섹션으로 묶어 그리기만 한다.
  const sidos = people.map((p) => p.sido).filter(Boolean);
  const regions = regionsOf(sidos);
  const blocked = v.region === "out" || !!v.assetBlocked || !!v.notSubscription;
  const cap = tiers.at(-1)?.capPct;
  const local = sidos.length
    ? people.some((p) => personFilled(p) && residency(p, n, today).inCity)
    : null;
  const regionRow: Req = {
    id: "region",
    label:
      cls.supply === "본청약" || cls.supply === "공공임대"
        ? `지역: 사는 곳의 권역 안(${n.sido} 공고)`
        : cls.supply === "재공급"
          ? `지역: ${n.sido} 해당 시·군 거주`
          : "지역",
    law: cls.supply === "재공급" ? "규칙 제47조의3 ②" : "규칙 제4조 ③",
    ok:
      cls.supply === "본청약" ||
      cls.supply === "공공임대" ||
      cls.supply === "재공급"
        ? sidos.length
          ? v.region === "in"
          : null
        : true,
    mine: sidos.length
      ? cls.supply === "본청약" || cls.supply === "공공임대"
        ? `${regions.map((r) => r.label).join("·")} 거주 가구${v.region === "in" ? "" : " · 혁신도시 등 예외는 공고문 확인"}`
        : cls.supply === "재공급"
          ? local
            ? "해당 시·군 거주"
            : "해당 시·군 거주 안 함"
          : cls.supply === "무순위"
            ? "전국(거주 요건은 아래)"
            : "사업주체가 정함(공고문)"
      : "",
    need: "p0-home",
  };
  const assetRow: Req | undefined = assetGated(n)
    ? {
        id: "asset",
        label: `총자산 ${PUBLIC_ASSET_CAP_EOK}억 이하`,
        law: "공공주택 특별법 시행규칙 별표 6의6",
        ok: s.totalAssetsEok === null ? null : !v.assetBlocked,
        mine:
          s.totalAssetsEok === null ? "" : `우리 가구 ${s.totalAssetsEok}억`,
        need: "assets",
      }
    : undefined;
  // 사람별 요건에서 가구 단위(무주택·5년 내 당첨)는 따로 한 번만 보인다.
  const HOUSEHOLD_IDS = ["homeless", "nowin", "twohomes"];
  const personRows = (cs: Req[]) =>
    cs.filter((c) => !HOUSEHOLD_IDS.includes(c.id));
  const householdRows = (cs: Req[]) => {
    const seen = new Set<string>();
    return cs.filter(
      (c) => HOUSEHOLD_IDS.includes(c.id) && !seen.has(c.id) && seen.add(c.id),
    );
  };
  const filledPeople = people.filter(personFilled);
  const generalAll = filledPeople.flatMap((p) =>
    rank1Checks(p, people.indexOf(p), n, s, today),
  );
  const overIncome = pct !== undefined && cap !== undefined && pct > cap;
  const privateLotteryOnly =
    !n.publicHousing &&
    pct !== undefined &&
    landing >= 0 &&
    tiers[landing]?.capPct === undefined;

  // 공공 일반공급 소득(별표 6 1.가 2): 60㎡ 이하만, 별표 6의6 1.가 2): 나눔형·토지임대부는 면적과 상관없이) 100%, 맞벌이 200%
  const smallUnits = units.some((u) => exclusiveArea(u) <= 60);
  const generalCap = PUBLIC_GENERAL.smallAreaCapPct[e];
  const generalIncome: Req | undefined =
    n.publicHousing && (staged || smallUnits)
      ? {
          id: "general-income",
          label: `${staged ? "" : "60㎡ 이하 주택형: "}가구 소득 ${generalCap}% 이하(${e})`,
          law: staged
            ? "공공주택 특별법 시행규칙 별표 6의6 1.가"
            : "공공주택 특별법 시행규칙 별표 6 1.가",
          ok: pct === undefined || !thisYearTable ? null : pct <= generalCap,
          mine:
            pct === undefined
              ? ""
              : thisYearTable
                ? `우리 가구 ${pct}%`
                : `${n.announcedAt.slice(0, 4)}년 공고라 그해 공고문 기준표 확인`,
          need: "income",
        }
      : undefined;

  const missingPeopleRows = people
    .filter((p) => !personFilled(p))
    .map((p) => (
      <CheckRow
        key={`${p.name}-missing`}
        c={{
          id: "person",
          label: `${p.name}: 통장·주소`,
          law: "",
          ok: null,
          mine: "",
          need: personStep(p),
        }}
        Fill={Fill}
      />
    ));

  const eligibility = (
    <>
      {v.notSubscription ? (
        <CheckTable>
          <CheckRow
            c={{
              id: "sale",
              label: "청약 공고인가",
              law: "",
              ok: false,
              mine: "선착순 매각 공고(청약이 아님). 조건은 공고문",
            }}
            Fill={Fill}
          />
        </CheckTable>
      ) : (
        <CheckTable>
          <CheckRow c={regionRow} Fill={Fill} />
          {assetRow && <CheckRow c={assetRow} Fill={Fill} />}
          {main &&
            cls.housing === "국민" &&
            !generalAll.some((c) => c.id === "homeless") && (
              <CheckRow c={homelessCheck(s, "규칙 제4조 ①")} Fill={Fill} />
            )}
          {!main &&
            noRankChecks(n, s).map((c) => (
              <CheckRow key={c.id} c={c} Fill={Fill} />
            ))}
          {cls.supply === "모름" && (
            <CheckRow
              c={{
                id: "unknown",
                label: "처음 보는 공급 구분",
                law: "",
                ok: null,
                mine: "이 서비스가 아직 분류하지 못함 · 공고문 확인",
              }}
              Fill={Fill}
            />
          )}
          {cls.supply === "공공임대" && (
            <CheckRow
              c={{
                id: "rental",
                label: "공공임대 입주 자격",
                law: "공공주택 특별법 시행규칙",
                ok: null,
                mine: "이 서비스는 판정하지 않음 · 공고문 확인",
              }}
              Fill={Fill}
            />
          )}
        </CheckTable>
      )}
      {!blocked && hasNewlywed && (
        <>
          <H3>신혼부부 특별공급</H3>
          <CheckTable>
            {/* 혼인신고일이 비었으면 "아직 안 함"이라고 답한 것으로 본다. */}
            <CheckRow c={newlywedCheck(n, s)} Fill={Fill} linkEvenIfKnown />
            <CheckRow c={homelessCheck(s, "규칙 제41조 ①")} Fill={Fill} />
            {filledPeople.flatMap((p) =>
              personRows(
                specialAccountChecks(p, people.indexOf(p), n, today),
              ).map((c) => (
                <CheckRow
                  key={`${p.name}-${c.id}`}
                  c={{ ...c, label: `${p.name}: 특공 ${c.label}` }}
                  Fill={Fill}
                />
              )),
            )}
            {missingPeopleRows}
            <CheckRow
              c={{
                id: "income",
                label: cap
                  ? `가구 소득 ${cap}% 이하(${e})`
                  : "가구 소득(추첨 구간은 상한 없음)",
                law: newlywedCheck(n, s).law,
                // 소득 기준표는 2026년 것만 있다. 다른 해 공고는 그해 표가 기준이라 판정하지 않는다.
                ok: pct === undefined || !thisYearTable ? null : !overIncome,
                mine:
                  pct === undefined
                    ? ""
                    : thisYearTable
                      ? `우리 가구 ${pct}%${bonus ? `(2023.3.28 이후 출생 자녀 가산 ${bonus}%p 뺌)` : ""}`
                      : `${n.announcedAt.slice(0, 4)}년 공고라 그해 공고문 기준표 확인`,
                need: "income",
              }}
              Fill={Fill}
            />
            {privateLotteryOnly && (
              <CheckRow
                c={{
                  id: "realestate",
                  label: "추첨 구간: 가구 부동산 3.31억 이하",
                  law: "규칙 제41조 ②",
                  ok: s.realEstateEok === null ? null : s.realEstateEok <= 3.31,
                  mine: s.realEstateEok === null ? "" : `${s.realEstateEok}억`,
                  need: "realestate",
                }}
                Fill={Fill}
              />
            )}
          </CheckTable>
        </>
      )}
      {!blocked &&
        specials.map((sp) => (
          <Fragment key={sp.key}>
            <H3>{sp.title}</H3>
            <CheckTable>
              {sp.checks.map((c) => (
                <CheckRow key={c.id} c={c} Fill={Fill} />
              ))}
            </CheckTable>
          </Fragment>
        ))}
      {!blocked && hasGeneral && (
        <>
          <H3>일반공급 1순위</H3>
          <CheckTable>
            {householdRows(generalAll).map((c) => (
              <CheckRow key={c.id} c={c} Fill={Fill} />
            ))}
            {generalIncome && <CheckRow c={generalIncome} Fill={Fill} />}
            {filledPeople.flatMap((p) =>
              personRows(rank1Checks(p, people.indexOf(p), n, s, today)).map(
                (c) => (
                  <CheckRow
                    key={`${p.name}-${c.id}`}
                    c={{ ...c, label: `${p.name}: ${c.label}` }}
                    Fill={Fill}
                  />
                ),
              ),
            )}
            {missingPeopleRows}
          </CheckTable>
          <p className="text-muted-foreground mt-[0.5rlh] text-base">
            {cls.zone === "투기과열" || cls.zone === "청약과열"
              ? `${cls.zone === "투기과열" ? "투기과열지구" : "청약과열지역"}라 1순위가 엄격합니다(2년·세대주·5년 내 당첨 없음).`
              : `${cls.zone === "수도권" ? "수도권" : "수도권 밖"} 비규제 지역 기준입니다. 시·도가 기간을 늘렸으면 공고문의 기간이 기준입니다.`}{" "}
            1순위가 아니면 2순위로 넣을 수 있습니다.
          </p>
        </>
      )}
    </>
  );

  // ───────── 내 순위 ─────────
  // 같은 순차 안의 순서(제27조 ②): 40㎡ 초과는 저축총액, 40㎡ 이하는 납입 횟수가 많은 순
  const areas = units.map(exclusiveArea).filter((x) => x > 0);
  const orderBy = (p: Person) => {
    const paid = `저축총액 ${p.accountPaidMan.toLocaleString()}만 원 순`;
    const count = `납입 ${p.accountCount}회 순`;
    if (areas.length && areas.every((x) => x <= 40)) return count;
    if (areas.some((x) => x <= 40))
      return `40㎡ 초과는 ${paid}, 40㎡ 이하는 ${count}`;
    return paid;
  };
  const generalRank = (p: Person): ReactNode => {
    const a = account(p, n, today, s);
    if (!a.rank1)
      return (
        <Item key={p.name} ok={false} label={`${p.name}: 1순위 아님`}>
          1순위에서 다 차면 기회가 없습니다
        </Item>
      );
    // 국민주택 일반공급은 무주택 세대만(제4조 ① 1호)
    if (n.publicHousing && s.ownsHome === true)
      return (
        <Item key={p.name} ok={false} label={`${p.name}: 넣을 수 없음`}>
          공공분양 일반공급은 무주택 가구만 넣습니다
        </Item>
      );
    if (!n.publicHousing) {
      // 규제지역에서 집이 있는 세대는 가점제에서 빠지고 추첨제로만(제28조 ⑥). 2주택 이상이면 1순위도 아니다.
      if (s.ownsHome === true && isRegulatedZone(cls.zone))
        return (
          <Item key={p.name} ok={true} label={`${p.name}: 추첨제만`}>
            집이 있는 세대라 가점제에서 빠집니다(2주택 이상이면 1순위가 아님)
          </Item>
        );
      // 혼인신고를 했으면 배우자 통장 기간의 절반을 점수로 더한다(별표 1 비고 2)
      const spouse = people.find((q) => q !== p && q.accountOpenedAt);
      // 부양가족: 배우자·미성년 자녀·3년 이상 모신 부모(적어도 한 분)
      const deps = (s.marriedAt ? 1 : 0) + s.children + (s.elderParent ? 1 : 0);
      const b = bonusPoints({
        birth: p.birth,
        marriedAt: s.marriedAt,
        today,
        accountYears: a.years,
        spouseAccountYears: spouse
          ? yearsBetween(spouse.accountOpenedAt, today)
          : undefined,
        ownsHome: s.ownsHome,
        dependents: deps,
      });
      return (
        <Item key={p.name} ok={true} label={`${p.name}: 가점 ${b.total}점`}>
          {`무주택 ${b.homeless}${s.ownsHome ? "(집 있음)" : ""} · 부양가족 ${b.dependents}(${deps}명) · 통장 ${b.account}${b.spouse ? `(배우자 통장 ${b.spouse} 포함)` : ""}. 가점제에서 떨어지면 추첨제`}
        </Item>
      );
    }
    const start = homelessStart({ birth: p.birth, marriedAt: s.marriedAt });
    const yrs = start.date <= today ? yearsBetween(start.date, today) : 0;
    // 2세 미만 자녀 가구는 일반공급 50% 우선 몫에 먼저 들어간다(별표 6 1.나)
    if (s.newbornChild)
      return (
        <Item key={p.name} ok={true} label={`${p.name}: 2세 미만 자녀 우선 몫`}>
          {`일반공급의 ${PUBLIC_GENERAL.childFirstSharePct}%를 2세 미만 자녀 가구에 먼저. 떨어지면 순서 몫(무주택 ${fmtYears(yrs)})`}
        </Item>
      );
    return yrs >= PUBLIC_RANK1_HOMELESS_YEARS ? (
      <Item key={p.name} ok={true} label={`${p.name}: 순서 몫 1순차`}>
        {`무주택 ${fmtYears(yrs)} · ${orderBy(p)}`}
      </Item>
    ) : (
      <Item key={p.name} ok={false} label={`${p.name}: 순서 몫 2순차`}>
        {`무주택 3년이 ${addYears(start.date, PUBLIC_RANK1_HOMELESS_YEARS)}에 참. 실제 기회는 추첨 ${PUBLIC_GENERAL.lotterySharePct}%`}
      </Item>
    );
  };
  const applicantLocal = applicant
    ? residency(applicant, n, today).localOk
    : false;
  const rank = !blocked && main && !rental && (
    <>
      {hasNewlywed && newlywedAllowed(n, s) && s.ownsHome !== true && (
        <>
          <H3>신혼부부 특별공급</H3>
          {/* 소득을 안 넣었어도 구간 막대는 그린다(세로선만 없다). */}
          <TierChart
            rows={chartRows}
            marker={
              rankPct === undefined
                ? undefined
                : { pct: rankPct, label: `우리 가구 ${rankPct}%` }
            }
            caption={
              !thisYearTable
                ? `${n.announcedAt.slice(0, 4)}년 공고라 그해 공고문의 소득 기준표로 확인하세요.`
                : pct === undefined
                  ? "월소득을 넣으면 우리 가구 자리를 세로선으로 보여 드립니다."
                  : `세로선이 우리 가구 ${pct}%(월 ${won(s.incomeMan ?? 0)} ÷ ${size <= 3 ? "3인 이하" : `${size}인`} 가구 기준 ${won(incomeBaseMan(size))}).`
            }
          />
          <List>
            {staged && (
              <Item ok={true} label={`${stage}단계(${stage === 1 ? 30 : 60}%)`}>
                {stage === 1
                  ? "혼인 2년 이내·2세 이하 자녀·예비신혼부부. 떨어지면 2단계"
                  : "혼인 2~7년·3~6세 자녀"}
              </Item>
            )}
            <Item
              ok={rankPct === undefined ? null : !!land}
              label={land ? `${land.label} 구간에서 시작` : "시작 구간"}
            >
              {!thisYearTable ? (
                "그해 공고문 기준표 확인"
              ) : pct === undefined ? (
                <Fill step="income">월소득 넣기</Fill>
              ) : land ? (
                `약 ${seats(t.newlywed, land.sharePct)}세대${
                  landing < tiers.length - 1
                    ? `, 떨어지면 ${tiers
                        .slice(landing + 1)
                        .map((x) => x.label)
                        .join(" → ")}`
                    : ""
                }`
              ) : (
                "소득 상한을 넘음"
              )}
            </Item>
            <Item
              ok={applicant ? true : filled.length ? false : null}
              label={applicant ? `넣는 사람: ${applicant.name}` : "넣는 사람"}
            >
              {applicant
                ? "가구에서 한 명, 통장 조건을 갖춘 사람"
                : filled.length
                  ? "특공 통장 조건을 갖춘 사람이 없음"
                  : "정보를 넣으면 알려 드립니다"}
            </Item>
            <Item
              ok={s.children > 0}
              label={
                n.publicHousing
                  ? "자녀 있는 가구 먼저"
                  : "자녀 있는 가구 먼저(1순위)"
              }
            >
              {s.children > 0
                ? `자녀 ${s.children}명`
                : "자녀 없음, 그 다음 순서"}
            </Item>
            {!n.publicHousing && applicant && (
              <Item ok={applicantLocal} label="해당지역 거주자 먼저">
                {applicantLocal
                  ? `${applicant.sigungu} 거주`
                  : `${n.address?.split(" ").slice(0, 2).join(" ") ?? n.sido} 거주자 다음`}
              </Item>
            )}
          </List>
        </>
      )}
      {specials.map((sp) => {
        const rule = sp.rule;
        // 소득 구간이 없거나 이미 자격이 안 되는 특공은 순위를 따지지 않는다
        if (
          !rule?.tiers.some((x) => x.capPct !== undefined) ||
          planOk(sp.checks) === false
        )
          return null;
        const at = landingOf(rule, rankPct);
        const tier = rule.tiers[at];
        return (
          <Fragment key={sp.key}>
            <H3>{sp.title}</H3>
            <List>
              <Item
                ok={at < 0 ? null : !!tier}
                label={tier ? `${tier.label} 구간에서 시작` : "시작 구간"}
              >
                {!thisYearTable ? (
                  "그해 공고문 기준표 확인"
                ) : at < 0 ? (
                  <Fill step="income">월소득 넣기</Fill>
                ) : tier ? (
                  `약 ${seats(sp.units, tier.sharePct)}세대${
                    at < rule.tiers.length - 1
                      ? `, 떨어지면 ${rule.tiers
                          .slice(at + 1)
                          .map((x) => x.label)
                          .join(" → ")}`
                      : ""
                  }`
                ) : (
                  "소득 상한을 넘음"
                )}
              </Item>
            </List>
          </Fragment>
        );
      })}
      {hasGeneral && (
        <>
          <H3>일반공급</H3>
          <List>
            {people.map((p) =>
              personFilled(p) ? (
                generalRank(p)
              ) : (
                <Item key={p.name} ok={null} label={p.name}>
                  <Fill step={personStep(p)}>{p.name} 정보 넣기</Fill>
                </Item>
              ),
            )}
          </List>
        </>
      )}
    </>
  );

  if (part === "explain") return <div>{explain}</div>;
  if (part === "eligibility") return <div>{eligibility}</div>;
  return (
    <div>
      {rank || (
        <P>
          {blocked
            ? "넣을 수 없는 공고라 순위를 따지지 않습니다. 내 자격 탭을 보세요."
            : rental
              ? "공공임대는 이 서비스가 판정하지 않습니다. 공고문으로 확인하세요."
              : "무순위·임의공급은 순위 없이 추첨합니다."}
        </P>
      )}
    </div>
  );
}
