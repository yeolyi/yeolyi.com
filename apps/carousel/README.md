# carousel

인스타그램 캐러셀(1080×1350) 컨텐츠를 만드는 웹 편집기.
https://carousel.yeolyi.com

- 텍스트(Pretendard Regular·Bold, 검정·빨강, 본문·캡션)와
  이미지(이동·크기·크롭·겹침 순서)
- 장마다 하단 가운데에 워터마크와 페이지 번호 자동 삽입(계정별 워터마크)
- 게시물 본문(인스타 캡션) 함께 관리
- 브라우저 안에서 장마다 JPEG 으로 내보내기(zip, 모바일은 공유 시트)
- 카카오·구글·GitHub 로그인, 계정별 덱

## 구성

- 앱: Vite + React 정적 사이트(Vercel). 백엔드 코드 없이 Supabase 를 직접
  부른다.
- 데이터: Supabase Postgres `carousel` 스키마(덱 JSON)와 비공개 Storage 버킷
  `carousel`(이미지). 접근은 RLS 로 `owner_id = auth.uid()` 만 허용.
- 스키마·정책: `supabase/sql/` (자리표시 `<PROJECT_REF>`·`<OWNER_USER_ID>` 를
  바꿔 순서대로 적용)

## 개발

```sh
pnpm install
cp .env.example .env.local   # 값 채우기
pnpm dev                     # http://localhost:4324
```

Supabase 인증의 redirect 허용 목록에 `http://localhost:4324/**` 와 배포 주소를
넣어야 로그인이 된다.

덱 JSON 형식과 설계 결정은 [CLAUDE.md](CLAUDE.md) 에 있다.
