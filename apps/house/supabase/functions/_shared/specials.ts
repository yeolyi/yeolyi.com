import { classify, isRegulatedZone } from "./classify.ts";
import { yearsBetween } from "./dates.ts";
import { earners, incomePct, personFilled } from "./eligibility.ts";
import {
  type Check,
  exclusiveAreas,
  homelessCheck,
  rank1Checks,
  specialAccountChecks,
} from "./requirements.ts";
import {
  INCOME_BASE_YEAR,
  PUBLIC_FIRST_HOME_SAVINGS_MAN,
  REAL_ESTATE_CAP_EOK,
  SPECIAL_TIERS,
  type SpecialKey,
  type SpecialRule,
} from "./rules.ts";
import type { Notice, Person, Settings } from "./types.ts";
import { ticketsOf } from "./verdict.ts";

// 신혼부부 말고 다른 특별공급(신생아·생애최초·다자녀·노부모·청년)의 요건 표. 신혼과 같이 requirements.ts 의 Check 로 낸다.
// 공공분양은 공공주택 특별법 시행규칙 별표 6, 민영은 주택공급에 관한 규칙의 각 조문. 배점표가 고시에만 있는 것(다자녀)은 계산하지 않는다.

export type SpecialPlan = {
  key: SpecialKey;
  title: string;
  law: string;
  units: number;
  /** 같은 자격끼리 누가 먼저인가. 한 문장. */
  how: string;
  /** 소득 구간(소득을 안 보는 공급은 한 줄짜리) */
  rule?: SpecialRule;
  checks: Check[];
};

const yesNo = (
  id: string,
  label: string,
  law: string,
  v: boolean | null,
  want: boolean,
  text: [yes: string, no: string],
  need: string,
): Check => ({
  id,
  label,
  law,
  ok: v === null ? null : v === want,
  mine: v === null ? "" : v ? text[0] : text[1],
  need,
});

/** 사람마다 통장 요건. 가구 단위(무주택·5년 내 당첨)는 따로 한 번만 넣으니 뺀다. 정보가 빈 사람은 넣기 줄 하나. */
function accountRows(
  s: Settings,
  n: Notice,
  today: string,
  kind: "rank1" | "special",
  extra?: (p: Person, idx: number) => Check[],
): Check[] {
  return s.people.flatMap((p, idx) => {
    if (!personFilled(p))
      return [
        {
          id: `p${idx}-missing`,
          label: `${p.name}: 통장·주소`,
          law: "",
          ok: null,
          mine: "",
          need: `p${idx}-birth`,
        },
      ];
    const cs =
      kind === "rank1"
        ? rank1Checks(p, idx, n, s, today)
        : specialAccountChecks(p, idx, n, today);
    return [...cs, ...(extra?.(p, idx) ?? [])]
      .filter((c) => c.id !== "homeless" && c.id !== "nowin")
      .map((c) => ({
        ...c,
        label: `${p.name}: ${kind === "rank1" ? "1순위 " : "특공 "}${c.label}`,
      }));
  });
}
/** 규제지역 1순위의 5년 내 당첨 없음은 가구 단위라 한 번만. */
const householdRank1 = (s: Settings, n: Notice, today: string) => {
  const p = s.people.find(personFilled);
  return p
    ? rank1Checks(p, 0, n, s, today).filter((c) => c.id === "nowin")
    : [];
};

/** 소득 자격. 상한이 없으면 줄이 없다. 민영 신생아·생애최초는 넘어도 부동산 3.31억 이하면 된다. */
function incomeCheck(
  rule: SpecialRule,
  s: Settings,
  n: Notice,
  law: string,
): Check[] {
  if (rule.capPct === undefined) return [];
  const pct = incomePct(s);
  const thisYear = n.announcedAt.startsWith(String(INCOME_BASE_YEAR));
  const over = pct !== undefined && pct > rule.capPct;
  const re = s.realEstateEok;
  const viaRealEstate = rule.realEstateAlt && over;
  return [
    {
      id: "income",
      label: `가구 소득 ${rule.capPct}% 이하(${earners(s)})${rule.realEstateAlt ? `, 넘으면 부동산 ${REAL_ESTATE_CAP_EOK}억 이하` : ""}`,
      law,
      ok:
        pct === undefined || !thisYear
          ? null
          : !over
            ? true
            : viaRealEstate
              ? re === null
                ? null
                : re <= REAL_ESTATE_CAP_EOK
              : false,
      mine:
        pct === undefined
          ? ""
          : !thisYear
            ? `${n.announcedAt.slice(0, 4)}년 공고라 그해 공고문 기준표 확인`
            : `우리 가구 ${pct}%${viaRealEstate && re !== null ? ` · 부동산 ${re}억` : ""}`,
      need: viaRealEstate && re === null ? "realestate" : "income",
    },
  ];
}

const childrenText = (s: Settings) => `자녀 ${s.children}명`;

export function specialsOf(
  n: Notice,
  s: Settings,
  today: string,
): SpecialPlan[] {
  const t = ticketsOf(n);
  const c = classify(n);
  const pub = n.publicHousing;
  const sector = pub ? "public" : "private";
  const e = earners(s);
  const B6 = "공공주택 특별법 시행규칙 별표 6";
  const out: SpecialPlan[] = [];
  const married = !!s.marriedAt;

  if (t.newborn > 0) {
    const law = pub ? `${B6} 2.마` : "규칙 제35조의3 ③";
    const rule = SPECIAL_TIERS.newborn[sector][e];
    out.push({
      key: "newborn",
      title: "신생아 특별공급",
      law,
      units: t.newborn,
      rule,
      how: pub
        ? "소득 구간으로 나눠 뽑고, 같은 구간에서 경쟁하면 점수(소득·미성년 자녀 수·거주 기간·납입 횟수) 순, 같으면 추첨입니다."
        : "소득 구간으로 나눠 구간마다 추첨합니다.",
      checks: [
        s.children === 0
          ? {
              id: "baby",
              label: "2세 미만 자녀(태아·입양 포함)",
              law,
              ok: false,
              mine: "자녀 0명",
              need: "children",
            }
          : yesNo(
              "baby",
              "2세 미만 자녀(태아·입양 포함)",
              law,
              s.newbornChild,
              true,
              ["있음", "없음"],
              "newborn",
            ),
        homelessCheck(s, law),
        ...(pub ? [] : householdRank1(s, n, today)),
        ...accountRows(s, n, today, pub ? "special" : "rank1"),
        ...incomeCheck(rule, s, n, law),
      ],
    });
  }

  if (t.firstHome > 0) {
    const law = pub ? `${B6} 2.다` : "규칙 제43조 ③";
    const rule = SPECIAL_TIERS.firstHome[sector][e];
    const small = exclusiveAreas(n).some((a) => a <= 60);
    const family = married || s.children > 0;
    out.push({
      key: "firstHome",
      title: "생애최초 특별공급",
      law,
      units: t.firstHome,
      rule,
      how: "소득 구간으로 나눠 구간마다 추첨합니다.",
      checks: [
        yesNo(
          "everowned",
          "세대원 모두 집을 가진 적 없음(배우자가 혼인 전에 가졌던 건 빼고 셈)",
          pub ? law : "규칙 제43조 ③, 제55조의3",
          s.everOwned,
          false,
          ["가진 적 있음", "없음"],
          "everowned",
        ),
        homelessCheck(s, law),
        {
          id: "family",
          label: pub
            ? "혼인 중이거나 자녀가 있음"
            : "혼인 중이거나 자녀가 있음(아니면 1인 가구로 60㎡ 이하·추첨 몫만)",
          law,
          ok: family ? true : pub ? false : small,
          mine: family
            ? married
              ? "혼인 중"
              : childrenText(s)
            : pub
              ? "혼인신고 안 함 · 자녀 없음"
              : small
                ? "1인 가구로 60㎡ 이하만"
                : "1인 가구인데 60㎡ 이하 주택형이 없음",
          need: family ? undefined : "married",
        },
        yesNo(
          "tax",
          "넣을 사람이 소득세를 5년 이상 냄",
          law,
          s.taxFiveYears,
          true,
          ["5년 이상", "5년 안 됨"],
          "tax",
        ),
        ...(pub ? [] : householdRank1(s, n, today)),
        ...accountRows(s, n, today, "rank1", (p, idx) =>
          pub
            ? [
                {
                  id: `p${idx}-savings`,
                  label: `저축액 ${PUBLIC_FIRST_HOME_SAVINGS_MAN}만 원 이상`,
                  law,
                  ok: p.accountPaidMan >= PUBLIC_FIRST_HOME_SAVINGS_MAN,
                  mine: `${p.accountPaidMan.toLocaleString()}만 원`,
                  need: `p${idx}-paid`,
                },
              ]
            : [],
        ),
        ...incomeCheck(rule, s, n, law),
      ],
    });
  }

  if (t.multiChild > 0) {
    const law = pub ? `${B6} 2.가` : "규칙 제40조";
    const rule = SPECIAL_TIERS.multiChild[sector][e];
    out.push({
      key: "multiChild",
      title: "다자녀 특별공급",
      law,
      units: t.multiChild,
      rule,
      how: "자녀 수·영유아·세대 구성·무주택 기간·거주 기간·통장 기간으로 매긴 배점(국토교통부 고시) 순입니다. 이 서비스는 배점을 계산하지 않습니다.",
      checks: [
        {
          id: "kids",
          label: "미성년 자녀 2명 이상(태아·입양 포함)",
          law,
          ok: s.children >= 2,
          mine: childrenText(s),
          need: "children",
        },
        homelessCheck(s, law),
        ...accountRows(s, n, today, "special"),
        ...incomeCheck(rule, s, n, law),
      ],
    });
  }

  if (t.elderly > 0) {
    const law = pub ? `${B6} 2.라` : "규칙 제46조";
    const rule = SPECIAL_TIERS.elderly[sector][e];
    out.push({
      key: "elderly",
      title: "노부모 부양 특별공급",
      law,
      units: t.elderly,
      rule,
      how: pub
        ? "소득 우선 몫은 일반공급 1순위처럼 무주택 기간·저축액 순서로 뽑고, 나머지는 추첨입니다."
        : "1순위 안에서 가점 순, 같으면 통장 가입 기간이 긴 사람, 그래도 같으면 추첨입니다.",
      checks: [
        yesNo(
          "elder",
          "만 65세 이상 부모(배우자 부모 포함)를 3년 이상 같은 등본에서 부양",
          law,
          s.elderParent,
          true,
          ["부양함", "아님"],
          "elder",
        ),
        homelessCheck(s, law),
        ...householdRank1(s, n, today),
        // 민영은 세대주만(제46조 ① 2호). 규제지역이면 1순위 요건에 이미 세대주 줄이 있다.
        ...accountRows(s, n, today, "rank1", (p, idx) =>
          pub || isRegulatedZone(c.zone)
            ? []
            : [
                {
                  id: `p${idx}-householder`,
                  label: "세대주",
                  law,
                  ok: p.householder,
                  mine: p.householder ? "세대주" : "세대원",
                  need: `p${idx}-householder`,
                },
              ],
        ),
        ...incomeCheck(rule, s, n, law),
      ],
    });
  }

  // 청년 특공은 국민주택에만 있다(제35조의2). 민영에 칸이 와도 판정하지 않는다.
  if (t.young > 0 && pub) {
    const law = "규칙 제35조의2, 공공주택 특별법 시행규칙 별표 6의6";
    out.push({
      key: "young",
      title: "청년 특별공급",
      law,
      units: t.young,
      how: "60㎡ 이하만 공급합니다. 물량의 30%는 소득세를 5년 이상 낸 청년에게 점수(본인 소득·시·도 거주 기간·납입 횟수) 순으로 먼저 주고, 나머지도 점수 순, 같으면 추첨입니다. 1인 1주택 기준이라 세대원도 각자 넣습니다.",
      checks: [
        {
          id: "small",
          label: "전용 60㎡ 이하 주택형",
          law: "공공주택 특별법 시행규칙 별표 6의6 2.가",
          ok: exclusiveAreas(n).some((a) => a <= 60),
          mine: exclusiveAreas(n).some((a) => a <= 60)
            ? "있음"
            : "이 공고엔 없음",
        },
        ...s.people.map((p, idx): Check => {
          const age = p.birth
            ? Math.floor(yearsBetween(p.birth, n.announcedAt))
            : undefined;
          return {
            id: `p${idx}-age`,
            label: `${p.name}: 만 19~39세`,
            law,
            ok: age === undefined ? null : age >= 19 && age <= 39,
            mine: age === undefined ? "" : `만 ${age}세`,
            need: `p${idx}-birth`,
          };
        }),
        {
          id: "single",
          label: "혼인 중이 아님",
          law,
          ok: !married,
          mine: married ? "혼인 중" : "혼인신고 안 함",
          need: "married",
        },
        {
          id: "neverowned",
          label: "본인이 집을 가진 적 없음(세대원의 집은 상관없음)",
          law,
          // 질문은 세대 단위라 "있음"이면 본인 것인지 알 수 없다
          ok: s.everOwned === false ? true : null,
          mine:
            s.everOwned === null
              ? ""
              : s.everOwned
                ? "세대에 가진 적 있음 · 본인인지 확인"
                : "없음",
          need: "everowned",
        },
        ...accountRows(s, n, today, "special"),
        {
          // 가구가 아니라 본인 소득이라 개인화의 가구 월소득으로는 알 수 없다
          id: "young-income",
          label:
            "본인 월소득이 1인 가구 기준 도시근로자 월평균소득의 140% 이하",
          law: "공공주택 특별법 시행규칙 별표 6의6 2.가 1)다)",
          ok: null,
          mine: "본인 소득은 묻지 않음 · 공고문 기준표 확인",
        },
        {
          id: "young-asset",
          label: "자산 기준(제13조 ③)",
          law: "공공주택 특별법 시행규칙 별표 6의6 2.가 1)가)",
          ok: null,
          mine: "공고문 확인",
        },
      ],
    });
  }
  return out;
}

/** 소득으로 시작하는 몫. 소득을 모르면 -1, 상한을 넘으면 tiers.length. */
export function landingOf(rule: SpecialRule, pct: number | undefined) {
  if (pct === undefined) return -1;
  const i = rule.tiers.findIndex(
    (x) => x.capPct === undefined || pct <= x.capPct,
  );
  return i < 0 ? rule.tiers.length : i;
}
