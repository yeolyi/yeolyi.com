import { addYears, fmtYears, yearsBetween } from "./dates.ts";
import {
  bonusPoints,
  LOCAL_YEARS_REGULATED,
  LOTTERY_HOMELESS_SHARE_PCT,
  NEWLYWED_TIERS,
  PRIVATE_NEWLYWED_REQUIRES_MARRIAGE,
  PUBLIC_GENERAL,
  PUBLIC_RANK1_HOMELESS_YEARS,
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
  const inCity = !!(p.sigungu && n.address?.includes(p.sigungu));
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
export function incomeTiers(
  n: Notice,
  s: Settings,
): { pct: number; tiers: IncomeTier[] } {
  const pct = Math.round((s.incomeMan / s.incomeBaseMan) * 100);
  const tiers = (
    n.publicHousing ? NEWLYWED_TIERS.public : NEWLYWED_TIERS.private
  ).map((t) => ({ ...t, ok: t.capPct === undefined || pct <= t.capPct }));
  return { pct, tiers };
}

// ---- 사다리. 트랙마다 세 부분 — 전제(못 넘으면 못 넣음) · 줄(배타, 하나만 켜짐) · 줄 안의 순서.
export type Step = { ok: boolean | null; label: string; detail?: string };
export type TierOption = { label: string; tip: string; on: boolean };
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
      income: {
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
        tip: t.capPct
          ? `소득 ${t.capPct}% 이하. 물량 ${t.sharePct}%. 위 구간에서 떨어진 사람도 내려온다.`
          : n.publicHousing
            ? `소득 무관. 물량 ${t.sharePct}%.`
            : `소득 무관, 부동산 3.3억 이하. 물량 ${t.sharePct}%.`,
        on: t === landing,
      })),
      tierNote: landing
        ? `소득 ${pct}%, ${failed.length ? `${failed.join("·")} 넘음, ` : ""}${landing.capPct ? `${landing.label} ${landing.capPct}% 안` : "소득 무관 구간"}`
        : `소득 ${pct}%, 모든 구간 초과`,
      within:
        landing && landing.label !== "추첨"
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
            { label: "추첨", tip: "공고문이 추첨으로 정한 경우", on: false },
            {
              label: "선착순",
              tip: "접수 순 동호지정. 공고문이 정함",
              on: false,
            },
          ]
        : [{ label: "추첨", tip: "무순위는 전부 추첨", on: true }],
      tierNote: optional ? "공고문이 정함" : "",
      within: [],
    });
    return out;
  }

  if (n.publicHousing) {
    // 별표 6 1.: 자산요건(부동산·자동차)은 면적 불문, 소득 요건은 60㎡ 이하만. 선정은 자녀 우선 50% → 소득칸 30%(제27조 순차) → 추첨 20%.
    const homelessYears = Math.max(
      0,
      yearsBetween(p.birth, today) - 30,
      s.marriedAt ? yearsBetween(s.marriedAt, today) : 0,
    );
    const firstTier = homelessYears >= PUBLIC_RANK1_HOMELESS_YEARS;
    const pct = Math.round((s.incomeMan / s.incomeBaseMan) * 100);
    const small = (n.units ?? []).some((u) => u.area > 0 && u.area <= 60 * 1.3);
    const incomeOk = !small || pct <= PUBLIC_GENERAL.smallAreaCapPct;
    const inOrdered = pct <= PUBLIC_GENERAL.orderedCapPct;
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
                ok: incomeOk,
                label: `소득: 60㎡ 이하는 맞벌이 ${PUBLIC_GENERAL.smallAreaCapPct}% 이하`,
                detail: `소득 ${pct}%`,
              },
            ]
          : []),
      ],
      tiers: [
        {
          label: `자녀 우선 ${PUBLIC_GENERAL.childFirstSharePct}%`,
          tip: `2세 미만 자녀(태아 포함) 가구, 소득 맞벌이 ${PUBLIC_GENERAL.childFirstCapPct}% 이하.`,
          on: false,
        },
        {
          label: `순차 ${PUBLIC_GENERAL.orderedSharePct}%`,
          tip: `소득 맞벌이 ${PUBLIC_GENERAL.orderedCapPct}% 이하인 1순위를 제27조 순차(무주택 3년 → 저축총액)로.`,
          on: inOrdered && firstTier,
        },
        {
          label: `추첨 ${PUBLIC_GENERAL.lotterySharePct}%`,
          tip: "요건만 갖추면 누구나. 위 칸에서 떨어진 사람도 포함.",
          on: incomeOk && !(inOrdered && firstTier),
        },
      ],
      tierNote: firstTier
        ? `무주택 ${fmtYears(homelessYears)}, 순차 칸 1순차. 저축총액 ${p.accountPaidMan}만`
        : `무주택 ${fmtYears(homelessYears)}, 순차 칸은 2순차라 사실상 불가(만 30세·혼인신고일부터 3년 뒤 1순차). 자녀 없음 → 추첨 ${PUBLIC_GENERAL.lotterySharePct}%가 실제 표`,
      within: [localStep],
    });
  } else {
    const b = bonusPoints({
      ageYears: yearsBetween(p.birth, today),
      accountYears: a.years,
      married: !!s.marriedAt,
    });
    const small = (n.units ?? []).some((u) => u.area > 0 && u.area <= 60 * 1.3); // 공급면적으로 전용 60㎡ 근사
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
          tip: `무주택기간(만 30세부터, 32) · 부양가족(35) · 통장 기간(17) 합산 84점 만점.`,
          on: false,
        },
        {
          label: "추첨제",
          tip: `가점 낮은 1순위는 여기. 물량 ${small ? "60㎡ 이하 60% · 60~85㎡ 30%" : "60~85㎡ 30% · 85㎡ 초과 20%"}. 그중 ${LOTTERY_HOMELESS_SHARE_PCT}%는 무주택자 먼저.`,
          on: true,
        },
      ],
      tierNote: `가점 ${b.total}점 (무주택 ${b.homeless}${b.homelessYears <= 0 ? `, 만 30세부터 ${Math.ceil(-(yearsBetween(p.birth, today) - 30))}년 뒤` : ""} · 부양가족 ${b.dependents}, 혼인신고하면 +5 · 통장 ${b.account})`,
      within: [localStep],
    });
  }
  return out;
}

/** 일반공급 물량 = 전체 − 특공. 주택형 정보가 없으면 모른다. */
function generalSupply(n: Notice): string | undefined {
  if (!n.units?.length) return undefined;
  const total = n.units.reduce((a, u) => a + u.total, 0);
  const special = n.units.reduce((a, u) => a + u.special, 0);
  return total ? `일반 ${total - special}세대` : undefined;
}
