import { yearsBetween } from "./dates.ts";
import { allOk, rank1Checks, specialAccountChecks } from "./requirements.ts";
import {
  type Earners,
  incomeBaseMan,
  LOCAL_YEARS_REGULATED,
  NEWLYWED_TIERS,
  PRIVATE_NEWLYWED_REQUIRES_MARRIAGE,
} from "./rules.ts";
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
export function account(
  p: Person,
  n: Notice,
  today: string,
  s?: Settings,
): Account {
  const years = yearsBetween(p.accountOpenedAt, today);
  const idx = Math.max(0, s?.people.indexOf(p) ?? 0);
  // 요건은 requirements.ts 의 표에서(공고 분류·사는 곳·주택형 면적별). 모름은 막지 않는다.
  const household =
    s ??
    ({ ownsHome: null, wonRecently: null, people: [p] } as unknown as Settings);
  const sp = specialAccountChecks(p, idx, n, today);
  const r1 = rank1Checks(p, idx, n, household, today);
  const failed = r1.find((c) => c.ok === false);
  return {
    years,
    special: allOk(sp) !== false,
    rank1: allOk(r1) !== false,
    rank1Why: failed ? `${failed.label} 미충족` : "",
  };
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
    const a = account(p, n, today, s);
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
/** 가구원 수: 함께 신청하는 사람 + 자녀. 부모님 등 다른 가구원은 묻지 않아 빠진다(공고문으로 확인). */
export const householdSize = (s: Settings) => s.people.length + s.children;

export const incomePct = (s: Settings) =>
  s.incomeMan === null
    ? undefined
    : Math.round((s.incomeMan / incomeBaseMan(householdSize(s))) * 100);

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
