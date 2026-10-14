import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyEnd, isLive, siteKey } from '../../supabase/functions/_shared/site.ts'
import { notice, TODAY } from './helpers.ts'

test('살아 있음 = 접수 마감 전. 발표·계약이 남아도 접수가 끝나면 죽은 공고', () => {
  assert.equal(isLive(notice({ r1End: '2026-09-17' }), TODAY), true)
  assert.equal(isLive(notice({ r1End: '2026-09-16', winnerAt: '2026-09-25', contractEnd: '2026-10-05' }), TODAY), false)
})

test('접수일이 없는 마이홈 잔여는 발표일, 그것도 없으면 공고일 + 2주', () => {
  const base = notice({ spStart: undefined, spEnd: undefined, r1Start: undefined, r1End: undefined, winnerAt: undefined, announcedAt: '2026-09-10' })
  assert.equal(applyEnd(base), '2026-09-24')
  assert.equal(applyEnd({ ...base, winnerAt: '2026-09-20' }), '2026-09-20')
})

test('단지 키는 주소에서 번지·일원·공백을 지운 것. 주소가 없으면 지구명+블록', () => {
  assert.equal(siteKey(notice({ address: '경기도 성남시 분당구 정자동 90번지 일원' })), siteKey(notice({ address: '경기도 성남시 분당구 정자동 90 (외 3필지)' })))
  assert.equal(siteKey(notice({ address: undefined, name: '수원당수 A-3블록 신혼희망타운 잔여세대' })), '수원당수#A3')
  assert.equal(siteKey(notice({ address: undefined, name: '양주회천 A18BL,A21BL 공공분양주택' })), '양주회천#A18,A21')
})
