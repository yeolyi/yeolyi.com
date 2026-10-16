import assert from "node:assert/strict";
import { test } from "node:test";
import { unitLabel } from "../../supabase/functions/_shared/units.ts";

test("주택형: 앞 0을 떼고 둘째 자리까지, 타입 글자는 뒤에", () => {
  assert.equal(unitLabel("084.9100A"), "84.91㎡ A");
  assert.equal(unitLabel("084.0000"), "84㎡");
  assert.equal(unitLabel("074.9000B"), "74.9㎡ B");
});

test("주택형: 반올림하지 않고 버린다(59.9968 이 60㎡ 로 보이면 안 된다)", () => {
  assert.equal(unitLabel("059.9968B"), "59.99㎡ B");
});

test("주택형: 부동소수 오차로 한 칸 내려가지 않는다", () => {
  // 16.06 * 100 = 1605.9999… 라 숫자로 버리면 16.05 가 된다
  assert.equal(unitLabel("016.0600"), "16.06㎡");
  assert.equal(unitLabel("010.0300A"), "10.03㎡ A");
});

test("주택형: 숫자로 시작하지 않으면 그대로", () => {
  assert.equal(unitLabel("기타"), "기타");
});
