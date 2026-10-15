import type { Notice } from "./types.ts";

// 공고를 법이 쓰는 축으로 나눈다. 요건(requirements.ts)은 이 분류만 보고 정해진다.
//  · 주택: 국민주택(공공) / 민영주택 — 청약홈 HOUSE_DTL_SECD, 마이홈은 모두 공공
//  · 공급: 본청약 / 무순위(제26조 ⑤) / 재공급(불법행위로 계약취소된 주택, 제47조의3) / 임의공급(사업주체가 정함)
//          / 공공임대(분양전환 가능 임대, 이 서비스는 판정하지 않음) / LH잔여(LH 가 직접 파는 남은 집, 공고문이 정함)
//          / 매각(오피스텔·매입임대·다세대 일반매각처럼 청약이 아닌 판매) / 모름(처음 보는 구분)
//  · 지역: 투기과열지구 / 청약과열지역(조정대상지역) / 수도권 / 수도권 외 — 공고마다 청약홈 칸으로 온다
// 원본에 없는 건 추측하지 않고 "모름"으로 둔다. 그러면 요건이 "공고문 확인"으로 드러난다.

export type Housing = "국민" | "민영";
export type Supply =
  | "본청약"
  | "무순위"
  | "재공급"
  | "임의공급"
  | "공공임대"
  | "LH잔여"
  | "매각"
  | "모름";
export type Zone = "투기과열" | "청약과열" | "수도권" | "수도권외";
export type NoticeClass = { housing: Housing; supply: Supply; zone: Zone };

export const METRO = ["서울", "인천", "경기"];
const SALE = /오피스텔|매입임대|다세대|미분양매입|일반매각|도시형생활주택|상가/;

export function supplyOf(n: Notice): Supply {
  if (n.source === "myhome") return SALE.test(n.name) ? "매각" : "LH잔여";
  // 청약홈 공급 구분(HOUSE_SECD): 01 APT · 10 신혼희망타운 · 04 무순위 · 06 불법행위 재공급 · 11 임의공급. 그 밖(민간사전청약 등)은 모름.
  switch (n.houseSecd) {
    case "04":
      return "무순위";
    case "06":
      return "재공급";
    case "11":
      return "임의공급";
    case "01":
    case "10":
    case undefined: // 구분을 받기 전에 쌓인 공고는 kind 로 본다
      break;
    default:
      return "모름";
  }
  if (n.kind === "임의공급") return "임의공급";
  if (n.kind === "잔여세대")
    return /^ah:\d{4}93/.test(n.id) ? "재공급" : "무순위";
  if (n.rental) return "공공임대";
  return "본청약";
}

export function zoneOf(n: Notice): Zone {
  if (n.regulated) return "투기과열";
  if (n.adjusted) return "청약과열";
  return METRO.includes(n.sido) ? "수도권" : "수도권외";
}

export const classify = (n: Notice): NoticeClass => ({
  housing: n.publicHousing ? "국민" : "민영",
  supply: supplyOf(n),
  zone: zoneOf(n),
});

/** 규제지역(투기과열지구·청약과열지역). 1순위가 2년·세대주·5년 무당첨으로 엄격해진다. */
export const isRegulatedZone = (z: Zone) =>
  z === "투기과열" || z === "청약과열";
