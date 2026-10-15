import { Applyhome } from "../_lib/applyhome.ts";
import { collect } from "../_lib/collect.ts";
import { admin, env, fromCron, json } from "../_lib/env.ts";
import { Myhome } from "../_lib/myhome.ts";
import { todayYmd } from "../_shared/dates.ts";
import { applyEnd } from "../_shared/site.ts";
import type { Notice } from "../_shared/types.ts";

// 매시 pg_cron 이 부른다. 전국 공고를 받아 house.notices 에 넣는다.
const KEEP_DAYS = 180; // 같은 단지의 앞선 공고에서 분양가를 물려받으려고 접수가 끝난 것도 반년은 읽어 둔다

Deno.serve(async (req) => {
  if (!fromCron(req)) return json({ error: "forbidden" }, 403);
  const db = admin();
  const now = new Date();
  const today = todayYmd(now);
  try {
    const since = new Date(now.getTime() - KEEP_DAYS * 86400_000)
      .toISOString()
      .slice(0, 10);
    const { data, error } = await db
      .from("notices")
      .select("data")
      .gte("apply_end", since);
    if (error) throw error;
    const known = new Map(
      (data as { data: Notice }[]).map((r) => [r.data.id, r.data]),
    );
    const { changed, added } = await collect(known, {
      applyhome: new Applyhome(() => env("APPLYHOME_KEY")),
      myhome: new Myhome(),
      today,
      now: now.toISOString(),
    });
    if (changed.length) {
      const rows = changed.map((n) => ({
        id: n.id,
        data: n,
        apply_end: applyEnd(n),
        updated_at: now.toISOString(),
      }));
      const { error: e } = await db.from("notices").upsert(rows);
      if (e) throw e;
    }
    const stats = { noticeCount: known.size, added, changed: changed.length };
    await db.from("runs").insert({ job: "collect", stats });
    return json(stats);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await db.from("runs").insert({ job: "collect", error: message });
    return json({ error: message }, 500);
  }
});
