import { classify, isRegulatedZone, type NoticeClass } from "./classify.ts";
import { addYears, fmtYears, yearsBetween } from "./dates.ts";
import type { Notice, Person, Settings } from "./types.ts";

// 청약 요건을 조문 단위의 데이터로 둔다. 공고 분류(classify)가 정해지면 어떤 요건이 붙는지가 정해지고,
// 사람 답과 맞춰 본 결과가 Check 다. 판정(eligibility·verdict)과 화면(내 자격 표)이 모두 이것 하나를 본다.
// ok: true 충족 · false 미충족 · null 모름(답이 비었거나 공고문에만 있는 조건). need 는 모름일 때 채울 개인화 질문 id.

export type Check = {
  id: string;
  label: string; // 요구 조건
  law: string; // 근거 조문
  ok: boolean | null;
  mine: string; // 우리 상태
  need?: string; // 개인화 질문 id
};

/** 결과 하나로: 하나라도 미충족이면 false, 다 충족이면 true, 아니면(모름이 섞임) null. */
export const allOk = (cs: Check[]): boolean | null =>
  cs.some((c) => c.ok === false)
    ? false
    : cs.every((c) => c.ok === true)
      ? true
      : null;

// ── 통장 기간·횟수(제27조 ①·제28조 ①). 규제지역은 2년·24회, 수도권 1년·12회(시·도가 2년·24회까지 늘릴 수 있음), 수도권 밖 6개월·6회.
export function rank1Account(c: NoticeClass) {
  if (isRegulatedZone(c.zone))
    return { years: 2, count: 24, extendable: false };
  if (c.zone === "수도권") return { years: 1, count: 12, extendable: true };
  return { years: 0.5, count: 6, extendable: true };
}

// ── 민영 예치기준금액(별표 2). 신청자가 사는 곳 × 넣을 주택형 전용면적. 만 원.
const DEPOSIT = {
  "서울·부산": [300, 600, 1000, 1500],
  "그 밖의 광역시": [250, 400, 700, 1000],
  "그 밖의 지역": [200, 300, 400, 500],
} as const;
export type DepositRegion = keyof typeof DEPOSIT;
export const depositRegion = (sido: string): DepositRegion =>
  sido === "서울" || sido === "부산"
    ? "서울·부산"
    : ["인천", "대구", "광주", "대전", "울산"].includes(sido)
      ? "그 밖의 광역시"
      : "그 밖의 지역";
const bandIndex = (area: number) =>
  area <= 85 ? 0 : area <= 102 ? 1 : area <= 135 ? 2 : 3;
export const BAND_LABEL = [
  "85㎡ 이하",
  "102㎡ 이하",
  "135㎡ 이하",
  "모든 면적",
];
export const depositNeeded = (sido: string, area: number) =>
  DEPOSIT[depositRegion(sido)][bandIndex(area)];

/** 공고의 주택형 전용면적들. 주택형 이름("084.9800A")에서 읽고, 없으면 공급면적 ÷ 1.3. */
export const exclusiveAreas = (n: Notice) =>
  (n.units ?? [])
    .map((u) => Number.parseFloat(u.type) || u.area / 1.3)
    .filter((a) => a > 0);

/** 예치금으로 넣을 수 있는 가장 큰 면적대 이름. 하나도 안 되면 undefined. */
function depositReach(sido: string, paidMan: number) {
  const row = DEPOSIT[depositRegion(sido)];
  let i = -1;
  row.forEach((v, k) => {
    if (paidMan >= v) i = k;
  });
  return i < 0 ? undefined : BAND_LABEL[i];
}

function depositCheck(p: Person, n: Notice, idx: number, law: string): Check {
  const areas = exclusiveAreas(n);
  const smallest = areas.length ? Math.min(...areas) : 85;
  const need = depositNeeded(p.sido, smallest);
  const reach = depositReach(p.sido, p.accountPaidMan);
  return {
    id: `p${idx}-deposit`,
    label: `예치금 ${need}만 원 이상(${depositRegion(p.sido)} 거주, ${areas.length ? BAND_LABEL[bandIndex(smallest)] : "85㎡ 이하 기준"})`,
    law,
    ok: p.accountPaidMan >= need,
    mine: `${p.accountPaidMan.toLocaleString()}만 원${reach ? ` · ${reach}까지` : ""}`,
    need: `p${idx}-paid`,
  };
}

const householderCheck = (p: Person, idx: number, law: string): Check => ({
  id: `p${idx}-householder`,
  label: "세대주",
  law,
  ok: p.householder,
  mine: p.householder ? "세대주" : "세대원",
  need: `p${idx}-householder`,
});

/** 가구 조건: 무주택(국민주택·규제지역·특공 공통) */
export const homelessCheck = (s: Settings, law: string): Check => ({
  id: "homeless",
  label: "무주택 가구(세대원 모두 집이 없음)",
  law,
  ok: s.ownsHome === null ? null : !s.ownsHome,
  mine: s.ownsHome === null ? "" : s.ownsHome ? "집이 있음" : "집 없음",
  need: "ownshome",
});
/** 가구 조건: 최근 5년 안에 세대원 누구도 당첨되지 않음(규제지역 1순위) */
export const noRecentWinCheck = (s: Settings, law: string): Check => ({
  id: "nowin",
  label: "최근 5년 안 세대원 당첨 없음",
  law,
  ok: s.wonRecently === null ? null : !s.wonRecently,
  mine: s.wonRecently === null ? "" : s.wonRecently ? "당첨된 적 있음" : "없음",
  need: "wonrecently",
});

/** 일반공급 1순위(제27조 ①·제28조 ①). 사람 한 명분. */
export function rank1Checks(
  p: Person,
  idx: number,
  n: Notice,
  s: Settings,
  today: string,
): Check[] {
  const c = classify(n);
  const rule = rank1Account(c);
  const law = c.housing === "국민" ? "규칙 제27조 ①" : "규칙 제28조 ①";
  const years = p.accountOpenedAt ? yearsBetween(p.accountOpenedAt, today) : 0;
  const span = rule.years >= 1 ? `${rule.years}년` : "6개월";
  const out: Check[] = [
    {
      id: `p${idx}-years`,
      label: `통장 가입 ${span}${rule.extendable ? "(시·도가 늘렸으면 공고문의 기간)" : ""}`,
      law,
      ok: p.accountOpenedAt ? years >= rule.years : null,
      mine: p.accountOpenedAt
        ? `${fmtYears(years)}${years < rule.years ? ` · ${addYears(p.accountOpenedAt, rule.years)}에 참` : ""}`
        : "",
      need: `p${idx}-account`,
    },
  ];
  if (c.housing === "국민")
    out.push({
      id: `p${idx}-count`,
      label: `납입 ${rule.count}회 이상`,
      law,
      ok: p.accountCount >= rule.count,
      mine: `${p.accountCount}회`,
      need: `p${idx}-count`,
    });
  else out.push(depositCheck(p, n, idx, "규칙 제28조 ①, 별표 2"));
  if (isRegulatedZone(c.zone)) {
    out.push(householderCheck(p, idx, law), noRecentWinCheck(s, law));
    if (c.housing === "국민") out.push(homelessCheck(s, law));
    // 민영: 2주택 이상 세대는 1순위가 아니다(제28조 ① 1호 다목 4)). 집 수는 묻지 않으니 집이 있으면 모름
    else
      out.push({
        id: "twohomes",
        label: "세대가 2주택 이상이 아님",
        law,
        ok: s.ownsHome === null ? null : s.ownsHome ? null : true,
        mine:
          s.ownsHome === null
            ? ""
            : s.ownsHome
              ? "집이 있음 · 몇 채인지 확인"
              : "집 없음",
        need: "ownshome",
      });
  }
  return out;
}

/** 특별공급 통장(제48조): 국민 6개월·6회, 민영 6개월 + 예치금. */
export function specialAccountChecks(
  p: Person,
  idx: number,
  n: Notice,
  today: string,
): Check[] {
  const c = classify(n);
  const years = p.accountOpenedAt ? yearsBetween(p.accountOpenedAt, today) : 0;
  const out: Check[] = [
    {
      id: `p${idx}-sp-years`,
      label: "통장 가입 6개월",
      law: "규칙 제48조",
      ok: p.accountOpenedAt ? years >= 0.5 : null,
      mine: p.accountOpenedAt ? fmtYears(years) : "",
      need: `p${idx}-account`,
    },
  ];
  if (c.housing === "국민")
    out.push({
      id: `p${idx}-sp-count`,
      label: "납입 6회 이상",
      law: "규칙 제48조",
      ok: p.accountCount >= 6,
      mine: `${p.accountCount}회`,
      need: `p${idx}-count`,
    });
  else out.push(depositCheck(p, n, idx, "규칙 제48조, 별표 2"));
  return out;
}

/** 무순위·재공급·임의공급 등 순위 없는 공급의 가구 요건. 거주 요건처럼 공고문에만 있는 건 모름으로. */
export function noRankChecks(n: Notice, s: Settings): Check[] {
  const c = classify(n);
  if (c.supply === "무순위")
    return [
      homelessCheck(s, "규칙 제26조 ⑤"),
      {
        id: "residence",
        label:
          "거주 요건(기본은 전국. 시·군·구가 해당지역·권역으로 좁혔을 수 있음)",
        law: "규칙 제26조 ⑤",
        ok: null,
        mine: "공고문 확인",
      },
    ];
  // 해당 시·군 거주는 화면 맨 위 지역 줄이 이미 본다
  if (c.supply === "재공급") {
    const head = s.people.find((p) => p.householder);
    return [
      homelessCheck(s, "규칙 제47조의3 ②"),
      {
        id: "householder",
        // 특별공급으로 나왔던 집을 다시 파는 물량은 그 특공 요건으로 뽑아 세대주를 따지지 않는다(제47조의3 ③)
        label: (n.units ?? []).some((u) => u.special > 0)
          ? "세대주(특별공급 물량은 그 특공 요건으로 뽑아 세대주를 따지지 않음)"
          : "세대주",
        law: "규칙 제47조의3 ②·③",
        ok: head ? true : null,
        mine: head ? `${head.name}: 세대주` : "세대주인 사람이 없음",
        need: "p0-householder",
      },
      {
        id: "limits",
        label: "재당첨 제한 등 제한기간이 아님",
        law: "규칙 제47조의3 ②",
        ok: s.wonRecently === false ? true : null,
        mine: s.wonRecently === false ? "최근 당첨 없음" : "",
        need: "wonrecently",
      },
    ];
  }
  if (c.supply === "임의공급")
    return [
      {
        id: "rules",
        label: "자격·방법은 사업주체가 정함",
        law: "규칙 제28조 ⑩",
        ok: null,
        mine: "공고문 확인",
      },
    ];
  if (c.supply === "LH잔여")
    return [
      {
        id: "rules",
        label: "자격·방법은 LH 공고가 정함",
        law: "규칙 제26조 ⑤",
        ok: null,
        mine: "공고문 확인",
      },
    ];
  return [];
}
