import { addYears, fmtYears, yearsBetween } from "@shared/dates.ts";
import {
  account,
  earners,
  householdSize,
  incomePct,
  newlywedAllowed,
  personFilled,
  residency,
  who,
} from "@shared/eligibility.ts";
import {
  bonusPoints,
  homelessStart,
  incomeBaseMan,
  LOTTERY_HOMELESS_PCT,
  lotteryHomelessFirst,
  NEWLYWED_TIERS,
  PUBLIC_ASSET_CAP_EOK,
  PUBLIC_GENERAL,
  PUBLIC_RANK1_HOMELESS_YEARS,
  privatePointShare,
  RANK1_ACCOUNT,
  regionsOf,
  SPECIAL_ACCOUNT,
} from "@shared/rules.ts";
import { isMainRound } from "@shared/site.ts";
import type { Notice, Person, Settings } from "@shared/types.ts";
import { assetGated, type Verdict } from "@shared/verdict.ts";
import type { ReactNode } from "react";
import { StackBars } from "./GuideCharts.tsx";
import { TierChart } from "./GuideWidgets.tsx";
import { SupplyMap } from "./SupplyMap.tsx";

// 공고 상세의 "내 자격" 탭. 표나 ✓/✗ 대신 해설로: 이 공고는 어디에 속하고 → 어떻게 뽑고 → 당신은 이래서 → 이렇게 된다.
// 그림은 가이드의 차트(공급 지도, 소득 구간, 막대)를 그대로 쓴다. 답이 비어 계산할 수 없는 곳도 틀은 그리고,
// 그 자리에 "○○ 넣기" 링크를 둔다. 링크는 그 질문 하나만 고치고 이 공고(이 탭)로 돌아온다.

const P = ({ children }: { children: ReactNode }) => (
  <p className="mt-[1rlh] first:mt-0">{children}</p>
);
const H = ({ children }: { children: ReactNode }) => (
  <h3 className="mt-[2rlh]">{children}</h3>
);
const won = (man: number) =>
  man >= 10000
    ? `${Math.round(man / 1000) / 10}억 원`
    : `${Math.round(man).toLocaleString()}만 원`;
const seats = (total: number, pct: number) => Math.ceil((total * pct) / 100);
const exclusiveArea = (u: { type: string; area: number }) =>
  Number.parseFloat(u.type) || u.area / 1.3;
const 은는 = (name: string) => {
  const last = name.charCodeAt(name.length - 1) - 0xac00;
  return `${name}${last >= 0 && last < 11172 && last % 28 ? "은" : "는"}`;
};

export function MyEligibility({
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
  const back = `${location.pathname}?tab=eligibility`;
  const Fill = ({ step, children }: { step: string; children: ReactNode }) => (
    <a href={`/settings/${step}?back=${encodeURIComponent(back)}`}>
      {children}
    </a>
  );
  const sector = n.publicHousing ? "public" : "private";
  const units = n.units ?? [];
  const total = units.reduce((a, u) => a + u.total, 0);
  const special = units.reduce((a, u) => a + u.special, 0);
  const general = total - special;
  const t = v.tickets;
  const sidos = s.people.map((p) => p.sido).filter(Boolean);
  const regions = regionsOf(sidos);
  const kind =
    n.kind === "신혼희망타운"
      ? "신혼희망타운"
      : n.publicHousing
        ? `공공분양(${n.publicType ?? "일반형"})`
        : "민영 아파트";

  // ── 이 공고는 ──
  const intro = !isMainRound(n) ? (
    <P>
      {kind}의 {n.kind === "임의공급" ? "임의공급" : "무순위(잔여세대)"}입니다.
      본청약에서 남거나 취소된 집을 다시 팔아서, 통장과 순위 없이 추첨
      {n.kind === "임의공급" ? "이나 선착순" : ""}으로 뽑습니다. 무주택이어야
      하고, 넣을 수 있는 지역은 공고문이 정합니다.
    </P>
  ) : (
    <>
      <P>
        {kind} 본청약입니다.{" "}
        {total
          ? `${total}세대 가운데 특별공급이 ${special}세대, 일반공급이 ${general}세대입니다.`
          : "주택형별 세대 수는 공고문에 있습니다."}{" "}
        특별공급은 신혼부부처럼 정해진 사람에게 먼저 주는 몫이고, 일반공급은
        통장 순위로 뽑는 나머지입니다.
      </P>
      <SupplyMap at={[`${sector}-special`, `${sector}-general`]} />
    </>
  );

  // ── 넣을 수 있는 공고인가(지역·자산) ──
  const region = !sidos.length ? (
    <P>
      청약은 사는 곳의 권역 안 공고에만 넣을 수 있습니다.{" "}
      <Fill step="p0-home">사는 곳 넣기</Fill>를 하면 이 공고에 넣을 수 있는지
      알려 드립니다.
    </P>
  ) : (
    <P>
      청약은 사는 곳의 권역 안 공고에만 넣을 수 있습니다. 당신 가구는{" "}
      {s.people
        .filter((p) => p.sido)
        .map((p) => `${p.name}${p.sido ? `(${p.sido})` : ""}`)
        .join("·")}{" "}
      기준으로 {regions.map((r) => r.label).join("·")} 공고에 넣을 수 있고, 이
      공고는 {n.sido}
      {v.region === "in"
        ? "라 넣을 수 있습니다."
        : "라 넣을 수 없습니다. 혁신도시·산업단지 등 일부 지역은 예외라 공고문을 확인하세요."}
    </P>
  );
  const asset = assetGated(n) ? (
    <P>
      이 공고는 가구 총자산이 {PUBLIC_ASSET_CAP_EOK}억 이하여야 넣을 수
      있습니다.{" "}
      {s.totalAssetsEok === null ? (
        <>
          <Fill step="assets">총자산 넣기</Fill>를 하면 확인합니다.
        </>
      ) : v.assetBlocked ? (
        `당신 가구는 ${s.totalAssetsEok}억이라 넣을 수 없습니다.`
      ) : (
        `당신 가구는 ${s.totalAssetsEok}억이라 기준 안입니다.`
      )}
    </P>
  ) : null;

  if (v.region === "out" || v.assetBlocked)
    return (
      <div>
        {intro}
        <H>넣을 수 있는 공고인가요</H>
        {region}
        {asset}
      </div>
    );

  const w = who(n, v, s, today);
  const filled = s.people.filter(personFilled);
  const missingPeople = s.people.filter((p) => !personFilled(p));
  const personLink = (p: Person) => (
    <Fill step={`p${s.people.indexOf(p)}-birth`}>{p.name} 정보 넣기</Fill>
  );

  // ── 신혼부부 특별공급 ──
  const e = earners(s);
  const pct = incomePct(s);
  const tiers = NEWLYWED_TIERS[sector][e];
  const chartTiers = tiers.filter(
    (x, i) =>
      i === 0 || x.capPct === undefined || x.capPct !== tiers[i - 1]?.capPct,
  );
  const landing =
    pct === undefined
      ? -2
      : tiers.findIndex((x) => x.capPct === undefined || pct <= x.capPct);
  const land = tiers[landing];
  const size = householdSize(s);
  const incomeText =
    s.incomeMan === null
      ? ""
      : `가구 월소득 ${won(s.incomeMan)}은 ${size <= 3 ? "3인 이하" : `${size}인`} 가구 기준 ${won(incomeBaseMan(size))}의 ${pct}%`;
  const applicant = w.people.find((f) => f.special)?.person;
  const newlywed =
    isMainRound(n) && t.newlywed > 0 ? (
      <>
        <H>신혼부부 특별공급 · {t.newlywed}세대</H>
        <P>
          가구 소득으로 우선·일반·추첨 구간을 나눠 뽑습니다. 소득이 낮을수록 앞
          구간에서 시작하고, 떨어지면 다음 구간으로 내려가 다시 경쟁합니다.
          가구에서 한 명만 넣을 수 있습니다.
        </P>
        <TierChart
          rows={[
            {
              label: `${n.publicHousing ? "공공" : "민영"} ${e}`,
              맞벌이: chartTiers,
              외벌이: chartTiers,
            },
          ]}
          marker={
            pct === undefined ? undefined : { pct, label: `우리 가구 ${pct}%` }
          }
          caption={`이 공고의 신혼부부 ${t.newlywed}세대를 나누면 ${chartTiers.map((x) => `${x.label} 약 ${seats(t.newlywed, x.sharePct)}세대`).join(", ")}입니다. 막대 아래 숫자는 도시근로자 월평균소득 대비 % 경계${pct === undefined ? "" : ", 세로선이 우리 가구 소득"}입니다.`}
        />
        {!newlywedAllowed(n, s) ? (
          <P>
            민영 신혼부부 특별공급은 혼인신고를 해야 넣을 수 있어 지금은 넣을 수
            없습니다. 이미 했다면 <Fill step="married">혼인신고일 넣기</Fill>를
            해 주세요.
          </P>
        ) : (
          <>
            <P>
              {pct === undefined ? (
                <>
                  어느 구간에서 시작하는지는 가구 월소득으로 정해집니다.{" "}
                  <Fill step="income">월소득 넣기</Fill>를 하면 알려 드립니다.
                </>
              ) : !land ? (
                `${incomeText}라, ${e} 상한 ${tiers.at(-1)?.capPct}%를 넘어 넣을 수 없습니다.`
              ) : (
                `${incomeText}라 ${land.label} 구간(약 ${seats(t.newlywed, land.sharePct)}세대)에서 먼저 경쟁합니다.${
                  landing < tiers.length - 1
                    ? ` 떨어지면 ${tiers
                        .slice(landing + 1)
                        .map((x) => x.label)
                        .join(", ")} 구간으로 내려갑니다.`
                    : ""
                }`
              )}
              {s.people.length > 1 && s.dualIncome === null && (
                <>
                  {" "}
                  지금은 맞벌이로 보고 계산했습니다.{" "}
                  <Fill step="dualincome">맞벌이 여부 넣기</Fill>를 하면 경계가
                  정확해집니다.
                </>
              )}
            </P>
            <P>
              {applicant
                ? `${은는(applicant.name)} 통장 조건(가입 6개월·${n.publicHousing ? `${SPECIAL_ACCOUNT.count}회` : `예치금 ${RANK1_ACCOUNT.privateDepositMan}만 원`})을 갖췄고${residency(applicant, n, today).localOk ? `, ${applicant.sigungu}에 살아 해당지역으로 먼저 뽑히니` : ""} 신청자로 가장 낫습니다.`
                : filled.length
                  ? `특별공급 통장 조건(가입 6개월·${n.publicHousing ? `${SPECIAL_ACCOUNT.count}회` : `예치금 ${RANK1_ACCOUNT.privateDepositMan}만 원`})을 갖춘 사람이 없어 지금은 넣을 수 없습니다.`
                  : null}{" "}
              같은 구간 안에서는{" "}
              {n.publicHousing
                ? "자녀가 있는 부부·한부모가족이 먼저이고, 우선 구간은 그다음 배점 점수 순, 일반 구간은 추첨입니다."
                : "혼인 중 자녀가 있는 가구가 먼저(1순위)이고, 그다음 해당지역 거주자, 자녀 수, 추첨 순입니다."}{" "}
              {s.children > 0
                ? `우리 가구는 자녀가 ${s.children}명이라 앞쪽입니다.`
                : "우리 가구는 자녀가 없어 자녀 있는 가구 다음 순서입니다."}
            </P>
          </>
        )}
      </>
    ) : null;

  // ── 일반공급 ──
  const bands = [
    ...new Set(
      units
        .map(exclusiveArea)
        .filter((a) => a > 0)
        .map((a) => (a <= 60 ? 60 : a <= 85 ? 85 : 999)),
    ),
  ].sort((a, b) => a - b);
  const bandLabel = (b: number) =>
    b === 60 ? "60㎡ 이하" : b === 85 ? "60~85㎡" : "85㎡ 초과";
  const shareRows = bands.flatMap((b) => {
    const share = privatePointShare(
      b === 60 ? 59 : b === 85 ? 84 : 100,
      !!n.regulated,
    );
    return share === "공고"
      ? []
      : [{ label: bandLabel(b), values: [share, 100 - share] }];
  });
  const announced = bands.filter(
    (b) =>
      privatePointShare(b === 60 ? 59 : b === 85 ? 84 : 100, !!n.regulated) ===
      "공고",
  );

  const personGeneral = (p: Person) => {
    const a = account(p, n, today);
    if (!a.rank1) {
      const left =
        a.years < RANK1_ACCOUNT.years
          ? ` 가입 ${RANK1_ACCOUNT.years}년이 ${addYears(p.accountOpenedAt, RANK1_ACCOUNT.years)}에 찹니다.`
          : "";
      return `${은는(p.name)} ${a.rank1Why === "세대주가 아님" ? "세대주가 아니라" : "통장 조건이 모자라"} 1순위가 아닙니다.${left} 1순위에서 다 차면 기회가 없습니다.`;
    }
    if (!n.publicHousing) {
      const b = bonusPoints({
        birth: p.birth,
        marriedAt: s.marriedAt,
        today,
        accountYears: a.years,
      });
      return `${은는(p.name)} 1순위이고, 가점은 ${b.total}점(무주택 ${b.homeless} · 부양가족 ${b.dependents} · 통장 ${b.account})입니다. 가점제에서 점수 높은 사람과 먼저 겨루고, 떨어지면 추첨제로 넘어갑니다.`;
    }
    const start = homelessStart({ birth: p.birth, marriedAt: s.marriedAt });
    const yrs = start.date <= today ? yearsBetween(start.date, today) : 0;
    return yrs >= PUBLIC_RANK1_HOMELESS_YEARS
      ? `${은는(p.name)} 1순위이고 무주택 ${fmtYears(yrs)}이라 순서 몫의 1순차입니다. 그 안에서는 저축총액(지금 ${p.accountPaidMan.toLocaleString()}만 원, 한 달 25만 원까지 인정) 순입니다.`
      : `${은는(p.name)} 1순위지만 무주택 기간이 ${start.from}부터라 3년이 안 돼(${addYears(start.date, PUBLIC_RANK1_HOMELESS_YEARS)}부터 1순차) 순서 몫에서 뒤입니다. 실제 기회는 추첨 ${PUBLIC_GENERAL.lotterySharePct}%입니다.`;
  };
  const generalPart = isMainRound(n) ? (
    <>
      <H>일반공급{general > 0 ? ` · ${general}세대` : ""}</H>
      {n.publicHousing ? (
        <>
          <P>
            공공분양 일반공급은 점수 대신 물량을 셋으로 나눠 뽑습니다. 2세 미만
            자녀가 있는 가구에 먼저 절반, 그다음 1순위끼리 무주택 3년
            이상·저축총액 순으로 30%, 나머지 20%는 추첨이고, 앞 몫에서 떨어지면
            다음 몫으로 내려갑니다.
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
                ? `이 공고의 일반공급 ${general}세대로 치면 약 ${seats(general, 50)} · ${seats(general, 30)} · ${seats(general, 20)}세대입니다.`
                : undefined
            }
          />
        </>
      ) : (
        <>
          <P>
            민영 일반공급은 1순위 안에서 가점제와 추첨제로 나눠 뽑습니다.
            1순위로 한 번 접수하면 가점제로 먼저 뽑고, 떨어지면 추첨제로
            넘어갑니다.
            {lotteryHomelessFirst(n.sido, !!n.regulated) &&
              ` 추첨 물량의 ${LOTTERY_HOMELESS_PCT}%는 집이 없는 사람에게 먼저 돌아갑니다.`}
          </P>
          {shareRows.length > 0 && (
            <StackBars
              names={["가점제", "추첨제"]}
              rows={shareRows}
              caption="이 공고의 주택형 면적대별 몫(전용면적 기준)입니다."
            />
          )}
          {announced.length > 0 && (
            <P>
              {announced.map(bandLabel).join("·")} 주택형의 가점제 몫은{" "}
              {n.regulated ? "" : "투기과열지구가 아니라 "}
              시·군·구가 정해 공고합니다
              {announced.includes(999) ? "(85㎡ 초과는 모두 추첨)" : ""}.
              공고문을 확인하세요.
            </P>
          )}
        </>
      )}
      <P>
        {filled.map((p) => personGeneral(p)).join(" ")}
        {missingPeople.length > 0 && (
          <>
            {" "}
            {missingPeople.map((p, i) => (
              <span key={p.name}>
                {i > 0 && " "}
                {personLink(p)}를 하면 {p.name}의 순위도 알려 드립니다.
              </span>
            ))}
          </>
        )}
      </P>
    </>
  ) : (
    <>
      <H>우리 가구는</H>
      <P>
        {filled.length
          ? "통장과 순위를 보지 않으니, 무주택이고 공고문이 정한 지역에 살면 넣을 수 있습니다."
          : missingPeople.map((p) => (
              <span key={p.name}>{personLink(p)}를 하면 알려 드립니다. </span>
            ))}
      </P>
    </>
  );

  // ── 판정하지 않는 특별공급 ──
  const others = [
    t.firstHome > 0 && ["생애최초", t.firstHome, "first-home"],
    t.newborn > 0 && ["신생아", t.newborn, "newborn"],
    t.young > 0 && ["청년", t.young, "other-special"],
  ].filter(Boolean) as [string, number, string][];

  return (
    <div>
      {intro}
      <H>넣을 수 있는 공고인가요</H>
      {region}
      {asset}
      {newlywed}
      {generalPart}
      {isMainRound(n) && others.length > 0 && (
        <>
          <H>다른 특별공급</H>
          <P>
            이 공고에는{" "}
            {others.map(([label, k, slug], i) => (
              <span key={label}>
                {i > 0 && ", "}
                <a href={`/guide/${slug}`}>{label}</a> {k}세대
              </span>
            ))}
            도 있습니다. 아직 계산하지 않으니 가이드와 공고문으로 확인하세요.
          </P>
        </>
      )}
    </div>
  );
}
