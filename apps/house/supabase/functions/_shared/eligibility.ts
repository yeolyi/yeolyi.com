import { METRO } from "./classify.ts";
import { fmtYears, yearsBetween } from "./dates.ts";
import {
  allOk,
  type Check,
  rank1Checks,
  specialAccountChecks,
} from "./requirements.ts";
import {
  type Earners,
  incomeBaseMan,
  LOCAL_YEARS_REGULATED,
  NEWLYWED_MAX_YEARS,
  NEWLYWED_STAGE1_YEARS,
  NEWLYWED_STAGED_TIERS,
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
  // 2년 거주 의무는 수도권 투기과열지구만(제4조 ⑤). 그 밖은 시장·군수가 정하면 공고문에 있다.
  const localOk =
    inCity &&
    (!n.regulated ||
      !METRO.includes(n.sido) ||
      cityYears >= LOCAL_YEARS_REGULATED);
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

/** 신혼희망타운·나눔형·토지임대부는 신혼 특공을 혼인 기간 단계(1단계 2년 이내 30% → 2단계 60%)로 뽑는다(별표 6의3·6의6). */
export const stagedNewlywed = (n: Notice) =>
  n.kind === "신혼희망타운" ||
  (n.publicHousing &&
    (n.publicType === "나눔형" || n.publicType === "토지임대부"));

/** 신혼 특공의 "누구" 요건. 민영은 혼인신고 뒤 7년 이내(규칙 제41조 ①1가).
 *  공공은 혼인 7년 이내이거나 6세 이하 자녀, 예비신혼부부, 6세 이하 자녀를 둔 한부모가족(별표 6 2.나·6의3·6의6 2.나).
 *  자녀 나이는 "2세 미만이 있나"만 묻기 때문에 그 밖의 자녀는 6세 이하인지 모름으로 둔다. */
export function newlywedCheck(n: Notice, s: Settings): Check {
  const pub = n.publicHousing;
  const law = pub
    ? n.kind === "신혼희망타운"
      ? "공공주택 특별법 시행규칙 별표 6의3"
      : stagedNewlywed(n)
        ? "공공주택 특별법 시행규칙 별표 6의6 2.나"
        : "공공주택 특별법 시행규칙 별표 6 2.나"
    : "규칙 제41조 ①";
  const label = pub
    ? `혼인 ${NEWLYWED_MAX_YEARS}년 이내(넘었으면 6세 이하 자녀), 예비신혼부부, 6세 이하 자녀를 둔 한부모가족`
    : `혼인신고 뒤 ${NEWLYWED_MAX_YEARS}년 이내`;
  // 6세 이하 자녀: 2세 미만이 있으면 확실, 자녀가 있지만 나이를 모르면 모름, 없으면 아님
  const young6: boolean | null =
    s.children === 0 ? false : s.newbornChild ? true : null;
  if (s.marriedAt) {
    const y = yearsBetween(s.marriedAt, n.announcedAt);
    if (y <= NEWLYWED_MAX_YEARS)
      return {
        id: "married",
        label,
        law,
        ok: true,
        mine: `혼인 ${fmtYears(y)}`,
      };
    return {
      id: "married",
      label,
      law,
      ok: pub ? young6 : false,
      mine: `혼인 ${fmtYears(y)}${pub && young6 === null ? " · 6세 이하 자녀인지 확인" : ""}`,
      need: pub && young6 === null ? "newborn" : undefined,
    };
  }
  if (!pub && PRIVATE_NEWLYWED_REQUIRES_MARRIAGE)
    return {
      id: "married",
      label,
      law,
      ok: false,
      mine: "혼인신고 안 함",
      need: "married",
    };
  if (s.people.length > 1)
    return {
      id: "married",
      label,
      law,
      ok: true,
      mine: "예비신혼부부(입주 전까지 혼인신고)",
    };
  return {
    id: "married",
    label,
    law,
    ok: young6,
    mine:
      young6 === false
        ? "혼자 · 자녀 없음"
        : young6
          ? "한부모가족(2세 미만 자녀)"
          : "한부모가족이면 6세 이하 자녀인지 확인",
    need: young6 === null ? "newborn" : "household",
  };
}

/** 이 공고의 신혼 특공에 지금 넣을 수 있는 상태인가(혼인 요건이 확실히 안 되는 경우만 막는다). */
export const newlywedAllowed = (n: Notice, s: Settings) =>
  newlywedCheck(n, s).ok !== false;

/** 1단계(혼인 2년 이내·2세 이하 자녀·예비신혼)인가 2단계인가. 단계식 공고에서만 쓴다. */
export const newlywedStage = (n: Notice, s: Settings): 1 | 2 =>
  !s.marriedAt ||
  s.newbornChild === true ||
  yearsBetween(s.marriedAt, n.announcedAt) <= NEWLYWED_STAGE1_YEARS
    ? 1
    : 2;

/** 이 공고의 신혼 특공 소득 구간. */
export const newlywedTiersFor = (n: Notice, e: Earners) =>
  stagedNewlywed(n)
    ? NEWLYWED_STAGED_TIERS[e]
    : NEWLYWED_TIERS[n.publicHousing ? "public" : "private"][e];

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
      blocked: `신혼 특공 요건이 안 돼(${newlywedCheck(n, s).mine}) 지금은 일반공급만`,
      people: scored.map((f) => ({ ...f, special: false })),
    };
  // 특공은 무주택 가구만
  if (s.ownsHome === true)
    return {
      blocked: "집이 있는 가구라 특별공급은 넣을 수 없음",
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

/** 공공(별표 6 3.가 등)은 2023-03-28 이후 출생 자녀가 있으면 소득 기준에 10%p(2명 이상 20%p)를 더한다.
 *  2세 미만 자녀가 있다고 답했으면 그 날짜 뒤에 태어났으니 적어도 10%p. 기준을 올리는 대신 우리 % 를 그만큼 내린다. */
export const incomeBonusPct = (n: Notice | undefined, s: Settings) =>
  n?.publicHousing && s.newbornChild ? 10 : 0;

/** 소득 %(기준 대비). 공고를 주면 자녀 가산을 뺀 값. 월소득을 안 넣었으면 undefined. */
export const incomePct = (s: Settings, n?: Notice) =>
  s.incomeMan === null
    ? undefined
    : Math.round((s.incomeMan / incomeBaseMan(householdSize(s))) * 100) -
      incomeBonusPct(n, s);

export function incomeTiers(
  n: Notice,
  s: Settings,
): { pct: number | undefined; tiers: IncomeTier[] } {
  const pct = incomePct(s, n);
  const tiers = newlywedTiersFor(n, earners(s)).map((t) => ({
    ...t,
    ok: pct !== undefined && (t.capPct === undefined || pct <= t.capPct),
  }));
  return { pct, tiers };
}
