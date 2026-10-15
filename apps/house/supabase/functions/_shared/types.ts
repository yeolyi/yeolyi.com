// 도메인 타입. 서버(수집·판정·알림)와 화면이 같은 것을 본다.
// 날짜는 전부 YYYY-MM-DD(서울). 금액은 원천이 만원이라 만원(Man) 정수로 들고, 화면에서만 억(Eok)으로 바꾼다.

export type Source = "applyhome" | "myhome";
/** 본청약(APT·신혼희망타운) → 잔여세대(무순위) → 임의공급 순으로 같은 단지가 여러 번 공고된다. */
export type Kind = "APT" | "신혼희망타운" | "잔여세대" | "임의공급" | "LH잔여";
/** 공공분양 유형. 나눔·선택형은 총자산을 보고, 일반형은 부동산·자동차만 본다. */
/** 나눔형은 법의 이익공유형 분양주택, 선택형은 임대의무기간 6년 분양전환공공임대, 토지임대부는 주택법 제2조 제9호의 토지임대부 분양주택. */
export type PublicType = "나눔형" | "선택형" | "토지임대부" | "일반형";

export type Unit = {
  type: string; // "084.9800A"
  area: number; // 공급면적 ㎡
  total: number;
  special: number; // 특별공급 세대수 합. 신혼희망타운은 이 값이 곧 신혼 물량
  topPriceMan?: number; // 최고 분양가(만원). 잔여세대·임의공급 조회엔 없어 같은 단지 본청약에서 빌린다
  young: number;
  newlywed: number;
  firstHome: number;
  newborn: number;
};

export type Notice = {
  id: string; // applyhome: ah:<HOUSE_MANAGE_NO>:<PBLANC_NO> · myhome: mh:<pblancId>
  source: Source;
  kind: Kind;
  name: string;
  address?: string;
  sido: string; // 청약홈 시도 표기("경기")
  builder?: string;
  url?: string;
  announcedAt: string;
  spStart?: string;
  spEnd?: string;
  r1Start?: string; // 잔여세대·임의공급은 순위 없는 접수 기간을 여기 둔다
  r1End?: string;
  r2Start?: string;
  r2End?: string;
  winnerAt?: string;
  contractStart?: string;
  contractEnd?: string;
  moveInYm?: string; // "202903"
  totalUnits?: number;
  publicHousing: boolean;
  publicType?: PublicType;
  priceCap?: boolean; // 분양가상한제
  regulated?: boolean; // 투기과열지구
  units?: Unit[];
  enrichError?: string;
  firstSeenAt: string;
};

/** 신청자 한 사람. 특공은 한 명만 넣을 수 있어 누가 넣을지 정해야 하고, 그 답은 주소와 통장에서 나온다. */
export type Person = {
  name: string;
  birth: string; // 가점의 무주택기간은 만 30세부터 센다
  sido: string;
  sigungu: string; // "성남시"
  movedInAt: string; // 투기과열지구는 2년 거주해야 해당지역 우선
  householder: boolean; // 세대주. 규제지역 1순위(민영·공공)는 세대주만
  accountOpenedAt: string;
  accountCount: number;
  accountPaidMan: number;
};

/** 사람마다 다른 값은 전부 여기. 로그인하면 house.profiles 에, 아니면 브라우저에 남는다. */
export type Settings = {
  areas: string[]; // 청약홈 시도 이름. 이 안의 공고만 후보
  people: Person[]; // 한두 명. 특공은 그중 한 명만 넣는다
  marriedAt: string; // 혼인신고일. 비면 미혼. 민영 신혼 특공은 신고 필수, 공공은 예비신혼도 됨. 무주택기간·가점 부양가족도 여기서
  children: number; // 혼인기간 중 출산·임신·입양 자녀. 신혼 특공 1순위(자녀 있음)/2순위를 가른다
  totalAssetsEok: number | null; // 안 넣었으면 null(자산으로 거르지 않음). 공공주택 총자산(전세보증금 포함, 부채 차감)
  incomeMan: number | null; // 안 넣었으면 null(소득 구간을 모름). 가구 세전 월소득 합산
  dualIncome: boolean | null; // 안 넣었으면 null. 맞벌이(신청자·배우자 모두 소득). 소득 구간 경계가 다르다. 혼자면 외벌이
  incomeBaseMan: number; // 도시근로자 가구당 월평균소득 100%. 3인 이하 가구는 '3인 이하' 칸(가구당 평균), 4인 이상만 가구원수별 — 별표6·규칙41조
};

export const emptyPerson = (name: string): Person => ({
  name,
  birth: "",
  sido: "",
  sigungu: "",
  movedInAt: "",
  householder: false,
  accountOpenedAt: "",
  accountCount: 0,
  accountPaidMan: 0,
});

export const DEFAULT_SETTINGS: Settings = {
  areas: ["서울", "경기"],
  people: [emptyPerson("나")],
  marriedAt: "",
  children: 0,
  totalAssetsEok: null,
  incomeMan: null,
  dualIncome: null,
  incomeBaseMan: 753.4, // 2026-08 LH 공고문(성남복정2)의 '3인 이하 100%' 7,533,763 (가구당 평균). 가구원수별 표의 '3인'(8,168,429)과 다른 칸이다
};

/** 저장된 값을 기본값 위에 얹는다. 항목이 늘어도 예전 값이 그대로 뜨고, 없어진 항목은 따라 사라진다. */
export function withDefaults(
  saved: Partial<Settings> | null | undefined,
): Settings {
  return Object.fromEntries(
    Object.entries(DEFAULT_SETTINGS).map(([k, v]) => [
      k,
      saved?.[k as keyof Settings] ?? v,
    ]),
  ) as Settings;
}

export const SETTINGS_LIMITS = {
  totalAssetsEok: [0, 100],
  incomeMan: [0, 10000],
  incomeBaseMan: [1, 10000],
  children: [0, 10],
} as const;
export type NumericSetting = keyof typeof SETTINGS_LIMITS;

/** 청약홈 SUBSCRPT_AREA_CODE_NM 값. */
export const AREA_NAMES = [
  "서울",
  "경기",
  "인천",
  "부산",
  "대구",
  "광주",
  "대전",
  "울산",
  "세종",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
] as const;

/** 수집기 한 번의 기록. 화면 위 상태 줄이 마지막 것을 보여 준다. */
export type CollectRun = {
  finishedAt: string;
  error?: string;
  noticeCount: number;
  added: number;
};
