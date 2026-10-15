import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bonusPoints,
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
    [59, 84, 101].map((a) => privatePointShare(a, true)),
    [40, 70, 80],
  );
  assert.deepEqual(
    [59, 84, 101].map((a) => privatePointShare(a, false)),
    ["공고", "공고", 0],
  );
});
