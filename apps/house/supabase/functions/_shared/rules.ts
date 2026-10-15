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

/** 신혼 특공 소득 줄(도시근로자 가구당 월평균소득 대비 %), 맞벌이 기준. 둘 다 원문 — 2인 가구 가산 같은 건 없다.
 *  민영: 주택공급규칙 제41조(2026-06-15). 공공 일반형: 공공주택특별법 시행규칙 별표 6 나(2026-06-22). */
export const NEWLYWED_TIERS = {
  private: [
    { label: "우선", capPct: 120, sharePct: 50 },
    { label: "일반", capPct: 160, sharePct: 20 },
    { label: "추첨", capPct: undefined, sharePct: 30 }, // 소득 무관 · 부동산 3.3억(건보 29등급 평균) 이하
  ],
  public: [
    { label: "우선", capPct: 120, sharePct: 70 },
    { label: "일반", capPct: 140, sharePct: 20 },
    { label: "추첨", capPct: 200, sharePct: 10 }, // 요건 자체가 맞벌이 200% 이하
  ],
} as const;
/** 공공 일반형 일반공급(별표 6 1.): 50% 2세 미만 자녀 가구(소득 100/맞벌이 140) → 30% 소득 100/140 안에서 제27조 순차 → 20% 추첨. 60㎡ 이하는 요건으로 맞벌이 200% 이하. */
export const PUBLIC_GENERAL = {
  childFirstSharePct: 50,
  childFirstCapPct: 140,
  orderedSharePct: 30,
  orderedCapPct: 140,
  lotterySharePct: 20,
  smallAreaCapPct: 200,
};
/** 민영 신혼 특공은 혼인신고가 필수. 예비신혼부부는 공공주택(공공주택특별법 시행규칙)에서만 인정. */
export const PRIVATE_NEWLYWED_REQUIRES_MARRIAGE = true;
/** 추첨제 물량의 75%는 무주택세대에 먼저 배정한다. */
export const LOTTERY_HOMELESS_SHARE_PCT = 75;
export type Tier =
  | (typeof NEWLYWED_TIERS.private)[number]
  | (typeof NEWLYWED_TIERS.public)[number];

/** 공공 일반공급(40㎡ 초과) 1순차 요건: 무주택 3년 이상. 무주택기간은 만 30세(또는 혼인신고일)부터 센다. */
export const PUBLIC_RANK1_HOMELESS_YEARS = 3;

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

/** 민영 가점 어림. 무주택기간은 만 30세부터 세고, 부양가족은 배우자 하나로 본다. */
export function bonusPoints(input: {
  ageYears: number;
  accountYears: number;
  married: boolean;
}) {
  const homelessYears = Math.max(0, input.ageYears - 30);
  return {
    ...pointsOf({
      homelessYears,
      dependents: input.married ? 1 : 0,
      accountYears: input.accountYears,
    }),
    homelessYears,
  };
}
