import assert from "node:assert/strict";
import { test } from "node:test";
import { checks } from "../../supabase/functions/_shared/checks.ts";
import { judge } from "../../supabase/functions/_shared/verdict.ts";
import { notice, settings, unit } from "./helpers.ts";

const s = settings();

test("기준 줄은 지역 + 특공. 돈은 보지 않는다", () => {
  const n = notice({
    units: [unit(100000, { type: "059A" }), unit(246000, { type: "084A" })],
  });
  const c = checks(n, judge(n, s), s);
  assert.deepEqual(
    c.map((x) => x.key),
    ["region", "tickets"],
  );
  assert.deepEqual(
    c.map((x) => x.ok),
    [true, undefined],
  );
  const far = notice({ sido: "부산" });
  assert.equal(checks(far, judge(far, s), s)[0]!.detail, "고른 시도 밖");
});

test("자산 자격 줄은 나눔·선택형·신혼희망타운에만 붙는다", () => {
  const sh = notice({
    kind: "신혼희망타운",
    publicHousing: true,
    units: [unit(79000, { special: 10 })],
  });
  const c = checks(sh, judge(sh, s), s);
  const asset = c.find((x) => x.key === "asset")!;
  assert.equal(asset.ok, false);
  assert.equal(asset.detail, "> 3.62억");
  assert.equal(
    checks(notice(), judge(notice(), s), s).some((x) => x.key === "asset"),
    false,
  );
});
