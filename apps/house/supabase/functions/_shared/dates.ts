// 날짜는 전부 서울 기준 YYYY-MM-DD 문자열로 다룬다. 문자열 비교가 곧 날짜 비교라 Date를 거의 만들지 않는다.

const KST = 'T00:00:00+09:00'

export function todayYmd(now = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(now)
}
export function addDays(ymd: string, days: number): string {
  return todayYmd(new Date(new Date(ymd + KST).getTime() + days * 86400_000))
}
export function yearsBetween(from: string, to: string): number {
  return (new Date(to + KST).getTime() - new Date(from + KST).getTime()) / (365.25 * 86400_000)
}
export function addYears(ymd: string, years: number): string {
  return `${Number(ymd.slice(0, 4)) + years}${ymd.slice(4)}`
}
/** 청약홈 잔여세대·임의공급 조회는 20260911 꼴로 준다. 밖으로는 전부 하이픈 꼴로. */
export function normalizeYmd(v: string | undefined): string | undefined {
  if (!v) return undefined
  return /^\d{8}$/.test(v) ? `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` : v
}
const DAYS = ['일', '월', '화', '수', '목', '금', '토']
export function fmtDate(ymd: string): string {
  const d = new Date(ymd + KST)
  return `${d.getMonth() + 1}/${d.getDate()}(${DAYS[d.getDay()]})`
}
export const fmtYears = (y: number) => (y >= 1 ? `${Math.floor(y)}년` : `${Math.max(0, Math.round(y * 12))}개월`)
