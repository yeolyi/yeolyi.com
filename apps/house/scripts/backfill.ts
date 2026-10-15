// 지난 공고를 house.notices 에 한 번 채워 넣는다. 수집기(house-collect)는 최근 45일만 받아서, 가이드의 "최근 1년" 예시처럼
// 오래된 공고가 필요할 때 쓴다. 이미 있는 공고는 건드리지 않고(중복 무시) 없는 것만 넣는다. 지난 공고라 주택형은 붙이지 않는다.
// 접수가 끝난 공고만 늘어나므로 메일(house-digest, 접수 중인 것만 본다)에는 영향이 없다.
//   node scripts/backfill.ts [일수=365]      레포 루트 .env 의 APPLYHOME_KEY·PUBLIC_SUPABASE_URL·SUPABASE_SERVICE_ROLE_KEY 를 쓴다
import path from "node:path";
import { chunk } from "es-toolkit";
import { Applyhome } from "../supabase/functions/_lib/applyhome.ts";
import { Myhome } from "../supabase/functions/_lib/myhome.ts";
import { addDays, todayYmd } from "../supabase/functions/_shared/dates.ts";
import { applyEnd } from "../supabase/functions/_shared/site.ts";

process.loadEnvFile(path.resolve(import.meta.dirname, "../../../.env"));
const { APPLYHOME_KEY, PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } =
  process.env;
if (!APPLYHOME_KEY || !PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)
  throw new Error(
    "루트 .env 에 APPLYHOME_KEY·PUBLIC_SUPABASE_URL·SUPABASE_SERVICE_ROLE_KEY 가 있어야 합니다",
  );

const days = Number(process.argv[2] ?? 365);
const now = new Date();
const today = todayYmd(now);
const since = addDays(today, -days);
const ym = (s: string) => s.slice(0, 7).replace("-", "");

const ah = await new Applyhome(() => APPLYHOME_KEY).notices(
  since,
  now.toISOString(),
);
const mh = await new Myhome().leftovers(
  ym(since),
  ym(today),
  now.toISOString(),
);
const rows = [...ah, ...mh].map((n) => ({
  id: n.id,
  data: n,
  apply_end: applyEnd(n),
  updated_at: now.toISOString(),
}));
console.log(`청약홈 ${ah.length}건, 마이홈 ${mh.length}건 (${since}~${today})`);

for (const batch of chunk(rows, 500)) {
  const res = await fetch(
    `${PUBLIC_SUPABASE_URL}/rest/v1/notices?on_conflict=id`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "content-type": "application/json",
        "content-profile": "house",
        prefer: "resolution=ignore-duplicates,return=minimal",
      },
      body: JSON.stringify(batch),
    },
  );
  if (!res.ok) throw new Error(`저장 실패 ${res.status}: ${await res.text()}`);
}
console.log(`넣음(이미 있던 건 그대로): ${rows.length}건 시도`);
