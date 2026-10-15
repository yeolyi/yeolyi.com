# logic

논리 게이트 시뮬레이터. 배포: https://logic.yeolyi.com (Vercel 프로젝트 `logic`,
Root Directory `apps/logic`), 로컬: `pnpm dev` → http://localhost:4325

- 엔진은 `@yeolyi/logic`(packages/logic). 이 앱은 그걸 띄우는 껍데기다: `/` 시작
  페이지(보기 전용 7-세그먼트 회로 + 예제 목록), `/editor` 빈 편집기,
  `/examples/<slug>` 예제 회로.
- 예제 회로는 `src/examples/examples.ts` 한 곳. 반가산기·전가산기 JSON 은 cs
  글(apps/cs/mdx 6·7장)의 것을 복사해 둔 것이라, 글의 회로를 고쳐도 여기는 따로
  고친다.
- 편집기는 화면 전체를 쓰는 도구라 폭 제한이 없다(맨 위는 ServiceHeader).
- 예전 주소 yeolyi.com/craft/logic-gate-simulator/<slug> 는 블로그 astro.config
  의 redirects 가 여기로 넘긴다.
