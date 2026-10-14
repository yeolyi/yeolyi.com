import { PUBLIC_ASSET_CAP_EOK } from './rules.ts'
import type { Notice, Settings } from './types.ts'
import { assetGated, type Verdict } from './verdict.ts'

// 카드·상세의 "왜 후보인지, 왜 아닌지" — 기준마다 한 줄. 값, 기준과의 부등식, 그리고 용어 설명(툴팁).
export type Check = { key: string; label: string; tip: string; value: string; ok: boolean | undefined; detail: string }

export function checks(n: Notice, v: Verdict, s: Settings): Check[] {
  const out: Check[] = []
  out.push({
    key: 'region',
    label: '지역',
    tip: `개인화에서 고른 시도(${s.areas.join('·') || '없음'}) 안의 공고만 후보.`,
    value: n.sido || '미상',
    ok: v.region === 'in',
    detail: v.region === 'in' ? '' : '고른 시도 밖',
  })
  out.push({
    key: 'price',
    label: '분양가',
    tip: '주택형별 최고 분양가의 범위(청약홈). 판정은 아래 필요 자기자본이 한다. 살 수 있는 주택형이 하나라도 있으면 그중 가장 비싼 것이 기준. 발코니 확장·옵션·취득세는 별도.',
    value: v.maxPriceEok === undefined ? '미상' : v.minPriceEok === v.maxPriceEok ? `${v.maxPriceEok}억` : `${v.minPriceEok}~${v.maxPriceEok}억`,
    ok: undefined,
    detail: v.refType ? `기준 ${v.refType} ${v.refPriceEok}억` : '',
  })
  out.push({
    key: 'equity',
    label: '필요 자기자본',
    tip: `기준 주택형 분양가 − 대출가능액. 대출가능액 = 분양가 × LTV ${s.ltvPct}% (상한 ${s.loanCapEok}억). 자기자본 = 금융자산(연금 제외) + 전세보증금 − 전세대출. 이 줄이 가격 관문이다.`,
    value: v.neededEquityEok === undefined ? '미상' : `${v.neededEquityEok}억`,
    ok: v.price === 'unknown' ? undefined : v.price === 'ok',
    detail: v.neededEquityEok === undefined ? '' : `${v.price === 'ok' ? '≤' : '>'} 자기자본 ${s.equityEok}억 (${v.refPriceEok}억 − 대출 ${v.loanEok}억)`,
  })
  out.push({
    key: 'deposit',
    label: '계약금',
    tip: `계약할 때 내는 돈. 분양가의 ${s.depositPct}%로 가정(법은 20% 안, 실제 비율은 공고문). 전세보증금은 그때 못 쓰니 당장 쓸 수 있는 현금과 비교.`,
    value: v.depositEok === undefined ? '?' : `${v.depositEok}억`,
    ok: v.depositEok === undefined ? undefined : !v.depositWarn,
    detail: v.depositEok === undefined ? '' : `${v.depositWarn ? '>' : '≤'} 유동자산 ${s.liquidEok}억`,
  })
  const t = v.tickets
  const tickets = [t.young && `청년 ${t.young}`, t.newlywed && `신혼 ${t.newlywed}`, t.firstHome && `생애최초 ${t.firstHome}`, t.newborn && `신생아 ${t.newborn}`].filter(Boolean)
  out.push({
    key: 'tickets',
    label: '특공 물량',
    tip: '주택형별 특별공급 세대수 합. 예비신혼부부는 "신혼" 물량에 넣는다. 없어도 일반공급으로는 넣을 수 있다.',
    value: tickets.length ? tickets.join(' · ') : n.units ? '없음' : '미상',
    ok: !n.units ? undefined : tickets.length ? true : undefined,
    detail: '',
  })
  if (assetGated(n)) {
    out.push({
      key: 'asset',
      label: '자산 자격',
      tip: `공공주택 총자산 = 부동산 + 자동차 + 금융자산(전세보증금 포함) − 부채. 나눔형·선택형·토지임대부·신혼희망타운은 ${PUBLIC_ASSET_CAP_EOK}억 이하만 신청할 수 있다. 민영은 이 기준이 없고, 공공 일반형은 부동산·자동차만 본다.`,
      value: `총자산 ${s.totalAssetsEok}억`,
      ok: !v.assetBlocked,
      detail: `${v.assetBlocked ? '>' : '≤'} ${PUBLIC_ASSET_CAP_EOK}억`,
    })
  }
  return out
}
