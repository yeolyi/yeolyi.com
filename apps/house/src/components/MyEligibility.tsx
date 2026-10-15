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
import { clsx } from "clsx";
import { Check, CircleHelp, X } from "lucide-react";
import type { ReactNode } from "react";
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
const H2 = ({ children }: { children: ReactNode }) => (
  <h2 className="mt-[2rlh] first:mt-0">{children}</h2>
);
const H3 = ({ children }: { children: ReactNode }) => (
  <h3 className="mt-[1.5rlh]">{children}</h3>
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
  const Icon = ok === null ? CircleHelp : ok ? Check : X;
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
const List = ({ children }: { children: ReactNode }) => (
  <ul className="mt-[0.5rlh] space-y-[0.25rlh]">{children}</ul>
);

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
  const main = isMainRound(n);
  const sector = n.publicHousing ? "public" : "private";
  const units = n.units ?? [];
  const total = units.reduce((a, u) => a + u.total, 0);
  const special = units.reduce((a, u) => a + u.special, 0);
  const general = total - special;
  const t = v.tickets;
  const kind =
    n.kind === "신혼희망타운"
      ? "신혼희망타운"
      : n.publicHousing
        ? `공공분양(${n.publicType ?? "일반형"})`
        : "민영 아파트";
  const people = s.people;
  const filled = people.filter(personFilled);
  const personStep = (p: Person) => `p${people.indexOf(p)}-birth`;

  // 신혼부부 특공의 재료
  const e = earners(s);
  const pct = incomePct(s);
  const tiers = NEWLYWED_TIERS[sector][e];
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
    pct === undefined
      ? -2
      : tiers.findIndex((x) => x.capPct === undefined || pct <= x.capPct);
  const land = tiers[landing];
  const size = householdSize(s);
  const w = who(n, v, s, today);
  const applicant = w.people.find((f) => f.special)?.person;
  const hasNewlywed = main && t.newlywed > 0;

  // 일반공급 면적대
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
  const shareOf = (b: number) =>
    privatePointShare(b === 60 ? 59 : b === 85 ? 84 : 100, !!n.regulated);
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
      <H2>청약 설명</H2>
      {!main ? (
        <P>
          {kind}의 {n.kind === "임의공급" ? "임의공급" : "무순위(잔여세대)"}
          입니다. 본청약에서 남거나 취소된 집을 통장과 순위 없이 추첨
          {n.kind === "임의공급" ? "이나 선착순" : ""}으로 다시 팝니다.
        </P>
      ) : (
        <>
          <P>
            {kind} 본청약입니다.{" "}
            {total
              ? `${total}세대 중 특별공급 ${special}세대, 일반공급 ${general}세대.`
              : "세대 수는 공고문에 있습니다."}
          </P>
          <SupplyMap at={[`${sector}-special`, `${sector}-general`]} />
          {hasNewlywed && (
            <>
              <H3>신혼부부 특별공급 · {t.newlywed}세대</H3>
              <P>
                가구 소득으로 구간을 나눠 뽑고, 앞 구간에서 떨어지면 다음
                구간으로 내려갑니다. 가구에서 한 명만 넣습니다.
              </P>
              <TierChart
                rows={chartRows}
                caption={`${chartTiers.map((x) => `${x.label} 약 ${seats(t.newlywed, x.sharePct)}세대`).join(" · ")}. 막대 아래 숫자는 도시근로자 월평균소득 대비 % 경계.`}
              />
            </>
          )}
          <H3>일반공급{general > 0 ? ` · ${general}세대` : ""}</H3>
          {n.publicHousing ? (
            <>
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
              <P>
                1순위 안에서 가점제로 먼저 뽑고, 떨어지면 추첨제로 넘어갑니다.
                {lotteryHomelessFirst(n.sido, !!n.regulated) &&
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
  const sidos = people.map((p) => p.sido).filter(Boolean);
  const regions = regionsOf(sidos);
  const accountLabel = n.publicHousing
    ? `특공 통장 6개월·${SPECIAL_ACCOUNT.count}회`
    : `특공 통장 6개월·예치금 ${RANK1_ACCOUNT.privateDepositMan}만 원`;
  const rank1Label = n.publicHousing
    ? `1순위 통장 ${RANK1_ACCOUNT.years}년·${RANK1_ACCOUNT.publicCount}회${n.regulated ? "·세대주" : ""}`
    : `1순위 통장 ${RANK1_ACCOUNT.years}년·예치금 ${RANK1_ACCOUNT.privateDepositMan}만 원${n.regulated ? "·세대주" : ""}`;
  const blocked = v.region === "out" || !!v.assetBlocked;
  const cap = tiers.at(-1)?.capPct;

  const eligibility = (
    <>
      <H2>내 자격</H2>
      <List>
        <Item
          ok={sidos.length ? v.region === "in" : null}
          label={`지역: ${n.sido} 공고`}
        >
          {sidos.length ? (
            `${regions.map((r) => r.label).join("·")} 거주 가구${v.region === "in" ? "" : ", 권역 밖(혁신도시 등 예외는 공고문 확인)"}`
          ) : (
            <Fill step="p0-home">사는 곳 넣기</Fill>
          )}
        </Item>
        {assetGated(n) && (
          <Item
            ok={s.totalAssetsEok === null ? null : !v.assetBlocked}
            label={`총자산 ${PUBLIC_ASSET_CAP_EOK}억 이하`}
          >
            {s.totalAssetsEok === null ? (
              <Fill step="assets">총자산 넣기</Fill>
            ) : (
              `우리 가구 ${s.totalAssetsEok}억`
            )}
          </Item>
        )}
      </List>
      {!blocked && hasNewlywed && (
        <>
          <H3>신혼부부 특별공급</H3>
          <List>
            {!n.publicHousing && (
              <Item
                ok={s.marriedAt ? true : null}
                label="혼인신고(민영은 필수)"
              >
                {s.marriedAt || <Fill step="married">혼인신고일 넣기</Fill>}
              </Item>
            )}
            {people.map((p) => {
              if (!personFilled(p))
                return (
                  <Item
                    key={p.name}
                    ok={null}
                    label={`${p.name}: ${accountLabel}`}
                  >
                    <Fill step={personStep(p)}>{p.name} 정보 넣기</Fill>
                  </Item>
                );
              const a = account(p, n, today);
              return (
                <Item
                  key={p.name}
                  ok={a.special}
                  label={`${p.name}: ${accountLabel}`}
                >
                  {`${fmtYears(a.years)} · ${p.accountCount}회 · ${p.accountPaidMan.toLocaleString()}만 원`}
                </Item>
              );
            })}
            <Item
              ok={pct === undefined ? null : landing !== -1}
              label={
                cap
                  ? `가구 소득 ${cap}% 이하(${e})`
                  : "가구 소득(추첨 구간은 상한 없음)"
              }
            >
              {pct === undefined ? (
                <Fill step="income">월소득 넣기</Fill>
              ) : (
                `우리 가구 ${pct}%`
              )}
              {people.length > 1 && s.dualIncome === null && (
                <>
                  {" · "}
                  <Fill step="dualincome">맞벌이 여부 넣기</Fill>
                </>
              )}
            </Item>
          </List>
        </>
      )}
      {!blocked && main && (
        <>
          <H3>일반공급</H3>
          <List>
            {people.map((p) => {
              if (!personFilled(p))
                return (
                  <Item
                    key={p.name}
                    ok={null}
                    label={`${p.name}: ${rank1Label}`}
                  >
                    <Fill step={personStep(p)}>{p.name} 정보 넣기</Fill>
                  </Item>
                );
              const a = account(p, n, today);
              const until =
                a.years < RANK1_ACCOUNT.years
                  ? ` · ${addYears(p.accountOpenedAt, RANK1_ACCOUNT.years)}에 2년`
                  : "";
              return (
                <Item
                  key={p.name}
                  ok={a.rank1}
                  label={`${p.name}: ${rank1Label}`}
                >
                  {`${fmtYears(a.years)} · ${n.publicHousing ? `${p.accountCount}회` : `${p.accountPaidMan.toLocaleString()}만 원`}${p.householder ? " · 세대주" : ""}${until}`}
                </Item>
              );
            })}
          </List>
        </>
      )}
      {!blocked && !main && (
        <List>
          <Item ok={null} label="무주택">
            통장·순위는 보지 않습니다. 지역 조건은 공고문으로
          </Item>
        </List>
      )}
    </>
  );

  // ───────── 내 순위 ─────────
  const generalRank = (p: Person): ReactNode => {
    const a = account(p, n, today);
    if (!a.rank1)
      return (
        <Item key={p.name} ok={false} label={`${p.name}: 1순위 아님`}>
          1순위에서 다 차면 기회가 없습니다
        </Item>
      );
    if (!n.publicHousing) {
      const b = bonusPoints({
        birth: p.birth,
        marriedAt: s.marriedAt,
        today,
        accountYears: a.years,
      });
      return (
        <Item key={p.name} ok={true} label={`${p.name}: 가점 ${b.total}점`}>
          {`무주택 ${b.homeless} · 부양가족 ${b.dependents} · 통장 ${b.account}. 가점제에서 떨어지면 추첨제`}
        </Item>
      );
    }
    const start = homelessStart({ birth: p.birth, marriedAt: s.marriedAt });
    const yrs = start.date <= today ? yearsBetween(start.date, today) : 0;
    return yrs >= PUBLIC_RANK1_HOMELESS_YEARS ? (
      <Item key={p.name} ok={true} label={`${p.name}: 순서 몫 1순차`}>
        {`무주택 ${fmtYears(yrs)} · 저축총액 ${p.accountPaidMan.toLocaleString()}만 원 순`}
      </Item>
    ) : (
      <Item key={p.name} ok={false} label={`${p.name}: 순서 몫 2순차`}>
        {`무주택 3년이 ${addYears(start.date, PUBLIC_RANK1_HOMELESS_YEARS)}에 참. 실제 기회는 추첨 ${PUBLIC_GENERAL.lotterySharePct}%`}
      </Item>
    );
  };
  const local = applicant ? residency(applicant, n, today).localOk : false;
  const rank = !blocked && main && (
    <>
      <H2>내 순위</H2>
      {hasNewlywed && newlywedAllowed(n, s) && (
        <>
          <H3>신혼부부 특별공급</H3>
          {pct !== undefined && (
            <TierChart
              rows={chartRows}
              marker={{ pct, label: `우리 가구 ${pct}%` }}
              caption={`세로선이 우리 가구 ${pct}%(월 ${won(s.incomeMan ?? 0)} ÷ ${size <= 3 ? "3인 이하" : `${size}인`} 가구 기준 ${won(incomeBaseMan(size))}).`}
            />
          )}
          <List>
            <Item
              ok={pct === undefined ? null : !!land}
              label={land ? `${land.label} 구간에서 시작` : "시작 구간"}
            >
              {pct === undefined ? (
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
              <Item ok={local} label="해당지역 거주자 먼저">
                {local
                  ? `${applicant.sigungu} 거주`
                  : `${n.address?.split(" ").slice(0, 2).join(" ") ?? n.sido} 거주자 다음`}
              </Item>
            )}
          </List>
        </>
      )}
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
  );

  const others = [
    t.firstHome > 0 && ["생애최초", t.firstHome, "first-home"],
    t.newborn > 0 && ["신생아", t.newborn, "newborn"],
    t.young > 0 && ["청년", t.young, "other-special"],
  ].filter(Boolean) as [string, number, string][];

  return (
    <div>
      {explain}
      {eligibility}
      {rank}
      {main && others.length > 0 && (
        <P>
          {others.map(([label, k, slug], i) => (
            <span key={label}>
              {i > 0 && ", "}
              <a href={`/guide/${slug}`}>{label}</a> {k}세대
            </span>
          ))}
          도 있지만 아직 계산하지 않습니다. 공고문으로 확인하세요.
        </P>
      )}
    </div>
  );
}
