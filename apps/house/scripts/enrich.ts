// 이미 쌓인 청약홈 공고를 한 번 보강한다. 수집기는 접수 중인 공고만 주택형을 채우고, 분류 칸(공급 구분·조정대상지역·임대)은
// 새로 받은 공고부터 붙어서, 1년치를 한꺼번에 넣은(backfill) 지난 공고에는 둘 다 비어 있다.
//  · 분류 칸: 청약홈 목록을 다시 받아 같은 id 에 houseSecd·adjusted·rental 을 채운다
//  · 주택형: units 가 없는 공고마다 주택형 조회를 부른다(공고당 한 번)
// 여러 번 돌려도 된다(이미 채운 칸은 그대로). 새 공고는 수집기가 하므로 정기적으로 돌릴 필요는 없다.
//   node scripts/enrich.ts [일수=365]      레포 루트 .env 의 APPLYHOME_KEY·PUBLIC_SUPABASE_URL·SUPABASE_SERVICE_ROLE_KEY
import path from "node:path";
import { chunk } from "es-toolkit";
import { Applyhome } from "../supabase/functions/_lib/applyhome.ts";
import { addDays, todayYmd } from "../supabase/functions/_shared/dates.ts";
import { applyEnd } from "../supabase/functions/_shared/site.ts";
import type { Notice } from "../supabase/functions/_shared/types.ts";

process.loadEnvFile(path.resolve(import.meta.dirname, "../../../.env"));
const {
  APPLYHOME_KEY,
  PUBLIC_SUPABASE_URL: URL_,
  SUPABASE_SERVICE_ROLE_KEY: KEY,
} = process.env;
if (!APPLYHOME_KEY || !URL_ || !KEY)
  throw new Error(
    "루트 .env 에 APPLYHOME_KEY·PUBLIC_SUPABASE_URL·SUPABASE_SERVICE_ROLE_KEY 가 있어야 합니다",
  );
const headers = {
  apikey: KEY,
  authorization: `Bearer ${KEY}`,
  "content-type": "application/json",
  "accept-profile": "house",
  "content-profile": "house",
};

const days = Number(process.argv[2] ?? 365);
const now = new Date();
const since = addDays(todayYmd(now), -days);
const ah = new Applyhome(() => APPLYHOME_KEY);

const stored: Notice[] = [];
for (let from = 0; ; from += 1000) {
  const res = await fetch(
    `${URL_}/rest/v1/notices?select=data&order=id&offset=${from}&limit=1000`,
    { headers },
  );
  const rows = (await res.json()) as { data: Notice }[];
  stored.push(...rows.map((r) => r.data));
  if (rows.length < 1000) break;
}
const fresh = new Map(
  (await ah.notices(since, now.toISOString())).map((n) => [n.id, n]),
);
console.log(`저장 ${stored.length}건, 청약홈 목록 ${fresh.size}건`);

let classified = 0,
  enriched = 0,
  failed = 0;
const changed: Notice[] = [];
for (const n of stored) {
  if (n.source !== "applyhome" || n.announcedAt < since) continue;
  let dirty = false;
  const f = fresh.get(n.id);
  if (f && n.houseSecd === undefined) {
    Object.assign(n, {
      houseSecd: f.houseSecd,
      adjusted: f.adjusted,
      rental: f.rental,
    });
    classified++;
    dirty = true;
  }
  if (!n.units) {
    try {
      n.units = await ah.units(n);
      enriched++;
      dirty = true;
    } catch (e) {
      failed++;
      console.warn(
        `주택형 실패 ${n.id}: ${e instanceof Error ? e.message : e}`,
      );
    }
  }
  if (dirty) changed.push(n);
  if (changed.length && changed.length % 100 === 0)
    console.log(`… ${changed.length}건`);
}

for (const batch of chunk(changed, 200)) {
  const res = await fetch(`${URL_}/rest/v1/notices?on_conflict=id`, {
    method: "POST",
    headers: {
      ...headers,
      prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(
      batch.map((n) => ({
        id: n.id,
        data: n,
        apply_end: applyEnd(n),
        updated_at: now.toISOString(),
      })),
    ),
  });
  if (!res.ok) throw new Error(`저장 실패 ${res.status}: ${await res.text()}`);
}
console.log(
  `분류 칸 ${classified}건 · 주택형 ${enriched}건 채움 · 주택형 실패 ${failed}건 · 저장 ${changed.length}건`,
);
