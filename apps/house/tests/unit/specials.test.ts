import assert from "node:assert/strict";
import { test } from "node:test";
import {
  incomePct,
  newlywedCheck,
  stagedNewlywed,
} from "../../supabase/functions/_shared/eligibility.ts";
import { SPECIAL_TIERS } from "../../supabase/functions/_shared/rules.ts";
import {
  landingOf,
  planOk,
  specialsOf,
} from "../../supabase/functions/_shared/specials.ts";
import { notice, settings, TODAY, unit } from "./helpers.ts";

const find = (plans: ReturnType<typeof specialsOf>, key: string, id: string) =>
  plans.find((p) => p.key === key)?.checks.find((c) => c.id === id);

test("특공: 물량이 있는 공급만, 청년은 국민주택만", () => {
  const units = [
    unit(90000, { newborn: 3, firstHome: 2, young: 4, multiChild: 1 }),
  ];
  const priv = specialsOf(notice({ units }), settings(), TODAY);
  assert.deepEqual(
    priv.map((p) => p.key),
    ["newborn", "firstHome", "multiChild"],
  );
  const pub = specialsOf(
    notice({ units, publicHousing: true }),
    settings(),
    TODAY,
  );
  assert.deepEqual(
    pub.map((p) => p.key),
    ["newborn", "firstHome", "multiChild", "young"],
  );
});

test("신생아: 자녀 0명이면 미충족, 있으면 2세 미만 답을 본다", () => {
  const n = notice({ units: [unit(90000, { newborn: 3 })] });
  assert.equal(
    find(specialsOf(n, settings(), TODAY), "newborn", "baby")?.ok,
    false,
  );
  const s = settings({ children: 1, newbornChild: null });
  assert.equal(find(specialsOf(n, s, TODAY), "newborn", "baby")?.ok, null);
  assert.equal(
    find(specialsOf(n, { ...s, newbornChild: true }, TODAY), "newborn", "baby")
      ?.ok,
    true,
  );
});

test("생애최초: 미혼·무자녀는 공공은 안 되고, 민영은 60㎡ 이하 주택형이 있을 때만", () => {
  const big = [unit(90000, { type: "084.9800A", firstHome: 2 })];
  const small = [unit(50000, { type: "059.9000A", firstHome: 2 })];
  const s = settings();
  assert.equal(
    find(specialsOf(notice({ units: big }), s, TODAY), "firstHome", "family")
      ?.ok,
    false,
  );
  assert.equal(
    find(specialsOf(notice({ units: small }), s, TODAY), "firstHome", "family")
      ?.ok,
    true,
  );
  assert.equal(
    find(
      specialsOf(notice({ units: small, publicHousing: true }), s, TODAY),
      "firstHome",
      "family",
    )?.ok,
    false,
  );
  assert.equal(
    find(
      specialsOf(
        notice({ units: big, publicHousing: true }),
        settings({ marriedAt: "2026-03-01" }),
        TODAY,
      ),
      "firstHome",
      "family",
    )?.ok,
    true,
  );
});

test("소득: 민영 신생아는 160% 넘어도 부동산 3.31억 이하면 된다, 공공 맞벌이 상한 200%", () => {
  const n = notice({ units: [unit(90000, { newborn: 3 })] });
  const rich = settings({ incomeMan: 1500, children: 1, newbornChild: true });
  assert.equal(find(specialsOf(n, rich, TODAY), "newborn", "income")?.ok, null);
  assert.equal(
    find(
      specialsOf(n, { ...rich, realEstateEok: 2 }, TODAY),
      "newborn",
      "income",
    )?.ok,
    true,
  );
  assert.equal(
    find(
      specialsOf(n, { ...rich, realEstateEok: 4 }, TODAY),
      "newborn",
      "income",
    )?.ok,
    false,
  );
  const pub = notice({
    units: [unit(90000, { newborn: 3 })],
    publicHousing: true,
  });
  // 3인 이하 기준 753만: 1500만은 199%(맞벌이 200% 이하), 1600만은 212%
  assert.equal(
    find(specialsOf(pub, rich, TODAY), "newborn", "income")?.ok,
    true,
  );
  assert.equal(
    find(
      specialsOf(pub, { ...rich, incomeMan: 1600 }, TODAY),
      "newborn",
      "income",
    )?.ok,
    false,
  );
});

test("청년: 혼인 중이면 미충족, 나이는 공고일 기준 만 나이", () => {
  const n = notice({ units: [unit(90000, { young: 4 })], publicHousing: true });
  assert.equal(
    find(specialsOf(n, settings(), TODAY), "young", "single")?.ok,
    true,
  );
  assert.equal(
    find(
      specialsOf(n, settings({ marriedAt: "2026-03-01" }), TODAY),
      "young",
      "single",
    )?.ok,
    false,
  );
  assert.equal(
    find(specialsOf(n, settings(), TODAY), "young", "p0-age")?.ok,
    true,
  );
});

test("소득 몫: 우선 → 일반 → 추첨, 상한을 넘으면 몫 없음", () => {
  const r = SPECIAL_TIERS.newborn.public.외벌이;
  assert.equal(landingOf(r, undefined), -1);
  assert.equal(landingOf(r, 90), 0);
  assert.equal(landingOf(r, 120), 1);
  assert.equal(landingOf(r, 150), 3);
});

test("신혼 요건: 민영은 혼인신고 뒤 7년 이내, 공공은 예비신혼·6세 이하 자녀도", () => {
  const priv = notice();
  const pub = notice({ publicHousing: true });
  assert.equal(newlywedCheck(priv, settings()).ok, false); // 신고 안 함
  assert.equal(
    newlywedCheck(priv, settings({ marriedAt: "2020-01-01" })).ok,
    true,
  );
  assert.equal(
    newlywedCheck(priv, settings({ marriedAt: "2014-10-01" })).ok,
    false,
  );
  assert.equal(newlywedCheck(pub, settings()).ok, true); // 예비신혼
  // 공공, 혼인 12년: 자녀 없으면 안 됨, 2세 미만이면 됨, 자녀 나이 모르면 모름
  const old = settings({ marriedAt: "2014-10-01" });
  assert.equal(newlywedCheck(pub, old).ok, false);
  assert.equal(
    newlywedCheck(pub, { ...old, children: 1, newbornChild: true }).ok,
    true,
  );
  assert.equal(newlywedCheck(pub, { ...old, children: 1 }).ok, null);
  // 혼자, 자녀 없음: 공공도 안 됨
  const alone = settings({ people: [settings().people[0]!] });
  assert.equal(newlywedCheck(pub, alone).ok, false);
});

test("신혼희망타운·나눔형은 단계식 구간, 2세 미만 자녀는 공공 소득에서 10%p 뺀다", () => {
  assert.equal(
    stagedNewlywed(notice({ kind: "신혼희망타운", publicHousing: true })),
    true,
  );
  assert.equal(
    stagedNewlywed(notice({ publicHousing: true, publicType: "나눔형" })),
    true,
  );
  assert.equal(stagedNewlywed(notice({ publicHousing: true })), false);
  const s = settings({ children: 1, newbornChild: true });
  assert.equal(
    (incomePct(s) ?? 0) - (incomePct(s, notice({ publicHousing: true })) ?? 0),
    10,
  );
  assert.equal(incomePct(s, notice()), incomePct(s)); // 민영은 가산 없음
});

test("특공 가능 여부: 넣을 사람 한 명만 되면 된다, 가구 요건이 안 되면 안 된다", () => {
  const c = (id: string, ok: boolean | null) => ({
    id,
    label: "",
    law: "",
    ok,
    mine: "",
  });
  assert.equal(
    planOk([c("homeless", true), c("p0-years", true), c("p1-years", false)]),
    true,
  );
  assert.equal(
    planOk([c("homeless", true), c("p0-years", false), c("p1-years", false)]),
    false,
  );
  assert.equal(planOk([c("homeless", false), c("p0-years", true)]), false);
  assert.equal(planOk([c("homeless", null), c("p0-years", true)]), null);
});
