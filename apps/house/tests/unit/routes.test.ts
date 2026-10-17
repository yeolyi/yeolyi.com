import assert from "node:assert/strict";
import { test } from "node:test";
import {
  anyRouteOpen,
  routesOf,
} from "../../supabase/functions/_shared/routes.ts";
import {
  DEFAULT_SETTINGS,
  emptyPerson,
  type Settings,
} from "../../supabase/functions/_shared/types.ts";
import { notice, settings, unit } from "./helpers.ts";

const n = () =>
  notice({ units: [unit(90000, { newlywed: 10, newborn: 3, multiChild: 2 })] });

test("길: 사는 곳만 넣었으면 통장을 몰라 1순위는 모름으로 열려 있다", () => {
  // 혼인신고일·자녀 수는 비어 있으면 "안 함·0명"으로 본다(개인화 기본값). 그래서 신혼·신생아·다자녀는 처음부터 닫힌다
  const empty: Settings = {
    ...DEFAULT_SETTINGS,
    people: [{ ...emptyPerson("나"), sido: "경기", sigungu: "성남시" }],
  };
  const by = Object.fromEntries(routesOf(n(), empty).map((r) => [r.key, r.ok]));
  assert.equal(by.general, null);
  assert.equal(anyRouteOpen(n(), empty), true);
});

test("길: 자녀 0명이면 신생아·다자녀는 닫히고, 혼인 안 했으면 민영 신혼도 닫힌다", () => {
  const s = settings({ children: 0, marriedAt: "" });
  const by = Object.fromEntries(routesOf(n(), s).map((r) => [r.key, r.ok]));
  assert.equal(by.newborn, false);
  assert.equal(by.multiChild, false);
  assert.equal(by.newlywed, false);
});

test("길: 공공분양은 집이 있으면 특공·1순위가 모두 닫혀 남는 길이 없다", () => {
  const pub = notice({
    publicHousing: true,
    units: [unit(90000, { newlywed: 10, newborn: 3 })],
  });
  const s = settings({ ownsHome: true, everOwned: true, totalAssetsEok: 2 });
  assert.equal(anyRouteOpen(pub, s), false);
});

test("길: 권역 밖 공고는 목록에서 빠지므로 길을 따지지 않는다", () => {
  assert.deepEqual(
    routesOf(notice({ sido: "부산", address: "부산광역시" }), settings()),
    [],
  );
});
