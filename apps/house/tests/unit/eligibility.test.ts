import assert from "node:assert/strict";
import { test } from "node:test";
import {
  account,
  incomeTiers,
  ladders,
  residency,
  who,
} from "../../supabase/functions/_shared/eligibility.ts";
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

test("통장: 특공 6개월·6회(민영은 예치금까지), 1순위는 2년 + 공공 24회 / 민영 예치금 500만 + 규제지역 세대주", () => {
  const a = account(갑, 성남민영, TODAY);
  assert.equal(a.special, true);
  assert.equal(a.rank1, true);
  const 공공 = notice({ publicHousing: true });
  assert.equal(account({ ...갑, accountCount: 20 }, 공공, TODAY).rank1, false);
  assert.equal(
    account({ ...갑, accountPaidMan: 300 }, 성남민영, TODAY).rank1,
    false,
  );
  assert.equal(
    account({ ...갑, accountPaidMan: 300 }, 성남민영, TODAY).special,
    false,
  ); // 민영 특공은 예치금도 봄
  assert.equal(
    account({ ...갑, accountPaidMan: 300 }, 공공, TODAY).special,
    true,
  );
  assert.equal(
    account({ ...갑, accountOpenedAt: "2026-06-01" }, 성남민영, TODAY).special,
    false,
  );
  const notHead = account({ ...갑, householder: false }, 성남민영, TODAY);
  assert.equal(notHead.rank1, false);
  assert.equal(notHead.rank1Why, "세대주가 아님");
  assert.equal(
    account({ ...갑, householder: false }, notice({ regulated: false }), TODAY)
      .rank1,
    true,
  ); // 비규제는 세대주 무관
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

test("사다리(민영, 갑, 혼인신고 후): 자격에 예치금, 물량은 일반 칸(126%), 순서는 자녀 1/2순위·해당지역. 일반공급은 세대주 포함 1순위, 가점 ✗ 추첨 ✓", () => {
  const married = settings({ marriedAt: "2026-10-01" });
  const v = judge(성남민영, married);
  const [special, general] = ladders(갑, 성남민영, v, married, TODAY);
  assert.equal(special!.title, "예비신혼 특공 (민영)");
  assert.equal(special!.supply, "신혼 21세대");
  assert.equal(special!.income?.pct, 126);
  assert.deepEqual(
    special!.prerequisites.map((st) => [st.label, st.ok]),
    [
      ["통장 6개월·예치금 500만", true],
      ["혼인 7년 이내", true],
    ],
  );
  assert.deepEqual(
    special!.tiers.map((t) => [t.label, t.on]),
    [
      ["우선 50%", false],
      ["일반 20%", true],
      ["추첨 30%", false],
    ],
  );
  assert.deepEqual(
    special!.within.map((st) => [st.label, st.ok]),
    [
      ["1순위: 혼인 중 자녀(임신 포함)", false],
      ["해당지역 거주자 우선", false],
      ["자녀 수 → 추첨", null],
    ],
  );
  assert.equal(general!.title, "일반공급 (민영)");
  assert.equal(general!.supply, "일반 5세대");
  assert.match(general!.prerequisites[0]!.label, /세대주/);
  assert.deepEqual(
    general!.tiers.map((t) => [t.label, t.on]),
    [
      ["가점제", false],
      ["추첨제", true],
    ],
  );
  assert.match(general!.tierNote, /가점 27점/); // 무주택 0 + 부양가족 10(배우자) + 통장 17
  // 신고 전엔 특공 사다리가 아예 없다
  assert.deepEqual(
    ladders(갑, 성남민영, judge(성남민영, s), s, TODAY).map((l) => l.title),
    ["일반공급 (민영)"],
  );
});

test("사다리: 소득 100% 이하면 우선 칸에 서고 순서에 자녀 1순위·해당지역이 붙는다", () => {
  const low = settings({
    marriedAt: "2026-10-01",
    incomeMan: 600,
    children: 0,
  });
  const [special] = ladders(갑, 성남민영, judge(성남민영, low), low, TODAY);
  assert.deepEqual(
    special!.tiers.map((t) => t.on),
    [true, false, false],
  );
  assert.deepEqual(
    special!.within.map((st) => [st.label, st.ok]),
    [
      ["1순위: 혼인 중 자녀(임신 포함)", false],
      ["해당지역 거주자 우선", false],
      ["자녀 수 → 추첨", null],
    ],
  );
  assert.equal(
    ladders(
      갑,
      성남민영,
      judge(성남민영, { ...low, children: 1 }),
      { ...low, children: 1 },
      TODAY,
    )[0]!.within[0]!.ok,
    true,
  );
});

test("사다리: 공공 신혼은 20% 칸(126% ≤ 140, 예비신혼도). 공공 일반은 자녀 없고 무주택 0년이라 추첨 20%가 실제 표. 임의공급은 공고문이 정함", () => {
  const 공공 = notice({
    publicHousing: true,
    publicType: "일반형",
    units: [unit(79000, { newlywed: 10, area: 75 })],
  });
  const [sp, gen] = ladders(갑, 공공, judge(공공, s), s, TODAY);
  assert.deepEqual(
    sp!.tiers.map((t) => t.on),
    [false, true, false],
  );
  assert.equal(sp!.prerequisites[1]!.label, "예비신혼부부 (공공만)");
  assert.deepEqual(
    gen!.tiers.map((t) => [t.label, t.on]),
    [
      ["자녀 우선 50%", false],
      ["순차 30%", false],
      ["추첨 20%", true],
    ],
  ); // 만 26세 → 무주택 0년 → 2순차
  assert.match(gen!.prerequisites[2]!.label, /60㎡ 이하/); // 공급면적 75 ≈ 전용 58
  assert.deepEqual(
    ladders(
      { ...갑, birth: "1990-01-01" },
      공공,
      judge(공공, s),
      s,
      TODAY,
    )[1]!.tiers.map((t) => t.on),
    [false, true, false],
  );
  const l = ladders(
    갑,
    notice({ kind: "임의공급", units: [unit(90000)] }),
    judge(notice({ kind: "임의공급" }), s),
    s,
    TODAY,
  );
  assert.deepEqual(
    l.map((x) => x.title),
    ["임의공급"],
  );
  assert.equal(
    l[0]!.tiers.every((t) => !t.on),
    true,
  );
});
