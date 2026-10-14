// 지도 링크. 주소로 검색만 건다. 우리 쪽에서 지도 API를 부르지 않는다.
// 카카오맵·네이버 지도의 길찾기는 좌표가 있어야 경로가 뜨고(이름만 주면 빈 칸, 2026-10 실측) 좌표를 구하려면 지도 API를 불러야 해서 두지 않는다.
const q = (s: string) => encodeURIComponent(s)

export const kakaoSearch = (query: string) => `https://map.kakao.com/link/search/${q(query)}`
export const naverSearch = (query: string) => `https://map.naver.com/p/search/${q(query)}`

/** 청약홈 주소는 "… 90번지 일원", "김포 풍무역세권 B4블록 (경기도 김포시 …)" 꼴이다. 괄호 안에 진짜 주소가 있으면 그것, 아니면 군더더기를 지운 것. */
export function searchableAddress(raw: string): string {
  const paren = raw.match(/\(([^)]*(?:도|시)[^)]*)\)/)?.[1]
  return (paren ?? raw.replace(/\([^)]*\)/g, ' ')).replace(/일원|일대|외\s*\d+\s*(필지|개동|개\s*동)|번지/g, ' ').replace(/\s+/g, ' ').trim()
}
