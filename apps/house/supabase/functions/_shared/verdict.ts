import { PUBLIC_ASSET_CAP_EOK } from "./rules.ts";
import type { Notice, Settings, Unit } from "./types.ts";

// 공고 하나를 설정에 대고 판정한다. 서버(알림 여부)와 화면(설정을 바꿔 보며 즉시 재계산)이 같은 함수를 쓴다.
// 후보: 고른 시도 안 + 살 수 있는 주택형 있음(필요 자기자본 ≤ 자기자본) + 자산 자격 · 탈락: 하나라도 못 넘음.
// 분양가를 아직 모르는 공고는 가격에서 떨어뜨리지 않는다. 통근은 판정하지 않고 길찾기 링크로 사람이 본다.
// 계약금은 관문이 아니라 경고다 — 부모 도움처럼 그때 가서 정해지는 변수가 있다.

export type Region = "in" | "out";
export type Status = "candidate" | "rejected";
export type Tickets = {
  young: number;
  newlywed: number;
  firstHome: number;
  newborn: number;
};
export type Verdict = {
  region: Region;
  price: "ok" | "over" | "unknown";
  assetBlocked?: string;
  pass: boolean;
  status: Status;
  tickets: Tickets;
  minPriceEok?: number;
  maxPriceEok?: number;
  /** 기준 주택형: 살 수 있는 것 중 가장 비싼 것(현실적으로 노릴 평형). 다 못 사면 가장 싼 것. */
  refType?: string;
  refPriceEok?: number;
  loanEok?: number;
  neededEquityEok?: number;
  depositEok?: number;
  depositWarn: boolean;
};

export const manToEok = (man: number) => Math.round(man / 1000) / 10;
const round1 = (v: number) => Math.round(v * 10) / 10;

export const regionOf = (n: Notice, s: Settings): Region =>
  s.areas.includes(n.sido) ? "in" : "out";

export function ticketsOf(n: Notice): Tickets {
  const t: Tickets = { young: 0, newlywed: 0, firstHome: 0, newborn: 0 };
  for (const u of n.units ?? []) {
    t.young += u.young;
    // 신혼희망타운은 전 세대가 신혼(예비신혼·한부모) 몫이라 특공 칸이 비어 온다. 특별공급 세대수가 곧 신혼 물량.
    t.newlywed += n.kind === "신혼희망타운" ? u.special : u.newlywed;
    t.firstHome += u.firstHome;
    t.newborn += u.newborn;
  }
  return t;
}

/** 나눔·선택형·신혼희망타운은 총자산(전세보증금 포함)을 본다. 넘으면 이 공고는 아무도 못 넣는다. */
// 토지임대부는 이익공유형과 같은 입주자 선정 기준(공공주택 특별법 시행규칙 제19조 ②, 별표 6의6)이라 총자산을 같이 본다.
export const assetGated = (n: Notice) =>
  n.kind === "신혼희망타운" ||
  (n.publicHousing &&
    (n.publicType === "나눔형" ||
      n.publicType === "선택형" ||
      n.publicType === "토지임대부"));

/** 분양가 P에서 대출을 뺀 내 돈. 대출 = min(P × LTV, 상한). */
export function neededEquity(priceEok: number, s: Settings) {
  const loan = Math.min((priceEok * s.ltvPct) / 100, s.loanCapEok);
  return { loanEok: round1(loan), neededEquityEok: round1(priceEok - loan) };
}

type Priced = Unit & { topPriceMan: number };
const isPriced = (u: Unit): u is Priced => (u.topPriceMan ?? 0) > 0;

function pickReference(units: Unit[], s: Settings): Priced | undefined {
  const priced = units.filter(isPriced);
  if (!priced.length) return undefined;
  const affordable = priced.filter(
    (u) =>
      neededEquity(manToEok(u.topPriceMan), s).neededEquityEok <= s.equityEok,
  );
  const pool = affordable.length ? affordable : priced;
  return pool.reduce((a, b) =>
    (
      affordable.length
        ? a.topPriceMan >= b.topPriceMan
        : a.topPriceMan <= b.topPriceMan
    )
      ? a
      : b,
  );
}

export function judge(n: Notice, s: Settings): Verdict {
  const region = regionOf(n, s);
  const prices = (n.units ?? [])
    .map((u) => u.topPriceMan ?? 0)
    .filter((p) => p > 0);
  const minPriceEok = prices.length ? manToEok(Math.min(...prices)) : undefined;
  const maxPriceEok = prices.length ? manToEok(Math.max(...prices)) : undefined;
  const ref = pickReference(n.units ?? [], s);
  const refPriceEok = ref ? manToEok(ref.topPriceMan) : undefined;
  // "살 수 있는 주택형이 하나라도 있나" — 기준 주택형이 살 수 있는 것이면 통과(못 사면 가장 싼 것이 기준이 된다).
  const price =
    refPriceEok === undefined
      ? "unknown"
      : neededEquity(refPriceEok, s).neededEquityEok <= s.equityEok
        ? "ok"
        : "over";
  const assetBlocked =
    assetGated(n) && s.totalAssetsEok > PUBLIC_ASSET_CAP_EOK
      ? `총자산 ${s.totalAssetsEok}억 > ${PUBLIC_ASSET_CAP_EOK}억`
      : undefined;

  let loanEok: number | undefined;
  let neededEquityEok: number | undefined;
  let depositEok: number | undefined;
  if (refPriceEok !== undefined) {
    ({ loanEok, neededEquityEok } = neededEquity(refPriceEok, s));
    depositEok = Math.round(refPriceEok * s.depositPct) / 100;
  }
  const pass = region === "in" && price !== "over" && !assetBlocked;
  return {
    region,
    price,
    assetBlocked,
    pass,
    status: pass ? "candidate" : "rejected",
    tickets: ticketsOf(n),
    minPriceEok,
    maxPriceEok,
    refType: ref?.type,
    refPriceEok,
    loanEok,
    neededEquityEok,
    depositEok,
    depositWarn: depositEok !== undefined && depositEok > s.liquidEok,
  };
}
