# 사이드 프로젝트 모노레포

이성열의 사이드 프로젝트를 한 레포에서 관리한다. 레포 전체에 걸친 것만 적고, 앱별 가이드는 각 폴더의 CLAUDE.md 에 있다.

```
apps/blog       yeolyi.com (Astro)
apps/design     design.yeolyi.com (Astro). 디자인 시스템의 정본: 스타일·컴포넌트·패턴
apps/carousel   인스타 캐러셀 편집기 (Vite + React)
apps/logic      논리 게이트 시뮬레이터 (Vite + React). logic.yeolyi.com. 편집기와 예제 회로
apps/cs         성열의 컴퓨터공학 (Astro). cs.yeolyi.com. 글은 apps/cs/mdx, 추천·조회수·구독은 서버 액션
apps/stats      방문 지표 대시보드 (Vite + React). stats.yeolyi.com. 나만 본다(analytics.admins). 수집·집계 SQL 은 apps/stats/supabase/sql
apps/house      청약 알리미 (Vite + React + Supabase Edge Functions). house.yeolyi.com
apps/jeongeum   정음 크롬 확장 (순수 JS, 빌드 도구 없음). `pnpm --filter jeongeum zip` 이 스토어용 zip 과 블로그 내려받기(/d/정음.zip)를 함께 만든다
packages/ui     @yeolyi/ui. 디자인 시스템 컴포넌트와 토큰(theme.css)
packages/logic  @yeolyi/logic. 논리 게이트 시뮬레이터 엔진(React Flow). cs 글과 logic 앱이 쓴다. 쓰는 앱은 CSS 에 @yeolyi/logic/theme.css 를 import 한다
packages/site   @yeolyi/site. 글 사이트의 기본 꼴(base.css)·글 스타일(prose.css)·마크다운 플러그인. 블로그·design·house·cs 가 쓴다.
                prose.css 는 글의 흐름(제목·문단 간격, 목록, 인용, 코드)만 맡는다. 구조나 동작이 있는 것(표·접기 등)은 @yeolyi/ui 부품으로 두고 MDX 는 매핑으로 그 부품을 쓴다
packages/post   @yeolyi/post. 글 페이지 부품: 추천(HeartButton)·조회수(PostMeta)와 그 서버 액션(@yeolyi/post/actions), MDX 요소(mdx·Img). 블로그·cs 가 쓴다. 액션은 각 앱의 src/actions/index.ts 에 넣어 연다
packages/track  @yeolyi/track. 방문 기록 `startTracking(사이트)`. 모든 앱이 첫 화면에서 부른다. 글 조회수도 여기서 쌓인 analytics.page_views 를 읽는다
```

- pnpm 워크스페이스. 잠금 파일은 루트 하나. 앱 명령은 그 폴더에서 돌리거나 `pnpm --filter <이름> <명령>`(줄여서 `pnpm house dev` 처럼).
- **개발 서버는 루트 `pnpm dev` 하나로 다 띄운다.** packages(ui·site)를 고치면 모든 앱이 바뀌니 같이 띄워 두고 본다. 앱 하나만 볼 땐 `pnpm <앱> dev`.
- **주소에 `#` 라우팅을 쓰지 않는다.** 화면은 `/notices/<id>` 같은 경로로 나누고(Vite 앱은 `vercel.json` rewrite 가 모두 `index.html` 로), 화면 상태는 쿼리에. `#` 은 글 속 제목 앵커에만.
- **앱 목록은 `packages/ui/src/sites.ts` 한 곳.** 도메인과 개발 포트(4321부터 하나씩)가 거기 있고, 각 앱의 dev 서버 포트와 앱 사이 링크가 그 값을 쓴다. 앱 사이 링크는 `siteUrl(앱)` 으로 건다. 개발 서버에선 localhost:43xx, 빌드에선 실제 도메인이라 `pnpm dev` 로 띄운 앱끼리 오갈 수 있다.

| 앱 | 도메인 | 개발 |
|---|---|---|
| blog | yeolyi.com | localhost:4321 |
| design | design.yeolyi.com | localhost:4322 |
| house | house.yeolyi.com | localhost:4323 |
| carousel | carousel.yeolyi.com | localhost:4324 |
| logic | logic.yeolyi.com | localhost:4325 |
| cs | cs.yeolyi.com | localhost:4326 |
| stats | stats.yeolyi.com | localhost:4327 |

- 비밀값은 레포 루트 `.env`(gitignore). 블로그는 `vite.envDir` 로 이걸 읽는다. 로컬 블로그도 운영 Supabase 를 쓰니 조회수 등이 실제로 쌓인다.
- 커밋 전 검사는 루트 husky 가 `lint-staged` 를 부르고, lint-staged 가 각 앱의 `lint-staged.config.mjs` 를 찾아 그 앱 파일에만 적용한다. 앱 설정 안의 명령은 루트에서 실행되므로 `pnpm --filter <앱> exec …` 로 부른다.
- **배포는 Vercel GitHub 연동.** 앱마다 프로젝트 하나(Root Directory = `apps/<앱>`), main 에 푸시하면 배포된다. 각 앱 `vercel.json` 의 `ignoreCommand` 가 그 앱 폴더·`packages/`·잠금 파일이 안 바뀌었으면 빌드를 건너뛴다(이전 배포가 없거나 비교할 수 없으면 빌드한다. HEAD^ 로 대신 비교하면 첫 배포가 건너뛰어진다). 새 앱은 `sites.ts` 한 줄 → Route 53 CNAME(`cname.vercel-dns.com`) → Vercel 프로젝트 → 로그인을 쓰면 Supabase redirect 허용 목록.
- 블로그·cs·carousel·house 는 같은 Supabase 프로젝트를 쓴다(앱마다 스키마 하나: `carousel`·`house`, SQL 은 각 앱의 `supabase/sql`). 추천은 블로그와 cs 가 public 의 같은 표를 쓴다. 방문·조회수는 `analytics` 스키마(API 로 열지 않음, public 함수 track·page_view_count·stats 로만 드나든다). 새 앱은 `startTracking("<앱>")` 한 줄을 넣는다.
- 서비스(house·carousel·design …)의 맨 위는 `@yeolyi/ui/ServiceHeader`(`yeolyi.com / 서비스 이름` + 메뉴) 한 줄이다. 블로그 머리띠와 같은 높이(위 1.5lh, 줄 44px)라 사이트를 오가도 자리가 그대로다. 오른쪽 끝엔 늘 테마 버튼(ThemeToggle). 테마는 `theme` 쿠키(.yeolyi.com) 하나라 모든 앱이 같이 바뀐다. 페인트 전 적용은 Astro 는 `THEME_INIT` 인라인 스크립트, Vite 앱은 `themeInitPlugin()`(@yeolyi/ui/theme-store).
- `@yeolyi/site/base.css` 는 글꼴을 각 사이트의 `/fonts/` 에서 부른다. 새 앱은 `public/fonts/` 에 PretendardVariable·MonoplexKR-Regular 를 두고 preload 한다.
