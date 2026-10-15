# cs.yeolyi.com

성열의 컴퓨터공학. 예비 컴공생·비전공자를 위한 인터랙티브 시리즈 (Astro + MDX +
React 아일랜드).

- 글은 `mdx/{N-slug}/ko.mdx` + 그 글의 `components/`·`lib/`·`assets/`. 주소는
  폴더명에서 숫자 접두사를 뗀 `/{slug}`.
- 순서는 프런트매터 `part`(파트)·`order`(10 간격). 파트 이름은
  `src/lib/content.ts` 의 `PARTS`.
- 글끼리 링크는 `/{slug}`. 글에서 코드로 들어가는 import 는 `@mdx/*`.
- 추천·조회수·MDX 요소는 `@yeolyi/post`, 구독(Resend)은 이 앱의
  `src/actions/subscriber.ts`.
- 조회수는 `@yeolyi/track` 이 `cs` 사이트로 쌓는다. 블로그 `/cs` 아래 있던 때의
  숫자는 `apps/stats/supabase/sql/002` 가 시작값으로 옮겼다.
- 블로그의 옛 주소 `/cs/{slug}` 는 블로그 `astro.config.mjs` 가 이 앱 `mdx/`
  폴더 목록을 읽어 넘긴다. 글 폴더 말고 따로 만든 페이지(`/cpu/simulator`
  같은)는 거기에 직접 적는다.
