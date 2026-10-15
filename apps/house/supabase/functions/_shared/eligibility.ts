import { addYears, fmtYears, yearsBetween } from "./dates.ts";
import {
  bonusPoints,
  type Earners,
  homelessStart,
  LOCAL_YEARS_REGULATED,
  LOTTERY_HOMELESS_PCT,
  lotteryHomelessFirst,
  NEWLYWED_TIERS,
  PRIVATE_NEWLYWED_REQUIRES_MARRIAGE,
  PUBLIC_GENERAL,
  PUBLIC_RANK1_HOMELESS_YEARS,
  privatePointShare,
  RANK1_ACCOUNT,
  SPECIAL_ACCOUNT,
} from "./rules.ts";
import { isMainRound } from "./site.ts";
import type { Notice, Person, Settings } from "./types.ts";
import type { Verdict } from "./verdict.ts";

// 공고마다 "누가 무엇으로 넣나, 넣으면 어디쯤 서나".
//  · 특공(예비신혼)은 한 명만. 소득은 둘 합산이라 같고, 갈리는 건 해당지역 거주와 통장.
//  · 일반은 둘 다, 각자 통장이 1순위 조건을 넘으면.

export const personFilled = (p: Person) =>
  !!(p.birth && p.sido && p.accountOpenedAt);

export type Residency = {
  inSido: boolean;
  inCity: boolean;
  cityYears: number;
  localOk: boolean;
};
export function residency(p: Person, n: Notice, today: string): Residency {
  const inSido = p.sido === n.sido;
  // 시군구 이름은 시도마다 겹친다(동구·서구 등). 같은 시도일 때만 본다.
  const inCity = inSido && !!(p.sigungu && n.address?.includes(p.sigungu));
  const cityYears =
    inCity && p.movedInAt ? yearsBetween(p.movedInAt, today) : 0;
  const localOk =
    inCity && (!n.regulated || cityYears >= LOCAL_YEARS_REGULATED);
  return { inSido, inCity, cityYears, localOk };
}

export type Account = {
  years: number;
  special: boolean;
  rank1: boolean;
  rank1Why: string;
};
export function account(p: Person, n: Notice, today: string): Account {
  const years = yearsBetween(p.accountOpenedAt, today);
  // 특공 통장(제48조): 공공은 6개월·6회, 민영은 6개월·예치금(성남 거주자 모든 면적 500만).
  const special =
    years >= SPECIAL_ACCOUNT.years &&
    (n.publicHousing
      ? p.accountCount >= SPECIAL_ACCOUNT.count
      : p.accountPaidMan >= RANK1_ACCOUNT.privateDepositMan);
  const byAccount =
    years >= RANK1_ACCOUNT.years &&
    (n.publicHousing
      ? p.accountCount >= RANK1_ACCOUNT.publicCount
      : p.accountPaidMan >= RANK1_ACCOUNT.privateDepositMan);
  // 규제지역 1순위는 세대주만.
  const householderOk = !n.regulated || p.householder;
  const rank1 = byAccount && householderOk;
  const rank1Why = !byAccount
    ? "통장 미달"
    : !householderOk
      ? "세대주가 아님"
      : "";
  return { years, special, rank1, rank1Why };
}

/** 이 공고의 신혼 특공에 지금 넣을 수 있는 상태인가. 민영은 혼인신고가 있어야 하고, 공공은 예비신혼도 된다. */
export const newlywedAllowed = (n: Notice, s: Settings) =>
  !!s.marriedAt || n.publicHousing || !PRIVATE_NEWLYWED_REQUIRES_MARRIAGE;

export type PersonFit = {
  person: Person;
  filled: boolean;
  special: boolean;
  general: boolean;
};
export type Who = { blocked?: string; people: PersonFit[] };

/** 특공은 지역 점수(해당 시도 2 + 해당지역 2)가 높은 한 명. 일반은 통장이 되는 사람 전부. */
export function who(n: Notice, v: Verdict, s: Settings, today: string): Who {
  const scored = s.people.map((p) => {
    if (!personFilled(p))
      return {
        person: p,
        filled: false,
        special: false,
        general: false,
        score: -1,
      };
    const r = residency(p, n, today);
    const a = account(p, n, today);
    return {
      person: p,
      filled: true,
      special: a.special,
      general: a.rank1,
      score: (r.inSido ? 2 : 0) + (r.localOk ? 2 : 0),
    };
  });
  if (v.assetBlocked)
    return {
      blocked: `${v.assetBlocked}, 아무도 신청 불가`,
      people: scored.map((f) => ({ ...f, special: false, general: false })),
    };
  if (v.tickets.newlywed && !newlywedAllowed(n, s))
    return {
      blocked: "민영 신혼 특공은 혼인신고가 있어야 해서 지금은 일반공급만",
      people: scored.map((f) => ({ ...f, special: false })),
    };
  const best = v.tickets.newlywed
    ? scored.filter((f) => f.special).sort((a, b) => b.score - a.score)[0]
        ?.person
    : undefined;
  return {
    people: scored.map(({ score: _, ...f }) => ({
      ...f,
      special: f.person === best,
    })),
  };
}

export type IncomeTier = {
  label: string;
  capPct?: number;
  sharePct: number;
  ok: boolean;
};
/** 맞벌이는 두 사람이 함께 신청하고 둘 다 소득이 있을 때만. 혼자면 외벌이.
 *  둘인데 아직 답하지 않았으면 경계가 넓은 맞벌이로 본다(모르는 값으로 거르지 않는다). */
export const earners = (s: Settings): Earners =>
  s.people.length > 1 && s.dualIncome !== false ? "맞벌이" : "외벌이";

/** 소득 %. 월소득을 안 넣었으면 undefined 이고, 그때는 구간을 정하지 않는다. */
export const incomePct = (s: Settings) =>
  s.incomeMan === null
    ? undefined
    : Math.round((s.incomeMan / s.incomeBaseMan) * 100);

export function incomeTiers(
  n: Notice,
  s: Settings,
): { pct: number | undefined; tiers: IncomeTier[] } {
  const pct = incomePct(s);
  const tiers = NEWLYWED_TIERS[n.publicHousing ? "public" : "private"][
    earners(s)
  ].map((t) => ({
    ...t,
    ok: pct !== undefined && (t.capPct === undefined || pct <= t.capPct),
  }));
  return { pct, tiers };
}

// ---- 사다리. 트랙마다 세 부분 — 전제(못 넘으면 못 넣음) · 줄(배타, 하나만 켜짐) · 줄 안의 순서.
export type Step = { ok: boolean | null; label: string; detail?: string };
export type TierOption = { label: string; on: boolean };
export type IncomeScale = {
  pct: number;
  incomeMan: number;
  baseMan: number;
  tiers: { label: string; capPct?: number; sharePct: number }[];
}; // 막대: 소득 %와 그 계산 재료, 구간 경계
export type Ladder = {
  title: string;
  supply?: string;
  prerequisites: Step[];
  tiers: TierOption[];
  tierNote: string;
  within: Step[];
  income?: IncomeScale;
};

export function ladders(
  p: Person,
  n: Notice,
  v: Verdict,
  s: Settings,
  today: string,
): Ladder[] {
  if (!personFilled(p)) return [];
  const r = residency(p, n, today);
  const a = account(p, n, today);
  const localStep: Step = r.inCity
    ? {
        ok: r.localOk,
        label: "해당지역 거주자 우선",
        detail: r.localOk
          ? `${p.sigungu} ${fmtYears(r.cityYears)} 거주`
          : `${p.sigungu} ${fmtYears(r.cityYears)}, 투기과열지구는 ${LOCAL_YEARS_REGULATED}년부터 (${addYears(p.movedInAt, LOCAL_YEARS_REGULATED)})`,
      }
    : {
        ok: false,
        label: "해당지역 거주자 우선",
        detail: `${n.address?.split(" ").slice(0, 2).join(" ") ?? n.sido} 거주자가 먼저. 지금은 ${p.sido} 거주${r.inSido ? " 순위" : "라 후순위"}`,
      };
  const out: Ladder[] = [];

  if (v.tickets.newlywed > 0 && !v.assetBlocked && newlywedAllowed(n, s)) {
    const { pct, tiers } = incomeTiers(n, s);
    const landing = tiers.find((t) => t.ok);
    const failed = tiers
      .filter((t) => !t.ok && t.capPct)
      .map((t) => `${t.label} ${t.capPct}%`);
    out.push({
      title: `예비신혼 특공 (${n.publicHousing ? "공공" : "민영"})`,
      supply: `신혼 ${v.tickets.newlywed}세대`,
      income:
        pct === undefined || s.incomeMan === null
          ? undefined
          : {
              pct,
              incomeMan: s.incomeMan,
              baseMan: s.incomeBaseMan,
              tiers: tiers.map(({ label, capPct, sharePct }) => ({
                label,
                capPct,
                sharePct,
              })),
            },
      prerequisites: [
        {
          ok: a.special,
          label: n.publicHousing
            ? `통장 6개월·${SPECIAL_ACCOUNT.count}회`
            : `통장 6개월·예치금 ${RANK1_ACCOUNT.privateDepositMan}만`,
          detail: `${fmtYears(a.years)} · ${p.accountCount}회 · ${p.accountPaidMan}만`,
        },
        s.marriedAt
          ? { ok: true, label: "혼인 7년 이내", detail: `신고 ${s.marriedAt}` }
          : {
              ok: true,
              label: "예비신혼부부 (공공만)",
              detail: "입주 전까지 혼인신고. 안 하면 당첨 취소",
            },
      ],
      tiers: tiers.map((t) => ({
        label: `${t.label} ${t.sharePct}%`,
        on: t === landing,
      })),
      tierNote:
        pct === undefined
          ? "월소득을 넣으면 어느 구간인지 나옵니다"
          : landing
            ? `소득 ${pct}%(${earners(s)}), ${failed.length ? `${failed.join("·")} 넘음, ` : ""}${landing.capPct ? `${landing.label} ${landing.capPct}% 안` : "소득 무관 구간"}`
            : `소득 ${pct}%(${earners(s)}), 모든 구간 초과`,
      within:
        pct === undefined || (landing && landing.label !== "추첨")
          ? [
              {
                ok: s.children > 0,
                label: "1순위: 혼인 중 자녀(임신 포함)",
                detail:
                  s.children > 0
                    ? `자녀 ${s.children}명`
                    : "자녀 없음 → 2순위. 같은 칸의 1순위가 다 뽑힌 뒤",
              },
              localStep,
              {
                ok: null,
                label: "자녀 수 → 추첨",
                detail: "같은 순위·같은 지역 안에서 자녀 많은 순, 같으면 추첨",
              },
            ]
          : [],
    });
  }

  if (!isMainRound(n)) {
    const optional = n.kind === "임의공급";
    out.push({
      title: optional ? "임의공급" : "무순위(잔여세대)",
      prerequisites: [
        {
          ok: true,
          label: "통장·순위 없음",
          detail: optional
            ? "순위를 다 돌고 남은 걸 사업주체가 임의로 판다. 차수가 높을수록 안 팔린 단지"
            : "본청약 부적격·포기분. 규제지역은 거주 요건과 재당첨 제한이 붙을 수 있어 공고문 확인",
        },
      ],
      tiers: optional
        ? [
            { label: "추첨", on: false },
            { label: "선착순", on: false },
          ]
        : [{ label: "추첨", on: true }],
      tierNote: optional ? "공고문이 정함" : "",
      within: [],
    });
    return out;
  }

  if (n.publicHousing) {
    // 별표 6 1.: 자산요건(부동산·자동차)은 면적 불문, 소득 요건은 60㎡ 이하만. 선정은 자녀 우선 50% → 소득칸 30%(제27조 순차) → 추첨 20%.
    const start = homelessStart({ birth: p.birth, marriedAt: s.marriedAt });
    const homelessYears =
      start.date <= today ? yearsBetween(start.date, today) : 0;
    const e = earners(s);
    const firstTier = homelessYears >= PUBLIC_RANK1_HOMELESS_YEARS;
    const pct = incomePct(s);
    const small = (n.units ?? []).some((u) => u.area > 0 && u.area <= 60 * 1.3);
    // 월소득을 안 넣었으면 소득으로 거르지 않는다.
    const incomeOk =
      !small || pct === undefined || pct <= PUBLIC_GENERAL.smallAreaCapPct[e];
    const inOrdered =
      pct === undefined || pct <= PUBLIC_GENERAL.orderedCapPct[e];
    out.push({
      title: "일반공급 (공공)",
      supply: generalSupply(n),
      prerequisites: [
        {
          ok: a.rank1,
          label: `1순위: 통장 ${RANK1_ACCOUNT.years}년·${RANK1_ACCOUNT.publicCount}회 · 세대주`,
          detail:
            a.rank1Why || `${fmtYears(a.years)} · ${p.accountCount}회 · 세대주`,
        },
        {
          ok: true,
          label: "자산: 부동산 2.155억·자동차",
          detail: "전세보증금은 안 봄(총자산이 아니라 부동산·자동차)",
        },
        ...(small
          ? [
              {
                ok: pct === undefined ? null : incomeOk,
                label: `소득: 60㎡ 이하는 ${e} ${PUBLIC_GENERAL.smallAreaCapPct[e]}% 이하`,
                detail:
                  pct === undefined ? "월소득을 넣으면 확인" : `소득 ${pct}%`,
              },
            ]
          : []),
      ],
      tiers: [
        {
          label: `자녀 우선 ${PUBLIC_GENERAL.childFirstSharePct}%`,
          on: false,
        },
        {
          label: `순차 ${PUBLIC_GENERAL.orderedSharePct}%`,
          on: inOrdered && firstTier,
        },
        {
          label: `추첨 ${PUBLIC_GENERAL.lotterySharePct}%`,
          on: incomeOk && !(inOrdered && firstTier),
        },
      ],
      tierNote: !inOrdered
        ? `소득 ${pct}%가 ${e} ${PUBLIC_GENERAL.orderedCapPct[e]}%를 넘어 자녀 우선·순차 칸은 못 들어감. 추첨 ${PUBLIC_GENERAL.lotterySharePct}%만`
        : firstTier
          ? `무주택 ${fmtYears(homelessYears)}(${start.from}부터), 순차 칸 1순차. 저축총액 ${p.accountPaidMan}만`
          : `무주택 ${fmtYears(homelessYears)}(${start.from}부터), 순차 칸은 2순차라 사실상 불가(${addYears(start.date, PUBLIC_RANK1_HOMELESS_YEARS)}부터 1순차). 추첨 ${PUBLIC_GENERAL.lotterySharePct}%가 실제 표`,
      within: [localStep],
    });
  } else {
    const b = bonusPoints({
      birth: p.birth,
      marriedAt: s.marriedAt,
      today,
      accountYears: a.years,
    });
    out.push({
      title: "일반공급 (민영)",
      supply: generalSupply(n),
      prerequisites: [
        {
          ok: a.rank1,
          label: `1순위: 통장 ${RANK1_ACCOUNT.years}년·예치금 ${RANK1_ACCOUNT.privateDepositMan}만 · 세대주`,
          detail:
            a.rank1Why ||
            `${fmtYears(a.years)} · ${p.accountPaidMan}만 · 세대주`,
        },
      ],
      tiers: [
        {
          label: "가점제",
          on: false,
        },
        {
          label: "추첨제",
          on: true,
        },
      ],
      tierNote: `${privateGeneralNote(n)} 내 가점 ${b.total}점 (무주택 ${b.homeless}${b.start.date > today ? `, ${b.start.from}(${b.start.date})부터 셈` : ""} · 부양가족 ${b.dependents}${s.marriedAt ? "" : ", 혼인신고하면 +5"} · 통장 ${b.account})`,
      within: [localStep],
    });
  }
  return out;
}

/** 민영 일반공급의 가점·추첨 비율을 공고의 면적대마다 한 줄로. 전용면적은 주택형 이름("084.9800A")에서 읽는다. */
function privateGeneralNote(n: Notice): string {
  const bands = new Map<string, number | "공고">();
  for (const u of n.units ?? []) {
    const area = Number.parseFloat(u.type);
    if (!area) continue;
    const band =
      area <= 60 ? "60㎡ 이하" : area <= 85 ? "85㎡ 이하" : "85㎡ 초과";
    bands.set(band, privatePointShare(area, !!n.regulated));
  }
  const parts = [...bands].map(([band, share]) =>
    share === "공고"
      ? `${band} 가점 비율은 시군구 공고(40% 이하)`
      : share === 0
        ? `${band} 모두 추첨`
        : `${band} 가점 ${share}%·추첨 ${100 - share}%`,
  );
  const homeless = lotteryHomelessFirst(n.sido, !!n.regulated)
    ? ` 추첨 물량의 ${LOTTERY_HOMELESS_PCT}%는 무주택자 먼저.`
    : "";
  return parts.length ? `${parts.join(", ")}.${homeless}` : homeless.trim();
}

/** 일반공급 물량 = 전체 − 특공. 주택형 정보가 없으면 모른다. */
function generalSupply(n: Notice): string | undefined {
  if (!n.units?.length) return undefined;
  const total = n.units.reduce((a, u) => a + u.total, 0);
  const special = n.units.reduce((a, u) => a + u.special, 0);
  return total ? `일반 ${total - special}세대` : undefined;
}
