# house

청약 공고를 내 상황에 맞춰 걸러 보는 알리미. 배포: https://house.yeolyi.com
(Vercel 프로젝트 `house`, DNS 는 AWS Route 53 의 CNAME), 로컬: `pnpm dev` →
http://localhost:4323

## 구조

```
src/                       화면(Vite + React). 판정은 브라우저에서 한다. 블로그 글처럼 45rem 한 단, 목록은 날짜 + 제목 한 줄
  settings/steps.tsx       개인화 질문 목록(한 페이지에 질문 하나). 요약 페이지와 질문 페이지가 이것 하나를 본다
  views/Guide.tsx          가이드(처음 보는 사람용 안내, 한 페이지에 개념 하나)
supabase/functions/_shared/ 도메인. 화면(@shared 별칭)과 Edge Function 이 같은 파일을 쓴다. CLI 가 functions 밖 파일을 함수에 싣지 않아 여기 둔다
  types · dates · rules(규칙의 숫자) · site(단지 키·살아있음) · verdict(판정) · eligibility(누가·사다리) · checks(기준 줄) · links(지도 링크)
supabase/sql/              house 스키마. 적용은 carousel 과 같이 `supabase db query --linked -f`(db push 금지)
supabase/functions/
  house-collect            매시 7분 pg_cron. 청약홈 API + 마이홈 내부 조회 → house.notices (전국, 판정 없이)
  _lib/                    원천 클라이언트·수집. collect.ts 는 Deno 전역을 안 써서 Node 테스트가 부른다
tests/unit/                node --test. 원천은 가짜를 주입하고, fixtures/ 는 실제 응답 표본
```

## 결정과 이유

- **판정은 저장하지 않는다.** 사람마다 설정이 달라서 공고만 공유하고,
  화면(브라우저)이 `_shared/verdict.ts` 로 계산한다.
- **돈으로 거르지 않는다.** 법이 정한 자격(소득·자산 상한)만 판정하고, 감당할 수
  있는지(자기자본·대출·계약금)는 보지 않는다. 돈은 그때 가서 마련하는 경우가
  많고, 대출 규제는 자주 바뀐다. 대출 계산은 가이드의 계산기에만 있다.
- **지도 API 를 부르지 않는다.** 통근은 판정하지 않고, 공고마다 카카오맵·네이버
  지도의 주소 검색 링크만 건다. 두 지도의 길찾기는 좌표가 있어야 경로가 뜨는데
  좌표를 얻으려면 지도 API(TMAP·네이버 내부 호출)를 불러야 해서 뺐다. 네이버
  지도는 robots.txt 가 내부 API 경로를 막는다.
- **설정은 GOV.UK 식.** 한 페이지에 질문 하나, 답을 모은 요약에 바꾸기 링크.
  계산 가정(소득 기준)은 차례로 묻지 않고 요약에서만 바꾼다.
- **개인화 정보(생년월일·소득·자산 등)는 브라우저에만 둔다.** localStorage
  `house:settings`. 로그인·서버 저장·메일은 없앴다(개인정보를 서버에 두지
  않으려고). 다른 브라우저로는 개인화 화면의 내보내기·가져오기(JSON 파일)로
  옮긴다.
- **예약 실행은 pg_cron → pg_net → Edge Function.** 두 함수는 verify_jwt 를 끄고
  `x-cron-secret` 헤더(Vault `house_cron_secret` = 함수 비밀값 `CRON_SECRET`)로
  막는다.
- 규칙 숫자(`_shared/rules.ts`)는 한 가구(경기 성남, 예비신혼)를 기준으로 원문과
  대조한 것이다. 민영 1순위 예치금(지역·면적별), 다자녀·노부모 특공 등은 아직
  일반화하지 않았다.
- **규칙 숫자는 법령 원문으로 확인한다.** 청약홈 안내 표는 줄여 쓴 데가
  있다(공공 추첨이 "부부 모두 소득이 있는 경우"로만 적혀 있지만, 별표 6은 앞
  구간에서 떨어진 외벌이도 넣는다). 국가법령정보센터 본문은
  `https://www.law.go.kr/LSW/lsInfoR.do?lsiSeq=<번호>` 를 curl 로
  받고(주택공급에 관한 규칙 286965, 공공주택 특별법 시행규칙 289013. 개정되면
  번호가 바뀌니 `lsScListR.do` 검색으로 찾는다), 별표는 그 페이지의
  `flDownload.do?flSeq=` PDF 를 pdftotext 로 읽는다.
- 화면은 디자인 시스템(`@yeolyi/ui`·`@yeolyi/site`, 정본 design.yeolyi.com)을
  따른다. 맨 위는 ServiceHeader. 초록·빨강이 없어 판정 ✓/✗ 는 기호와 굵기로
  가른다.

## 비밀값 (Edge Function, `supabase secrets set --project-ref <ref>`)

| 이름            | 무엇                                                         |
| --------------- | ------------------------------------------------------------ |
| `APPLYHOME_KEY` | 공공데이터포털 청약홈 분양정보 API 인증키                    |
| `CRON_SECRET`   | pg_cron 이 보내는 헤더 값. Vault `house_cron_secret` 과 같게 |

화면 env 는 `PUBLIC_SUPABASE_URL`·`PUBLIC_SUPABASE_ANON_KEY`(로컬은 레포 루트
.env, 블로그·carousel 과 같은 값). `house` 스키마는 API 설정의 Exposed schemas
에 넣어야 PostgREST 가 연다.

## 명령

- `pnpm dev` / `pnpm build` / `pnpm test` / `pnpm typecheck`(tsc + deno check)
- 함수 배포: 이 폴더에서 `supabase functions deploy --project-ref <ref>`
  (config.toml 이 verify_jwt 를 정한다)
- 화면 배포: main 에 푸시하면 Vercel 이 한다(루트 CLAUDE.md). 함수는 위 명령으로
  따로 올린다
- 로컬 전체 확인: 이 폴더에서 `supabase start`, SQL 의
  `<PROJECT_REF>.supabase.co` 를 `kong:8000` 으로 바꿔 DB 컨테이너에 적용,
  `supabase functions serve --env-file <비밀값 파일>`, `.env.local` 을 로컬
  주소·anon 키로 두고 `pnpm dev`

## 원천이 바뀌었을 때

청약홈은 공개 API, 마이홈은 웹 내부 호출이라 예고 없이 바뀔 수 있다. 화면 맨
아래 상태 줄(`house.runs` 의 마지막 collect)은 평소엔 숨어 있고, 수집이
실패하거나 두 시간 넘게 멈추면 나타난다.

- **"청약홈 401/403"**: 인증키 문제. data.go.kr 마이페이지에서 활용기간을 본다.
- **LH 잔여세대가 안 들어온다**: 마이홈 `selectLttotHouseList.do` 의 폼 필드나
  응답 키(`resultList`, `pblancNm`, `brtcCodeNm`)가 바뀐 것.
  `tests/fixtures/myhome-rows.json` 에 2026-09 응답 표본이 있다.
- **지도 링크가 엉뚱한 곳을 연다**: `_shared/links.ts`. 카카오 `/link/search` 는
  문서화된 형식, 네이버 `/p/search` 는 아니다.
