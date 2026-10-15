import assert from "node:assert/strict";
import { test } from "node:test";
import { judge } from "../../supabase/functions/_shared/verdict.ts";
import { notice, settings, unit } from "./helpers.ts";

const s = settings();

test("고른 시도 안이면 후보. 분양가는 판정하지 않고 범위만 적는다", () => {
  const v = judge(
    notice({
      units: [
        unit(100000, { young: 3, newlywed: 8 }),
        unit(246000, { type: "084A" }),
      ],
    }),
    s,
  );
  assert.equal(v.region, "in");
  assert.equal(v.status, "candidate");
  assert.deepEqual(v.tickets, {
    young: 3,
    newlywed: 8,
    firstHome: 0,
    newborn: 0,
  });
  assert.equal(v.minPriceEok, 10);
  assert.equal(v.maxPriceEok, 24.6);
});

test("고른 시도 밖이면 탈락", () => {
  assert.equal(judge(notice({ sido: "부산" }), s).region, "out");
  assert.equal(judge(notice({ sido: "부산" }), s).status, "rejected");
});

test("신혼희망타운·나눔·선택형은 총자산 3.62억을 넘으면 신청 불가 → 탈락. 특공 물량은 special이 곧 신혼", () => {
  const sh = notice({
    kind: "신혼희망타운",
    publicHousing: true,
    units: [unit(79000, { special: 145 })],
  });
  const v = judge(sh, s);
  assert.equal(v.assetBlocked, "총자산 5.8억 > 3.62억");
  assert.equal(v.status, "rejected");
  assert.equal(v.tickets.newlywed, 145);
  assert.equal(judge(sh, settings({ totalAssetsEok: 3 })).status, "candidate");
  assert.equal(
    judge(
      notice({
        publicHousing: true,
        publicType: "일반형",
        units: [unit(79000)],
      }),
      s,
    ).assetBlocked,
    undefined,
  );
});
