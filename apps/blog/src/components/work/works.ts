// 홈 "작업" 목록. 작업마다 배너·이름·한 줄 요약과 갈 곳.
// 소개 페이지는 따로 둔 것만 있다(src/pages/work/jeongeum.astro).

import { type SiteName, siteUrl } from "@yeolyi/ui/sites";

export interface Work {
  slug: string;
  name: string;
  summary: string;
  // 홈 작업 목록의 가로로 긴 화면(높이 5줄·모바일 4줄). 작업마다 움직이는 조각이 있다(src/components/home/works/Banner.astro).
  banner:
    | "carousel"
    | "jeongeum"
    | "chadcn-ui"
    | "logic-gate-simulator"
    | "house";
  // 자기 사이트가 있는 작업은 홈에서 그리로 바로 가고 소개 페이지(/work/<slug>)를 두지 않는다.
  // site 는 yeolyi.com 아래 앱(개발 중엔 로컬로), href 는 바깥 주소.
  site?: SiteName;
  href?: string;
}

export const WORKS: Work[] = [
  {
    slug: "house",
    site: "house",
    banner: "house",
    name: "청약 알리미",
    summary: "청약 공고를 내 상황에 맞춰 걸러 보는 알리미",
  },
  {
    slug: "carousel",
    site: "carousel",
    banner: "carousel",
    name: "carousel",
    summary: "인스타그램 캐러셀을 만드는 웹 편집기",
  },
  {
    slug: "jeongeum",
    banner: "jeongeum",
    name: "정음",
    summary: "한글날 기념 크롬 확장 프로그램",
  },
  {
    slug: "chadcn-ui",
    href: "https://chad-cn.com",
    banner: "chadcn-ui",
    name: "chadcn/ui",
    summary: "잊을 수 없게, 인터랙티브하게.",
  },
  {
    slug: "logic-gate-simulator",
    site: "logic",
    banner: "logic-gate-simulator",
    name: "논리 게이트 시뮬레이터",
    summary: "게이트를 이어 디지털 회로를 만드는 웹 에디터",
  },
];

/** 홈에서 이 작업을 눌렀을 때 가는 곳. */
export const workHref = (w: Work) =>
  w.site ? siteUrl(w.site) : (w.href ?? `/work/${w.slug}`);
