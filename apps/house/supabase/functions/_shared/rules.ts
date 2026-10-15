import { addYears, yearsBetween } from "./dates.ts";

// 청약 규칙의 숫자. 근거는 각 줄의 조문(주택공급규칙·공공주택특별법 시행규칙)이다.
// "대략치"라고 적은 것은 감을 잡기 위한 값이고, 심사 기준이 아니다.

/** 공공 나눔·선택형·신혼희망타운의 신혼·생애최초 총자산 상한(억). 2026 뉴:홈 나눔형 기준. */
export const PUBLIC_ASSET_CAP_EOK = 3.62;
/** 투기과열지구에서 "해당지역 거주자"로 우선공급을 받으려면 살아야 하는 햇수. */
export const LOCAL_YEARS_REGULATED = 2;
/** 특공 통장(규칙 제48조 원문): 공공은 가입 6개월·6회, 민영은 가입 6개월 + 거주지 예치금(회차 요건 없음). */
export const SPECIAL_ACCOUNT = { years: 0.5, count: 6 };
/** 규제지역 1순위(규칙 제27·28조 원문): 통장 2년 + (공공 24회 / 민영 별표2 예치금 — 성남 거주자 모든 면적 500만) + 세대주 + 세대 5년 내 무당첨. */
export const RANK1_ACCOUNT = {
  years: 2,
  publicCount: 24,
  privateDepositMan: 500,
};

/** 맞벌이: 신청자와 배우자 모두 근로·사업소득이 있는 가구. 외벌이는 한 명만(혼자 사는 사람 포함). 소득 경계가 다르다. */
export type Earners = "맞벌이" | "외벌이";
export type Tier = { label: string; capPct?: number; sharePct: number };

/** 신혼 특공 소득 구간(도시근로자 가구당 월평균소득 대비 %). 민영: 주택공급규칙 제41조(2026-06-15). 공공 일반형: 공공주택특별법 시행규칙 별표 6 2.나(2026-06-22).
 *  민영 추첨은 소득 무관(부동산 3.3억 이하). 공공 추첨은 자격 상한(맞벌이 200%) 안. 공공 외벌이는 자격 상한이 일반 구간과 같은 130%라
 *  추첨 칸에 바로 들어가진 못하고, 앞 구간에서 떨어지면 들어간다(별표 6 2.나 2)다)). 그래서 추첨 상한을 130 으로 둔다. */
export const NEWLYWED_TIERS: Record<
  "private" | "public",
  Record<Earners, readonly Tier[]>
> = {
  private: {
    맞벌이: [
      { label: "우선", capPct: 120, sharePct: 50 },
      { label: "일반", capPct: 160, sharePct: 20 },
      { label: "추첨", capPct: undefined, sharePct: 30 },
    ],
    외벌이: [
      { label: "우선", capPct: 100, sharePct: 50 },
      { label: "일반", capPct: 140, sharePct: 20 },
      { label: "추첨", capPct: undefined, sharePct: 30 },
    ],
  },
  public: {
    맞벌이: [
      { label: "우선", capPct: 120, sharePct: 70 },
      { label: "일반", capPct: 140, sharePct: 20 },
      { label: "추첨", capPct: 200, sharePct: 10 },
    ],
    외벌이: [
      { label: "우선", capPct: 100, sharePct: 70 },
      { label: "일반", capPct: 130, sharePct: 20 },
      { label: "추첨", capPct: 130, sharePct: 10 },
    ],
  },
};
/** 공공 일반형 일반공급(별표 6 1.): 50% 2세 미만 자녀 가구 → 30% 소득 칸 안에서 제27조 순차 → 20% 추첨.
 *  소득 상한은 외벌이 100%, 맞벌이 140%(자녀 우선·순차 칸) / 200%(60㎡ 이하의 자격 요건). */
export const PUBLIC_GENERAL = {
  childFirstSharePct: 50,
  orderedSharePct: 30,
  lotterySharePct: 20,
  orderedCapPct: { 맞벌이: 140, 외벌이: 100 } as Record<Earners, number>,
  smallAreaCapPct: { 맞벌이: 200, 외벌이: 100 } as Record<Earners, number>,
};
/** 민영 신혼 특공은 혼인신고가 필수. 예비신혼부부는 공공주택(공공주택특별법 시행규칙)에서만 인정. */
export const PRIVATE_NEWLYWED_REQUIRES_MARRIAGE = true;

/** 공공 일반공급(40㎡ 초과) 1순차 요건: 무주택 3년 이상. 무주택기간은 만 30세(또는 혼인신고일)부터 센다. */
export const PUBLIC_RANK1_HOMELESS_YEARS = 3;

/** 가점 무주택기간을 세기 시작하는 날(별표 1 1.가 3)). 만 30세가 되는 날, 그 전에 혼인했으면 혼인신고일.
 *  신청자나 배우자가 집을 가진 적이 있으면 마지막으로 무주택자가 된 날이 그보다 늦을 때 그날부터. */
export function homelessStart(input: {
  birth: string;
  marriedAt?: string;
  homelessSince?: string;
}) {
  const at30 = addYears(input.birth, 30);
  const married = !!input.marriedAt && input.marriedAt < at30;
  const base = married && input.marriedAt ? input.marriedAt : at30;
  if (input.homelessSince && input.homelessSince > base)
    return { date: input.homelessSince, from: "무주택자가 된 날" } as const;
  return {
    date: base,
    from: married ? "혼인신고일" : "만 30세가 되는 날",
  } as const;
}

/** 민영 가점 표. 무주택기간(센 해가 없으면 0, 1년 미만 2, 해마다 2씩 최대 32) · 부양가족(0명 5, 한 명마다 5씩 최대 35) ·
 *  통장 기간(6개월 미만 1, 1년 미만 2, 해마다 1씩 최대 17). 가이드의 계산기도 이걸 쓴다. */
export function pointsOf(input: {
  homelessYears: number;
  dependents: number;
  accountYears: number;
}) {
  const homeless =
    input.homelessYears <= 0
      ? 0
      : Math.min(32, 2 + Math.floor(input.homelessYears) * 2);
  const dependents = Math.min(
    35,
    5 + 5 * Math.max(0, Math.floor(input.dependents)),
  );
  const account =
    input.accountYears < 0.5
      ? 1
      : Math.min(17, 2 + Math.floor(input.accountYears));
  return {
    total: homeless + dependents + account,
    homeless,
    dependents,
    account,
  };
}

/** 민영 가점 어림. 무주택기간은 homelessStart(만 30세, 그 전 혼인이면 혼인신고일)부터, 부양가족은 배우자 하나로 본다. */
export function bonusPoints(input: {
  birth: string;
  marriedAt?: string;
  today: string;
  accountYears: number;
}) {
  const start = homelessStart(input);
  const homelessYears =
    start.date <= input.today ? yearsBetween(start.date, input.today) : 0;
  return {
    ...pointsOf({
      homelessYears,
      dependents: input.marriedAt ? 1 : 0,
      accountYears: input.accountYears,
    }),
    homelessYears,
    start,
  };
}

/** 민영 일반공급 1순위의 가점제 비율(규칙 제28조 ②·④). 투기과열지구: 60㎡ 이하 40%, 85㎡ 이하 70%, 85㎡ 초과 80%.
 *  그 밖의 지역: 85㎡ 이하는 시장·군수·구청장이 40% 이하에서 공고, 85㎡ 초과는 모두 추첨. 나머지는 추첨제.
 *  청약과열지역·공공주택지구는 따로 정하지만 공고 데이터로 가를 수 없어 공고문을 보라고 한다. */
export function privatePointShare(
  exclusiveArea: number,
  regulated: boolean,
): number | "공고" {
  if (regulated)
    return exclusiveArea <= 60 ? 40 : exclusiveArea <= 85 ? 70 : 80;
  return exclusiveArea <= 85 ? "공고" : 0;
}
/** 추첨 물량의 75% 를 무주택자에게 먼저(규칙 제28조 ⑧): 투기과열지구·청약과열지역·수도권·광역시. */
export const LOTTERY_HOMELESS_PCT = 75;
const METRO = ["서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산"];
export const lotteryHomelessFirst = (sido: string, regulated: boolean) =>
  regulated || METRO.includes(sido);

/** 도시근로자 가구당 월평균소득(전년도) 100% 금액(원), 2026년 적용. LH 공공분양 안내(2026-09)·공고문 표 그대로.
 *  3인 이하는 한 칸(가구원 수로 나누지 않은 가구당 평균), 4인부터 가구원 수별(규칙 제41조·제43조, 별표 6). 해마다 바꾼다. */
export const INCOME_BASE_2026 = {
  "3인 이하": 7533763,
  "4인": 8802202,
  "5인": 9326985,
  "6인": 9906263,
  "7인": 10485541,
  "8인": 11064819,
} as const;
/** 가구원 수에 맞는 100% 금액(만 원). 8인을 넘으면 공고문이 정하므로 8인 칸을 쓴다. */
export function incomeBaseMan(householdSize: number): number {
  const key =
    householdSize <= 3
      ? "3인 이하"
      : (`${Math.min(8, householdSize)}인` as keyof typeof INCOME_BASE_2026);
  return INCOME_BASE_2026[key] / 10000;
}

/** 사는 곳으로 넣을 수 있는 권역(규칙 제4조 ③). 같은 권역 안의 다른 시·군 공고에도 넣는다(해당지역 다음 순서).
 *  제주는 목록에 없어 혼자. 행복도시 예정지역·혁신도시·기업도시·산업단지 등은 사는 곳과 상관없이 넣지만(① 3호) 공고 데이터로 가를 수 없다. */
export const REGIONS: { label: string; sidos: readonly string[] }[] = [
  { label: "수도권", sidos: ["서울", "인천", "경기"] },
  { label: "대전·세종·충남", sidos: ["대전", "세종", "충남"] },
  { label: "충북", sidos: ["충북"] },
  { label: "광주·전남", sidos: ["광주", "전남"] },
  { label: "전북", sidos: ["전북"] },
  { label: "대구·경북", sidos: ["대구", "경북"] },
  { label: "부산·울산·경남", sidos: ["부산", "울산", "경남"] },
  { label: "강원", sidos: ["강원"] },
  { label: "제주", sidos: ["제주"] },
];
/** 사는 시도들이 속한 권역. */
export const regionsOf = (sidos: string[]) =>
  REGIONS.filter((r) => sidos.some((s) => r.sidos.includes(s)));
