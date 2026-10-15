import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bonusPoints,
  pointsOf,
  privatePointShare,
} from "../../supabase/functions/_shared/rules.ts";

test("가점 무주택기간: 만 30세 전에 혼인했으면 혼인신고일부터 센다", () => {
  const b = bonusPoints({
    birth: "1990-01-01",
    marriedAt: "2015-01-01",
    today: "2020-06-01",
    accountYears: 3,
  });
  assert.equal(b.start.from, "혼인신고일");
  assert.equal(Math.floor(b.homelessYears), 5);
  assert.equal(b.homeless, 12); // 1년 미만 2 + 해마다 2
  assert.equal(b.dependents, 10); // 배우자 1명
});

test("가점 무주택기간: 미혼이면 만 30세부터, 그 전이면 0", () => {
  assert.equal(
    bonusPoints({ birth: "1990-01-01", today: "2019-06-01", accountYears: 1 })
      .homeless,
    0,
  );
  const b = bonusPoints({
    birth: "1990-01-01",
    today: "2022-06-01",
    accountYears: 1,
  });
  assert.equal(b.start.from, "만 30세가 되는 날");
  assert.equal(b.homeless, 6);
});

test("민영 가점 비율(제28조): 투기과열 40/70/80, 그 밖은 85㎡ 이하 공고·초과 추첨", () => {
  assert.deepEqual(
    [59, 84, 101].map((a) => privatePointShare(a, "투기과열")),
    [40, 70, 80],
  );
  assert.deepEqual(
    [59, 84, 101].map((a) => privatePointShare(a, "수도권")),
    ["공고", "공고", 0],
  );
});

test("민영 가점 비율(제28조): 청약과열지역은 85㎡ 초과 50%", () => {
  assert.equal(privatePointShare(101, "청약과열"), 50);
});

test("가점: 배우자 통장은 가입 기간의 절반을 같은 표로 셈해 최대 3점, 통장 합계는 17점까지(별표 1 비고 2)", () => {
  const base = { homelessYears: 0, dependents: 1 };
  // 배우자 1년 → 6개월 → 2점
  assert.equal(
    pointsOf({ ...base, accountYears: 3, spouseAccountYears: 1 }).account,
    5 + 2,
  );
  // 배우자 10년 → 5년 → 7점이지만 3점까지
  assert.equal(
    pointsOf({ ...base, accountYears: 3, spouseAccountYears: 10 }).spouse,
    3,
  );
  // 본인 15년(17점)이면 더해도 17
  assert.equal(
    pointsOf({ ...base, accountYears: 15, spouseAccountYears: 10 }).account,
    17,
  );
  // 혼인신고 전이면 더하지 않는다
  assert.equal(
    bonusPoints({
      birth: "1999-10-13",
      today: "2026-10-16",
      accountYears: 3,
      spouseAccountYears: 10,
    }).spouse,
    0,
  );
});

test("가점: 집이 있으면 무주택 0점, 부양가족은 넘겨준 수", () => {
  const b = bonusPoints({
    birth: "1980-01-01",
    marriedAt: "2010-01-01",
    today: "2026-10-16",
    accountYears: 10,
    ownsHome: true,
    dependents: 3,
  });
  assert.equal(b.homeless, 0);
  assert.equal(b.dependents, 20);
});
