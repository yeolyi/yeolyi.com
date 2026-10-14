# stats.yeolyi.com

모든 사이트의 방문 지표. 나만 본다.

- 수집은 `@yeolyi/track`(packages/track). 각 앱이 `startTracking("<사이트>")` 를 부르면 브라우저가 anon 키로 `public.track` 을 부른다. 개발 서버에선 보내지 않는다.
- 저장·집계는 `supabase/sql/001_analytics.sql`. `analytics` 스키마는 API 로 열지 않고 public 함수 셋으로만 드나든다.
  - `track`: 이벤트 한 줄 + 글 조회수(`page_views`) 올리기. 봇은 UA 로 거른다.
  - `page_view_count`: 글 조회수. 누구나.
  - `stats`: 대시보드 집계. `analytics.admins` 에 있는 사람만.
- 방문자는 쿠키 없이 하루 단위 해시(그날 salt + IP + UA). salt 는 이틀 뒤 지워 지난 데이터를 사람으로 되짚을 수 없다. 그래서 "방문자"는 날마다의 순방문자를 더한 값에 가깝다.
- 원본 이벤트는 13개월 두고 pg_cron 이 지운다.
- 바깥 사이트(chad-cn.com 등)도 같은 `track` 을 부르면 된다. 사이트 이름만 정해 넣는다.
