import assert from 'node:assert/strict'
import fs from 'node:fs'
import { test } from 'node:test'
import { Applyhome, isPublic, publicTypeOf, type Row, toNotice, toUnit } from '../../supabase/functions/_lib/applyhome.ts'
import { Myhome, type Row as MyhomeRow, sidoOf } from '../../supabase/functions/_lib/myhome.ts'

const rows = JSON.parse(fs.readFileSync(new URL('../fixtures/applyhome-rows.json', import.meta.url), 'utf8')) as Record<string, Row>
const mhRows = JSON.parse(fs.readFileSync(new URL('../fixtures/myhome-rows.json', import.meta.url), 'utf8')) as MyhomeRow[]

test('청약홈 APT 행 → Notice: 날짜·주소·규제·공공 여부', () => {
  const n = toNotice(rows.getAPTLttotPblancDetail!, 'APT', '2026-09-17')
  assert.match(n.id, /^ah:\d+:\d+$/)
  assert.equal(n.sido, rows.getAPTLttotPblancDetail!.SUBSCRPT_AREA_CODE_NM)
  assert.match(n.announcedAt, /^\d{4}-\d{2}-\d{2}$/)
  assert.equal(typeof n.publicHousing, 'boolean')
  assert.equal(n.publicHousing, rows.getAPTLttotPblancDetail!.HOUSE_DTL_SECD_NM === '국민')
})

test('신혼희망타운은 kind가 그거고 publicType은 없다', () => {
  const n = toNotice(rows.shtown!, '신혼희망타운', '2026-09-17')
  assert.equal(n.kind, '신혼희망타운')
  assert.equal(n.publicHousing, true)
  assert.equal(n.publicType, undefined)
})

test('잔여세대·임의공급은 접수 기간이 SUBSCRPT_RCEPT_*에 오고, 임의공급 날짜는 20260911 꼴이라 하이픈으로 맞춘다', () => {
  const r = toNotice(rows.getRemndrLttotPblancDetail!, '잔여세대', '2026-09-17')
  assert.equal(r.r1Start, rows.getRemndrLttotPblancDetail!.SUBSCRPT_RCEPT_BGNDE)
  const o = toNotice(rows.getOPTLttotPblancDetail!, '임의공급', '2026-09-17')
  assert.match(o.announcedAt, /^\d{4}-\d{2}-\d{2}$/)
  assert.match(o.r1Start!, /^\d{4}-\d{2}-\d{2}$/)
})

test('공공 판정: 주택상세구분이 정답, 없으면 사업주체 이름', () => {
  assert.equal(isPublic({ HOUSE_DTL_SECD_NM: '국민', BSNS_MBY_NM: '삼환기업' }), true)
  assert.equal(isPublic({ HOUSE_DTL_SECD_NM: '민영', BSNS_MBY_NM: '한국토지주택공사' }), false)
  assert.equal(isPublic({ HOUSE_DTL_SECD_NM: null, BSNS_MBY_NM: '경기주택도시공사' }), true)
  assert.equal(publicTypeOf('고양창릉지구 S-3블록 이익공유형 분양주택'), '나눔형')
  assert.equal(publicTypeOf('마곡지구 17단지 토지임대부(본청약)'), '토지임대부')
  assert.equal(publicTypeOf('군포대야미 A-1블록 6년 분양전환공공임대주택'), '선택형')
  assert.equal(publicTypeOf('의정부우정 A2블록 공공분양주택'), '일반형')
})

test('주택형 행 → Unit', () => {
  const u = toUnit({ HOUSE_TY: '084.9800A', SUPLY_AR: '112.3', SUPLY_HSHLDCO: 28, SPSPLY_HSHLDCO: 24, LTTOT_TOP_AMOUNT: '216300', YGMN_HSHLDCO: 0, NWWDS_HSHLDCO: 8, LFE_FRST_HSHLDCO: 4, NWBB_HSHLDCO: 5 })
  assert.deepEqual(u, { type: '084.9800A', area: 112.3, total: 28, special: 24, topPriceMan: 216300, young: 0, newlywed: 8, firstHome: 4, newborn: 5 })
  assert.equal(toUnit({ LTTOT_TOP_AMOUNT: null }).topPriceMan, undefined)
})

test('청약홈 클라이언트: 페이지를 끝까지 넘기고 임의공급 조회엔 날짜를 압축한다', async () => {
  const urls: string[] = []
  const ah = new Applyhome(
    () => 'KEY',
    async (url) => {
      urls.push(url)
      const u = new URL(url)
      const page = Number(u.searchParams.get('page'))
      return { data: page === 1 ? [rows.getAPTLttotPblancDetail, rows.getAPTLttotPblancDetail] : [rows.getAPTLttotPblancDetail], totalCount: 3 }
    },
  )
  const out = await ah.notices('2026-08-01', '2026-09-17')
  assert.equal(out.length, 9) // 3 오퍼레이션 × 3행
  const opt = urls.find((u) => u.includes('getOPTLttotPblancDetail'))!
  assert.ok(decodeURIComponent(opt).includes('cond[RCRIT_PBLANC_DE::GTE]=20260801'))
  assert.ok(decodeURIComponent(urls[0]!).includes('cond[RCRIT_PBLANC_DE::GTE]=2026-08-01'))
  assert.ok(urls.every((u) => u.includes('serviceKey=KEY') && !u.includes('SUBSCRPT_AREA_CODE_NM'))) // 전국
})

test('마이홈: 시도 매핑, 전국 잔여세대류만, pblancId로 접기', async () => {
  assert.equal(sidoOf('경기도'), '경기')
  assert.equal(sidoOf('전남광주통합특별시'), '전남')
  const mh = new Myhome(async () => ({ rows: mhRows, total: mhRows.length }))
  const out = await mh.leftovers('202508', '202609', '2026-09-17')
  assert.ok(out.some((n) => n.sido === '경기') && out.some((n) => n.sido === '전남'))
  assert.ok(out.every((n) => n.kind === 'LH잔여' && n.publicHousing && n.url?.includes('pblancId=')))
})

test('마이홈: 청약홈 밖 무순위·추가모집은 남기고 본청약은 버린다', async () => {
  const row = (pblancId: string, pblancNm: string) => ({ pblancId, pblancNm, suplyInsttNm: 'GH', brtcCodeNm: '경기도', rcritPblancDe: '20260318' })
  const rows = [
    row('1', '고덕 자연앤하우스디(A4BL) 분양주택(민영주택) 무순위 5차 입주자 모집공고'),
    row('2', '양주옥정 A-4(1)블록 공공분양주택 추가모집'),
    row('3', '성남복정2 A1블록 신혼희망타운 입주자모집공고'),
  ]
  const out = await new Myhome(async () => ({ rows, total: rows.length })).leftovers('202603', '202603', '2026-03-20')
  assert.deepEqual(out.map((n) => n.id).sort(), ['mh:1', 'mh:2'])
})
