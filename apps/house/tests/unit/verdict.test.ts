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
    multiChild: 0,
    elderly: 0,
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

test("지역: 사는 시도의 권역(제4조 ③) 안이면 후보. 경기에 살면 서울·인천도, 대전에 사는 배우자가 있으면 세종도", () => {
  assert.equal(judge(notice({ sido: "인천" }), s).region, "in");
  const s2 = settings({
    people: [s.people[0]!, { ...s.people[1]!, sido: "대전" }],
  });
  assert.equal(judge(notice({ sido: "세종" }), s2).region, "in");
  assert.equal(judge(notice({ sido: "부산" }), s2).region, "out");
  // 사는 곳을 안 넣었으면 거르지 않는다
  const none = settings({ people: [{ ...s.people[0]!, sido: "" }] });
  assert.equal(judge(notice({ sido: "부산" }), none).region, "in");
});
