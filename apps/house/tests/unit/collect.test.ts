import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type CollectDeps,
  collect,
} from "../../supabase/functions/_lib/collect.ts";
import type { Notice, Unit } from "../../supabase/functions/_shared/types.ts";
import { notice, TODAY, unit } from "./helpers.ts";

function deps(fresh: Notice[], unitsBy: Record<string, Unit[]> = {}) {
  const asked: string[] = [];
  const d: CollectDeps = {
    applyhome: {
      notices: async () =>
        fresh.filter((n) => n.source === "applyhome").map((n) => ({ ...n })),
      units: async (n) => (asked.push(n.id), unitsBy[n.id] ?? []),
    },
    myhome: {
      leftovers: async () =>
        fresh.filter((n) => n.source === "myhome").map((n) => ({ ...n })),
    },
    today: TODAY,
    now: `${TODAY}T03:00:00.000Z`,
  };
  return { d, asked };
}

test("처음 보는 공고는 주택형별 분양가를 붙여 돌려준다", async () => {
  const { d } = deps([notice({ id: "ah:1:1" })], { "ah:1:1": [unit(90000)] });
  const r = await collect(new Map(), d);
  assert.equal(r.added, 1);
  assert.equal(r.changed[0]?.units?.[0]?.topPriceMan, 90000);
});

test("다시 본 공고는 날짜가 바뀌었을 때만 돌려준다. 주택형을 채운 공고는 다시 묻지 않는다", async () => {
  const known = new Map<string, Notice>([
    ["ah:1:1", notice({ id: "ah:1:1", units: [unit(90000)] })],
  ]);
  const same = deps([notice({ id: "ah:1:1" })]);
  assert.equal((await collect(known, same.d)).changed.length, 0);
  assert.deepEqual(same.asked, []);
  const moved = await collect(
    known,
    deps([notice({ id: "ah:1:1", r1Start: "2026-09-23" })]).d,
  );
  assert.equal(moved.changed[0]!.r1Start, "2026-09-23");
});

test("잔여세대 조회엔 분양가가 없어 같은 단지의 앞선 공고에서 빌린다", async () => {
  const main = notice({ id: "ah:1:1", units: [unit(90000, { type: "084A" })] });
  const known = new Map<string, Notice>([[main.id, main]]);
  const { d } = deps([notice({ id: "ah:1:2", kind: "잔여세대" })], {
    "ah:1:2": [unit(0, { type: "084A", topPriceMan: undefined })],
  });
  const got = (await collect(known, d)).changed.find((n) => n.id === "ah:1:2")!;
  assert.equal(got.units?.[0]?.topPriceMan, 90000);
});

test("원천 오류는 사유만 남기고 공고는 버리지 않는다. 마이홈 공고는 주택형을 묻지 않는다", async () => {
  const { d, asked } = deps([
    notice({ id: "ah:1:1" }),
    notice({ id: "mh:9", source: "myhome", kind: "LH잔여" }),
  ]);
  d.applyhome.units = async (n) => {
    asked.push(n.id);
    throw new Error("청약홈 500");
  };
  const r = await collect(new Map(), d);
  assert.equal(
    r.changed.find((n) => n.id === "ah:1:1")!.enrichError,
    "청약홈 500",
  );
  assert.deepEqual(asked, ["ah:1:1"]);
});
