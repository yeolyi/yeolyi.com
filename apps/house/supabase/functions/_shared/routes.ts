import { classify } from "./classify.ts";
import {
  earners,
  incomePct,
  newlywedCheck,
  newlywedTiersFor,
  personFilled,
  stagedNewlywed,
} from "./eligibility.ts";
import {
  type Check,
  exclusiveAreas,
  homelessCheck,
  rank1Checks,
} from "./requirements.ts";
import { INCOME_BASE_YEAR, PUBLIC_GENERAL } from "./rules.ts";
import { isMainRound } from "./site.ts";
import { accountRows, planOk, specialsOf } from "./specials.ts";
import type { Notice, Settings } from "./types.ts";
import { judge } from "./verdict.ts";

// 공고 하나에 넣을 길(신혼 특공·다른 특공·일반 1순위)마다 넣을 수 있나. 개인화 화면이 "답할 때마다 몇 건 남았나"를 세려고 쓴다.
// 재료는 상세의 내 자격 표(MyEligibility)와 같다. 결과만 낸다: true 충족 · false 미충족 · null 모름(아직 답이 없음 등).
// asOf 는 자격 기준일(입주자모집공고일).

export type RouteKey = "newlywed" | "general" | string;
export type Route = { key: RouteKey; ok: boolean | null };

export function routesOf(
  n: Notice,
  s: Settings,
  asOf = n.announcedAt,
): Route[] {
  const v = judge(n, s);
  // 목록에서 이미 빠지는 공고·본청약이 아닌 공고(무순위·임의공급은 통장·순위가 없다)·공공임대는 길을 따지지 않는다
  if (!v.pass || !isMainRound(n) || classify(n).supply === "공공임대")
    return [];
  const routes: Route[] = [];
  const thisYear = n.announcedAt.startsWith(String(INCOME_BASE_YEAR));
  const pct = incomePct(s, n);
  const e = earners(s);

  if (v.tickets.newlywed > 0) {
    const cap = newlywedTiersFor(n, e).at(-1)?.capPct;
    const income: Check = {
      id: "income",
      label: "가구 소득",
      law: "",
      ok:
        pct === undefined || !thisYear ? null : cap === undefined || pct <= cap,
      mine: "",
    };
    routes.push({
      key: "newlywed",
      ok: planOk([
        newlywedCheck(n, s),
        homelessCheck(s, "규칙 제41조 ①"),
        income,
        ...accountRows(s, n, asOf, "special"),
      ]),
    });
  }

  for (const sp of specialsOf(n, s, asOf))
    routes.push({ key: sp.key, ok: planOk(sp.checks) });

  // 신혼희망타운은 일반공급이 없다(별표 6의3)
  if (n.kind !== "신혼희망타운") {
    const smallUnits = exclusiveAreas(n).some((a) => a <= 60);
    const generalIncome: Check[] =
      n.publicHousing && (stagedNewlywed(n) || smallUnits)
        ? [
            {
              id: "general-income",
              label: "가구 소득",
              law: "",
              ok:
                pct === undefined || !thisYear
                  ? null
                  : pct <= PUBLIC_GENERAL.smallAreaCapPct[e],
              mine: "",
            },
          ]
        : [];
    // 가구 단위(무주택·5년 내 당첨)는 accountRows 가 사람 줄에서 빼니 한 번만 더한다
    const household = s.people.length ? accountRowsHousehold(n, s, asOf) : [];
    routes.push({
      key: "general",
      ok: planOk([
        ...household,
        ...generalIncome,
        ...accountRows(s, n, asOf, "rank1"),
      ]),
    });
  }
  return routes;
}

/** 1순위의 가구 단위 줄(무주택·5년 내 당첨·2주택). 답이 있는 첫 사람 기준으로 한 번. */
function accountRowsHousehold(n: Notice, s: Settings, asOf: string): Check[] {
  const i = s.people.findIndex(personFilled);
  if (i < 0) return [];
  const p = s.people[i];
  return p
    ? rank1Checks(p, i, n, s, asOf).filter((c) =>
        ["homeless", "nowin", "twohomes"].includes(c.id),
      )
    : [];
}

/** 넣을 길이 하나라도 아직 열려 있나(미충족이 아닌 길이 있나). 모름은 열린 것으로 센다. */
export const anyRouteOpen = (n: Notice, s: Settings) =>
  routesOf(n, s).some((r) => r.ok !== false);
