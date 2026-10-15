import assert from "node:assert/strict";
import { test } from "node:test";
import {
  account,
  incomeTiers,
  residency,
  who,
} from "../../supabase/functions/_shared/eligibility.ts";
import { depositNeeded } from "../../supabase/functions/_shared/requirements.ts";
import { judge } from "../../supabase/functions/_shared/verdict.ts";
import { notice, settings, TODAY, unit } from "./helpers.ts";

const s = settings();
const [갑, 을] = s.people as [(typeof s.people)[0], (typeof s.people)[0]];
const 성남민영 = notice({ units: [unit(90000, { newlywed: 21 })] });

test("거주: 시도는 맞지만 성남 2년이 안 돼 해당지역은 아직", () => {
  const r = residency(갑, 성남민영, TODAY);
  assert.equal(r.inSido, true);
  assert.equal(r.inCity, true);
  assert.equal(r.localOk, false);
  assert.equal(residency(갑, 성남민영, "2028-01-08").localOk, true);
  assert.equal(
    residency(갑, notice({ regulated: false }), TODAY).localOk,
    true,
  ); // 비규제는 기간 요건 없음
});

test("통장: 특공 6개월(국민 6회 / 민영 예치금), 1순위는 지역 등급별 기간 + 국민 횟수 / 민영 예치금(별표 2) + 규제지역 세대주", () => {
  // 성남(투기과열) 45㎡ 민영, 경기 거주 갑: 2년 · 예치금 200만(그 밖의 지역 85㎡ 이하) · 세대주
  const a = account(갑, 성남민영, TODAY);
  assert.equal(a.special, true);
  assert.equal(a.rank1, true);
  const 공공 = notice({ publicHousing: true });
  assert.equal(account({ ...갑, accountCount: 20 }, 공공, TODAY).rank1, false); // 규제지역 국민 24회
  assert.equal(
    account({ ...갑, accountPaidMan: 150 }, 성남민영, TODAY).rank1,
    false,
  );
  assert.equal(
    account({ ...갑, accountPaidMan: 150 }, 성남민영, TODAY).special,
    false,
  ); // 민영 특공도 예치금
  assert.equal(
    account({ ...갑, accountPaidMan: 150 }, 공공, TODAY).special,
    true,
  );
  assert.equal(
    account({ ...갑, accountOpenedAt: "2026-06-01" }, 성남민영, TODAY).special,
    false,
  );
  const notHead = account({ ...갑, householder: false }, 성남민영, TODAY);
  assert.equal(notHead.rank1, false);
  assert.equal(notHead.rank1Why, "세대주 미충족");
  assert.equal(
    account({ ...갑, householder: false }, notice({ regulated: false }), TODAY)
      .rank1,
    true,
  ); // 비규제는 세대주 무관
});

test("1순위 기간은 지역 등급별: 수도권 비규제 1년·12회, 수도권 밖 6개월·6회, 규제지역 2년·24회 (제27조 ①)", () => {
  const 가입8개월 = { ...갑, accountOpenedAt: "2026-02-01", accountCount: 8 };
  const 국민 = (sido: string, regulated = false) =>
    notice({ publicHousing: true, sido, regulated, address: `${sido} 어딘가` });
  assert.equal(account(가입8개월, 국민("부산"), TODAY).rank1, true);
  assert.equal(account(가입8개월, 국민("경기"), TODAY).rank1, false);
  assert.equal(
    account(
      { ...갑, accountOpenedAt: "2025-06-01", accountCount: 15 },
      국민("경기"),
      TODAY,
    ).rank1,
    true,
  );
  assert.equal(
    account(
      { ...갑, accountOpenedAt: "2025-06-01", accountCount: 15 },
      국민("경기", true),
      TODAY,
    ).rank1,
    false,
  );
});

test("민영 예치금은 사는 곳 × 전용면적(별표 2)", () => {
  assert.equal(depositNeeded("서울", 84), 300);
  assert.equal(depositNeeded("인천", 100), 400);
  assert.equal(depositNeeded("경기", 130), 400);
  assert.equal(depositNeeded("부산", 150), 1500);
});

test("누가: 민영 신혼 특공은 혼인신고 전엔 막힘(일반만). 신고 후엔 지역 점수 높은 한 명. 정보 없는 사람은 둘 다 아님", () => {
  const before = who(성남민영, judge(성남민영, s), s, TODAY);
  assert.match(before.blocked!, /혼인신고/);
  assert.deepEqual(
    before.people.map((p) => [p.special, p.general]),
    [
      [false, true],
      [false, false],
    ],
  );
  const married = settings({ marriedAt: "2026-10-01" });
  const w = who(성남민영, judge(성남민영, married), married, TODAY);
  assert.equal(w.blocked, undefined);
  assert.deepEqual(
    w.people.map((p) => [p.person.name, p.filled, p.special, p.general]),
    [
      ["갑", true, true, true],
      ["을", false, false, false],
    ],
  );
  // 공공은 예비신혼도 된다
  const 공공 = notice({
    publicHousing: true,
    publicType: "일반형",
    units: [unit(79000, { newlywed: 10 })],
  });
  assert.equal(who(공공, judge(공공, s), s, TODAY).blocked, undefined);
  // 을이 성남에 2년 살았다면 을이 특공을 가져간다
  const s2 = settings({
    marriedAt: "2026-10-01",
    people: [
      갑,
      {
        ...을,
        birth: "1999-01-01",
        sido: "경기",
        sigungu: "성남시",
        movedInAt: "2023-01-01",
        householder: true,
        accountOpenedAt: "2020-01-01",
        accountCount: 70,
        accountPaidMan: 700,
      },
    ],
  });
  assert.deepEqual(
    who(성남민영, judge(성남민영, s2), s2, TODAY).people.map((p) => p.special),
    [false, true],
  );
});

test("누가: 자산에 걸린 공고는 두 사람 다 신청 불가", () => {
  const sh = notice({
    kind: "신혼희망타운",
    publicHousing: true,
    units: [unit(79000, { special: 145 })],
  });
  const w = who(sh, judge(sh, s), s, TODAY);
  assert.match(w.blocked!, /신청 불가/);
  assert.ok(w.people.every((p) => !p.special && !p.general));
});

test("소득 줄: 분모는 3인 이하 칸(2026-08 공고 753.4만) → 126%. 우선(120) ✗, 민영 일반(160)·공공 일반(140) 칸", () => {
  assert.equal(incomeTiers(성남민영, s).pct, 126);
  assert.deepEqual(
    incomeTiers(성남민영, s).tiers.map((t) => [t.label, t.ok]),
    [
      ["우선", false],
      ["일반", true],
      ["추첨", true],
    ],
  );
  assert.deepEqual(
    incomeTiers(notice({ publicHousing: true }), s).tiers.map((t) => [
      t.label,
      t.ok,
    ]),
    [
      ["우선", false],
      ["일반", true],
      ["추첨", true],
    ],
  );
  // 소득이 900만이면 119% → 우선 칸
  const low = settings({ incomeMan: 900 });
  assert.deepEqual(
    incomeTiers(성남민영, low).tiers.map((t) => t.ok),
    [true, true, true],
  );
});

test("소득 구간 외벌이: 민영 100/140, 공공 100/130. 공공 외벌이는 130%를 넘으면 추첨도 못 들어감", () => {
  const single = settings({ dualIncome: false }); // 126%
  assert.deepEqual(
    incomeTiers(성남민영, single).tiers.map((t) => [t.label, t.capPct, t.ok]),
    [
      ["우선", 100, false],
      ["일반", 140, true],
      ["추첨", undefined, true],
    ],
  );
  const pub = notice({ publicHousing: true });
  assert.deepEqual(
    incomeTiers(pub, single).tiers.map((t) => t.ok),
    [false, true, true],
  );
  const over = settings({ dualIncome: false, incomeMan: 1000 }); // 133%
  assert.deepEqual(
    incomeTiers(pub, over).tiers.map((t) => t.ok),
    [false, false, false],
  );
  // 혼자 신청하면 맞벌이라고 답했어도 외벌이로 본다
  const alone = settings({ dualIncome: true, people: [settings().people[0]!] });
  assert.equal(incomeTiers(성남민영, alone).tiers[0]!.capPct, 100);
});

test("월소득을 안 넣으면 소득 구간을 정하지 않고, 총자산을 안 넣으면 자산으로 거르지 않는다", () => {
  const blank = settings({ incomeMan: null, totalAssetsEok: null });
  const { pct, tiers } = incomeTiers(성남민영, blank);
  assert.equal(pct, undefined);
  assert.ok(tiers.every((t) => !t.ok));
  const sh = notice({
    kind: "신혼희망타운",
    publicHousing: true,
    units: [unit(79000, { special: 145 })],
  });
  assert.equal(judge(sh, blank).assetBlocked, undefined);
});
