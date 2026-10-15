// yeolyi.com 묶음의 앱 목록. 도메인·개발 포트를 여기 한 곳에서만 정한다.
// 앱 사이 링크(siteUrl), 각 앱의 개발 서버 포트, 문서가 이 값을 본다.
// 개발 포트는 4321(Astro 기본, 블로그)부터 앱마다 하나씩.
// 새 앱: 여기 한 줄 → Route 53 CNAME(cname.vercel-dns.com) → Vercel 프로젝트(Root Directory = apps/<이름>) → 로그인을 쓰면 Supabase redirect 허용 목록.
export const SITES = {
  blog: { url: "https://yeolyi.com", port: 4321 },
  design: { url: "https://design.yeolyi.com", port: 4322 },
  house: { url: "https://house.yeolyi.com", port: 4323 },
  carousel: { url: "https://carousel.yeolyi.com", port: 4324 },
  logic: { url: "https://logic.yeolyi.com", port: 4325 },
  cs: { url: "https://cs.yeolyi.com", port: 4326 },
  stats: { url: "https://stats.yeolyi.com", port: 4327 },
} as const;

export type SiteName = keyof typeof SITES;

/** 다른 앱으로 가는 주소. 개발 서버(Vite·Astro dev)에선 그 앱의 로컬 주소, 빌드에선 실제 도메인이라 루트 pnpm dev 로 띄운 앱끼리 오갈 수 있다. */
export function siteUrl(name: SiteName): string {
  return import.meta.env?.DEV
    ? `http://localhost:${SITES[name].port}`
    : SITES[name].url;
}
