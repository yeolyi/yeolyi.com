import assert from "node:assert/strict";
import { test } from "node:test";
import { noRankChecks } from "../../supabase/functions/_shared/requirements.ts";
import { notice, settings, unit } from "./helpers.ts";

const reshuffle = (special: number) =>
  notice({
    kind: "잔여세대",
    houseSecd: "06",
    units: [unit(60000, { special })],
  });

test("재공급 세대주 줄: 특공 물량이 섞이면 그 물량은 세대주를 따지지 않는다고 적는다(제47조의3 ②·③)", () => {
  const withSpecial = noRankChecks(reshuffle(1), settings()).find(
    (c) => c.id === "householder",
  );
  assert.match(withSpecial?.label ?? "", /특별공급 물량은/);
  assert.equal(withSpecial?.law, "규칙 제47조의3 ②·③");
  const generalOnly = noRankChecks(reshuffle(0), settings()).find(
    (c) => c.id === "householder",
  );
  assert.equal(generalOnly?.label, "세대주");
});

test("재공급 세대주 줄: 세대주가 없으면 막지 않고 모름", () => {
  const s = settings();
  const noHead = settings({
    people: s.people.map((p) => ({ ...p, householder: false })),
  });
  const c = noRankChecks(reshuffle(0), noHead).find(
    (x) => x.id === "householder",
  );
  assert.equal(c?.ok, null);
});
