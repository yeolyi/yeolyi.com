import assert from "node:assert/strict";
import { test } from "node:test";
import { SPECIAL_TIERS } from "../../supabase/functions/_shared/rules.ts";
import {
  landingOf,
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
