import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addDays,
  addYears,
  fmtDate,
  fmtYears,
  normalizeYmd,
  todayYmd,
  yearsBetween,
} from "../../supabase/functions/_shared/dates.ts";

test("서울 기준 오늘, 날짜 더하기", () => {
  // UTC 2026-09-17 16:00 = 서울 18일 01:00
  assert.equal(todayYmd(new Date("2026-09-17T16:00:00Z")), "2026-09-18");
  assert.equal(addDays("2026-09-30", 1), "2026-10-01");
  assert.equal(addDays("2026-01-01", -1), "2025-12-31");
  assert.equal(addYears("2026-01-07", 2), "2028-01-07");
});

test("20260911 → 2026-09-11, 이미 하이픈이면 그대로", () => {
  assert.equal(normalizeYmd("20260911"), "2026-09-11");
  assert.equal(normalizeYmd("2026-09-11"), "2026-09-11");
  assert.equal(normalizeYmd(undefined), undefined);
});

test("표시 형식", () => {
  assert.equal(fmtDate("2026-09-21"), "9/21(월)");
  assert.equal(fmtYears(0.7), "8개월");
  assert.equal(fmtYears(17.4), "17년");
  assert.ok(Math.abs(yearsBetween("2024-01-03", "2026-01-03") - 2) < 0.01);
});
