import { PUBLIC_ASSET_CAP_EOK, regionsOf } from "./rules.ts";
import type { Notice, Settings } from "./types.ts";

// 공고 하나를 설정에 대고 판정한다. 서버(알림 여부)와 화면(설정을 바꿔 보며 즉시 재계산)이 같은 함수를 쓴다.
// 후보: 사는 곳의 권역 안 + 자산 자격 · 탈락: 하나라도 못 넘음.
// 감당할 수 있는지(자기자본·대출·계약금)는 판정하지 않는다. 돈은 그때 가서 마련하는 경우가 많고, 대출 규제는 자주 바뀐다.
// 법이 정한 자격(소득·자산 상한)만 본다. 통근은 판정하지 않고 길찾기 링크로 사람이 본다.

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
  assetBlocked?: string;
  pass: boolean;
  status: Status;
  tickets: Tickets;
  minPriceEok?: number;
  maxPriceEok?: number;
};

export const manToEok = (man: number) => Math.round(man / 1000) / 10;

/** 두 사람이 사는 시도의 권역(규칙 제4조 ③) 안이면 넣을 수 있다. 사는 곳을 아직 안 넣었으면 거르지 않는다. */
export const regionOf = (n: Notice, s: Settings): Region => {
  const regions = regionsOf(s.people.map((p) => p.sido).filter(Boolean));
  if (!regions.length) return "in";
  return regions.some((r) => r.sidos.includes(n.sido)) ? "in" : "out";
};

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

export function judge(n: Notice, s: Settings): Verdict {
  const region = regionOf(n, s);
  const prices = (n.units ?? [])
    .map((u) => u.topPriceMan ?? 0)
    .filter((p) => p > 0);
  const minPriceEok = prices.length ? manToEok(Math.min(...prices)) : undefined;
  const maxPriceEok = prices.length ? manToEok(Math.max(...prices)) : undefined;
  const assetBlocked =
    assetGated(n) &&
    s.totalAssetsEok !== null &&
    s.totalAssetsEok > PUBLIC_ASSET_CAP_EOK
      ? `총자산 ${s.totalAssetsEok}억 > ${PUBLIC_ASSET_CAP_EOK}억`
      : undefined;

  const pass = region === "in" && !assetBlocked;
  return {
    region,
    assetBlocked,
    pass,
    status: pass ? "candidate" : "rejected",
    tickets: ticketsOf(n),
    minPriceEok,
    maxPriceEok,
  };
}
