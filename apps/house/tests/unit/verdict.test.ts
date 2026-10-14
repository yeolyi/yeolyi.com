import assert from 'node:assert/strict'
import { test } from 'node:test'
import { judge, neededEquity } from '../../supabase/functions/_shared/verdict.ts'
import { notice, settings, unit } from './helpers.ts'

const s = settings()

test('필요 자기자본 = 분양가 − min(분양가×LTV, 상한)', () => {
  assert.deepEqual(neededEquity(8, s), { loanEok: 5.6, neededEquityEok: 2.4 })
  assert.deepEqual(neededEquity(11.5, s), { loanEok: 6, neededEquityEok: 5.5 }) // 상한 6억에 걸림
  assert.deepEqual(neededEquity(10, settings({ ltvPct: 40 })), { loanEok: 4, neededEquityEok: 6 })
})

test('고른 시도 안이고 살 수 있는 주택형이 있으면 후보', () => {
  const v = judge(notice({ units: [unit(90000, { young: 3, newlywed: 8 })] }), s)
  assert.equal(v.region, 'in')
  assert.equal(v.price, 'ok')
  assert.equal(v.status, 'candidate')
  assert.deepEqual(v.tickets, { young: 3, newlywed: 8, firstHome: 0, newborn: 0 })
  assert.equal(v.neededEquityEok, 3)
})

test('고른 시도 밖이면 탈락. 가격에서 걸려도 탈락', () => {
  assert.equal(judge(notice({ sido: '부산' }), s).region, 'out')
  assert.equal(judge(notice({ sido: '부산' }), s).status, 'rejected')
  assert.equal(judge(notice({ units: [unit(250000)] }), s).status, 'rejected')
})

test('가격 관문: 살 수 있는 주택형이 하나라도 있으면 통과, 기준은 그중 가장 비싼 것', () => {
  const units = [unit(100000, { type: '059A' }), unit(115000, { type: '074A' }), unit(246000, { type: '084A' })]
  const v = judge(notice({ units }), s)
  assert.equal(v.price, 'ok')
  assert.equal(v.refType, '074A') // 11.5억: 필요 자기자본 5.5 ≤ 5.5. 24.6억은 못 산다
  assert.equal(v.minPriceEok, 10)
  assert.equal(v.maxPriceEok, 24.6)
  const over = judge(notice({ units: [unit(130000, { type: '059A' }), unit(160000)] }), s)
  assert.equal(over.price, 'over')
  assert.equal(over.refType, '059A') // 다 못 사면 가장 싼 것이 기준
})

test('계약금은 관문이 아니라 경고', () => {
  const v = judge(notice({ units: [unit(115000)] }), settings({ depositPct: 20 }))
  assert.equal(v.depositEok, 2.3)
  assert.equal(v.depositWarn, true) // > 유동자산 2.2
  assert.equal(v.status, 'candidate')
})

test('분양가 미상(잔여세대)은 시도만 맞으면 후보', () => {
  const v = judge(notice({ source: 'myhome', kind: 'LH잔여', publicHousing: true }), s)
  assert.equal(v.price, 'unknown')
  assert.equal(v.status, 'candidate')
})

test('신혼희망타운·나눔·선택형은 총자산 3.62억을 넘으면 신청 불가 → 탈락. 특공 물량은 special이 곧 신혼', () => {
  const sh = notice({ kind: '신혼희망타운', publicHousing: true, units: [unit(79000, { special: 145 })] })
  const v = judge(sh, s)
  assert.equal(v.assetBlocked, '총자산 5.8억 > 3.62억')
  assert.equal(v.status, 'rejected')
  assert.equal(v.tickets.newlywed, 145)
  assert.equal(judge(sh, settings({ totalAssetsEok: 3 })).status, 'candidate')
  assert.equal(judge(notice({ publicHousing: true, publicType: '일반형', units: [unit(79000)] }), s).assetBlocked, undefined)
})
