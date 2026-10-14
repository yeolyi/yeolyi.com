# design

디자인 시스템 사이트. 배포: https://design.yeolyi.com (Vercel 프로젝트 `design`, Root Directory `apps/design`), 로컬: `pnpm dev` → http://localhost:4322

- 정본이다. `@yeolyi/ui`(컴포넌트)·`@yeolyi/site`(기본 꼴·글 스타일)를 바꾸면 여기 설명도 같이 고친다.
- 섹션은 스타일 · 컴포넌트 · 패턴(GOV.UK 디자인 시스템과 같은 나눔). 페이지는 `src/pages/<섹션>/<이름>.mdx`, frontmatter 의 `order` 가 목차 순서.
- 데모는 `src/demos/`. MDX 에서 `client:visible` 로 붙인다. 표가 있는 MDX 는 `src/components/mdx.ts` 의 components 를 받아 다시 내보낸다.
- 화면 문장은 합니다체, 줄표 없이, 영어 뒤 조사는 붙여 쓴다.
