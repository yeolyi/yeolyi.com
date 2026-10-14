import { addDays } from '../_shared/dates.ts'
import { isLive, siteKey } from '../_shared/site.ts'
import type { Notice } from '../_shared/types.ts'
import type { Applyhome } from './applyhome.ts'
import type { Myhome } from './myhome.ts'

// 한 사이클: 원천 둘에서 전국 최근 공고를 받고 → 처음 보는 것에 주택형별 분양가·특공 세대수를 붙인다.
// 판정은 하지 않는다. 개인화 정보는 브라우저에만 있어 화면이 shared/verdict.ts 로 한다.
// 청약홈은 하루 한두 번 갱신되고 공고에서 접수까지 열흘쯤 있으니 시간 단위면 충분하다.

const LOOKBACK_DAYS = 45 // 공고→계약까지 한 달 남짓. 이보다 오래된 건 이미 끝난 공고다
const ENRICH_PER_CYCLE = 60 // 공고당 청약홈 1회. Edge Function 실행 한도(150초) 안에 넉넉히

export type CollectDeps = {
  applyhome: Pick<Applyhome, 'notices' | 'units'>
  myhome: Pick<Myhome, 'leftovers'>
  today: string
  now: string
}

const DATE_FIELDS = ['spStart', 'spEnd', 'r1Start', 'r1End', 'r2Start', 'r2End', 'winnerAt', 'contractStart', 'contractEnd', 'url'] as const

/** known 은 저장된 공고(id → 공고). 바뀐 것만 돌려준다 — 저장은 호출자 몫. */
export async function collect(known: Map<string, Notice>, d: CollectDeps): Promise<{ changed: Notice[]; added: number }> {
  const since = addDays(d.today, -LOOKBACK_DAYS)
  const ym = (s: string) => s.slice(0, 7).replace('-', '')
  const [ah, mh] = await Promise.all([d.applyhome.notices(since, d.now), d.myhome.leftovers(ym(since), ym(d.today), d.now)])
  const changed = new Map<string, Notice>()
  let added = 0

  // 이미 있는 건 일정이 바뀌었을 수 있어 날짜 칸만 덮어쓴다.
  for (const n of [...ah, ...mh]) {
    const cur = known.get(n.id)
    if (cur) {
      let dirty = false
      for (const k of DATE_FIELDS) {
        if (n[k] !== undefined && cur[k] !== n[k]) {
          cur[k] = n[k]
          dirty = true
        }
      }
      if (dirty) changed.set(cur.id, cur)
      continue
    }
    known.set(n.id, n)
    changed.set(n.id, n)
    added++
  }

  // 접수가 안 끝난 청약홈 공고 중 주택형이 빠진 것을 채운다. 처음 보는 것부터, 한 사이클에 상한을 두고.
  const todo = [...known.values()]
    .filter((n) => isLive(n, d.today) && n.source === 'applyhome' && !n.units)
    .sort((a, b) => Number(!!a.enrichError) - Number(!!b.enrichError))
    .slice(0, ENRICH_PER_CYCLE)
  for (const n of todo) {
    await enrich(n, known, d)
    changed.set(n.id, n)
  }
  return { changed: [...changed.values()], added }
}

/** 주택형별 분양가·특공 세대수. 실패해도 공고는 남기고 사유만 적는다(다음 사이클이 다시 해 본다). */
async function enrich(n: Notice, known: Map<string, Notice>, d: CollectDeps) {
  try {
    n.units = await d.applyhome.units(n)
    borrowPrices(n, known)
    n.enrichError = undefined
  } catch (e) {
    n.enrichError = e instanceof Error ? e.message : String(e)
  }
}

/** 잔여세대·임의공급 조회엔 분양가가 없다. 같은 단지의 앞선 공고에서 주택형별로 빌려온다. */
function borrowPrices(n: Notice, known: Map<string, Notice>) {
  if (!n.units?.length || n.units.some((u) => u.topPriceMan)) return
  const priced = [...known.values()].find((o) => o.id !== n.id && siteKey(o) === siteKey(n) && o.units?.some((u) => u.topPriceMan))
  if (!priced) return
  for (const u of n.units) u.topPriceMan = priced.units!.find((p) => p.type === u.type)?.topPriceMan
}
