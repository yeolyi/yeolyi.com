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
  classify(공고 분류: 국민·민영 × 공급 구분 × 지역 등급) · requirements(조문 단위 요건 → 충족/미충족/모름) · specials(신혼 말고 다른 특공의 요건) · rules(규칙의 숫자)
  verdict(목록의 후보·제외) · eligibility(사람·통장·소득 구간) · site(단지 키·살아있음·마이홈 중복) · types · dates · links(지도 링크)
  settingsFile(개인화 저장 형식의 판·옛 판 고치기·내보내기 파일) · units(주택형 표기). 화면만 쓰지만 node 테스트가 부르게 여기 둔다
supabase/sql/              house 스키마. 적용은 carousel 과 같이 `supabase db query --linked -f`(db push 금지)
supabase/functions/
  house-collect            매시 7분 pg_cron. 청약홈 API + 마이홈 내부 조회 → house.notices (전국, 판정 없이)
  _lib/                    원천 클라이언트·수집. collect.ts 는 Deno 전역을 안 써서 Node 테스트가 부른다
tests/unit/                node --test. 원천은 가짜를 주입하고, fixtures/ 는 실제 응답 표본
scripts/                   backfill(지난 공고 넣기) · enrich(지난 공고에 주택형·분류 칸 채우기, 한 번이면 됨)
```

## 결정과 이유

- **판정은 저장하지 않는다.** 사람마다 설정이 달라서 공고만 공유하고,
  화면(브라우저)이 `_shared/verdict.ts` 로 계산한다.
- **돈으로 거르지 않는다.** 법이 정한 자격(소득·자산 상한)만 판정하고, 감당할 수
  있는지(자기자본·대출·계약금)는 보지 않는다. 돈은 그때 가서 마련하는 경우가
  많고, 대출 규제는 자주 바뀐다. 공고 정보 탭의 주택형 표에는 최고 분양가로
  어림한 계약금(10~20%)과 대출 뒤 내 돈(rules.ts 의 MONEY_EXAMPLE)을 참고로 보여
  주고, 직접 바꿔 보는 계산기는 가이드에 있다.
- **지도는 카카오 지도 하나, 길찾기는 링크.** 공고 상세의 공고 정보 탭에 카카오
  지도(JavaScript SDK, 주소 → 좌표는 SDK 의 Geocoder 가 브라우저에서)로 핀
  하나를 찍는다. 키는 공개용 `PUBLIC_KAKAO_MAP_KEY`(yeolyebon.com 과 같은 카카오
  앱)라 카카오 개발자 콘솔의 Web 도메인에 house.yeolyi.com·localhost:4323 이
  있어야 뜬다. 실패하면 지도 없이 링크만 남는다. 통근은 판정하지 않고,
  카카오맵·네이버 지도 주소 검색 링크로 사람이 본다(네이버 지도는 robots.txt 가
  내부 API 를 막고, 지도 API 는 클라우드 가입·결제 등록이 필요해 뺐다).
- **설정은 GOV.UK 식.** 한 페이지에 질문 하나, 답을 모은 요약에 바꾸기 링크.
  소득 기준(도시근로자 월평균소득)은 묻지 않는다. 매년 바뀌는 공식 숫자라
  `_shared/rules.ts` 의 INCOME*BASE*<연도> 를 해마다 바꾸고, 가구원 수(신청자 +
  자녀)로 칸을 고른다.
- **개인화 정보(생년월일·소득·자산 등)는 브라우저에만 둔다.** localStorage
  `house:settings`. 로그인·서버 저장·메일은 없앴다(개인정보를 서버에 두지
  않으려고). 다른 브라우저로는 개인화 화면의 내보내기·가져오기(JSON 파일)로
  옮긴다.
- **예약 실행은 pg_cron → pg_net → Edge Function.** 두 함수는 verify_jwt 를 끄고
  `x-cron-secret` 헤더(Vault `house_cron_secret` = 함수 비밀값 `CRON_SECRET`)로
  막는다.
- **판정은 공고 분류 → 요건 표 → 맞춰 보기.** 요건은 조문 하나가 한
  줄(`requirements.ts`)이고, 공고 분류(`classify.ts`)가 어떤 요건이 붙는지
  정한다. 화면 문구는 요건의 이름에서 나온다. 원본에 없는 조건(시·도가 늘린
  1순위 기간, 무순위 거주 요건 등)은 추측하지 않고 "모름"으로 둔다. 알고리즘
  전체는 가이드 부록(/guide/algorithm)에 있고, 요건을 바꾸면 부록도 같이 고친다.
  신혼 말고 다른 특공(신생아·생애최초·다자녀·노부모·청년)은 `specials.ts`.
  공공분양은 공공주택 특별법 시행규칙 별표 6, 민영은 규칙 각 조문을 따른다.
  공공임대, 청년 특공의 소득·자산(별표 6의6), 다자녀 배점(고시)은 판정하지
  않는다.
- **규칙 숫자는 법령 원문으로 확인한다.** 청약홈 안내 표는 줄여 쓴 데가
  있다(공공 추첨이 "부부 모두 소득이 있는 경우"로만 적혀 있지만, 별표 6은 앞
  구간에서 떨어진 외벌이도 넣는다). 국가법령정보센터 본문은
  `https://www.law.go.kr/LSW/lsInfoR.do?lsiSeq=<번호>` 를 curl 로
  받고(주택공급에 관한 규칙 286965, 공공주택 특별법 시행규칙 289013. 개정되면
  번호가 바뀌니 `lsScListR.do` 검색으로 찾는다), 별표는 그 페이지의
  `flDownload.do?flSeq=` PDF 를 pdftotext 로 읽는다. 공공주택 특별법 시행규칙
  별표처럼 그림으로만 있는 건
  `lsBylInfoPLinkR.do?lsNm=<법령명>&bylNo=0006&bylBrNo=00&bylCls=BE` 에서 bylSeq
  를 얻고, `lsBylContentsInfoR.do` 에 POST(bylSeq·lsiSeq)하면 쪽마다 GIF 의
  flSeq 가 나온다.
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
