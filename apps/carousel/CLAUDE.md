# carousel

인스타 캐러셀(1080×1350) 컨텐츠 편집기. 배포: https://carousel.yeolyi.com
(Vercel 프로젝트 `carousel`, DNS 는 AWS Route 53 의 CNAME), 로컬: `pnpm dev` →
http://localhost:4324

## 데이터는 Supabase, 고칠 때는 로컬 사본

- 원본은 Supabase **블로그와 같이 쓰는 프로젝트(`.env.local` 의
  `SUPABASE_PROJECT_REF`)의 `carousel` 스키마**(`decks` 테이블)와 비공개 Storage
  버킷 `carousel`(`<deck id>/assets/...`)이다. 무료 플랜 프로젝트 수 제한 때문에
  블로그 DB 에 같이 산다. **`public`·`redblue` 등 블로그 쪽은 건드리지 말 것.**
- 로그인은 블로그와 같은 Supabase 인증(카카오·구글·GitHub). 누구나 가입하고, RLS
  가 `owner_id = auth.uid()` 로 자기 덱만 보게 한다. 워터마크는
  계정별(`carousel.profiles`). 스키마·정책은 `supabase/sql/` 에 있고
  `supabase db query --linked --project-ref <ref> -f <파일>` 로 적용한다(블로그
  레포가 마이그레이션 이력을 관리하므로 `db push` 금지). 파일의
  `<OWNER_USER_ID>` 같은 자리표시는 바꿔서 넣는다.
- 컨텐츠를 읽고 고칠 때(내 덱만, `CAROUSEL_OWNER_ID`): `pnpm pull` →
  `decks/<폴더>/deck.json` 을 고친다 → `pnpm push <폴더>`. 열린 편집기는
  realtime 으로 바로 받는다(실행 취소 한 칸). pull 뒤 앱에서 바뀌었으면 push 가
  거절한다.
- **AI 는 편집기 주인의 맥에서만 쓴다.** 외부 사람에게 여는 AI 연결(개인 토큰
  RPC)·서버 렌더는 없앴다(부작용이 커서, 2026-10). 덱은 위 pull/push 로 다루고,
  방법은 `skills/carousel/SKILL.md`(이 폴더의 `.claude/skills` 가 가리킨다).
  서비스 자체는 브라우저에서만 쓴다.
- **기기 프레임**: 브라우저 `/frame`(로그인 없이, 한 장씩)과 로컬 스킬
  `skills/device-frame/frame.py` 둘 다 지원한다. 기기 목록·화면 자리는
  `frames.json` 하나를 같이 읽는다.
- 결과 확인: `pnpm export <폴더>` 가 로컬 사본을 헤드리스 크롬으로 찍고, 장마다
  레이어 상자(`export/layout.json`)와 넘침 경고(글이 아래 여백을 넘을 때)를
  낸다. 앱의 "JPEG 내보내기"(브라우저 안, modern-screenshot)와 픽셀 단위로
  같음을 확인해 두었다.

```jsonc
{
  "version": 2,
  "title": "버스앱2", // 내보낸 파일 이름: <title>.001.jpeg
  "watermark": "@yeol.dev", // 모든 장 하단 가운데에 "@yeol.dev · 3/14" 로 자동 삽입. 맨 위에 그려진다
  "caption": "게시물 본문\n\n#해시태그", // 인스타 캡션(게시물 글). 내보낼 때 export/caption.txt 로도 나간다
  "slides": [
    {
      "memo": "이 장의 의도", // 기획 메모. 결과물에 안 나옴
      "valign": "top", // top | center · 쌓은 묶음의 세로 위치
      "layers": [
        // 배열 순서 = 위에서 아래로 쌓는 순서. 좌표는 없다(배치 규칙은 아래)
        {
          "type": "text",
          "style": "body", // body(40px) | caption(30px 회색)
          "color": "black", // black | red(#EE220C) · 상자 전체 색
          "text": "첫 줄\n**굵게** ==빨강== __밑줄__ ||블러||",
        },
        {
          "type": "image",
          "src": "assets/mock.png",
          "nw": 1170,
          "nh": 2532,
          "size": "normal", // small(460, 아이콘·로고) | normal(본문 폭 920) | full(좌우 끝까지 1080)
          "crop": { "x": 0, "y": 0, "w": 1, "h": 0.4 },
        },
        {
          "type": "code",
          "props": { "title": "…", "photo": "assets/x.png" },
          "code": "export default async (el, props, { asset }) => { el.innerHTML = `<img src=${await asset(props.photo)}>`; return () => {} }",
        }, // JS 모듈(Blob URL 로 import). props 로 같은 코드를 값만 바꿔 쓴다. asset() 은 덱 이미지 주소. 크기는 내용에 맞춤, 편집 UI 없음
      ],
    },
  ],
}
```

- **배치는 규칙이 정한다(`layoutSlide`, model.ts).** 좌표 없이 위에서 아래로
  쌓고, 가로는 왼쪽 여백 80px(`size: "full"` 그림만 0), 요소 사이는 본문 한 줄
  57.6px, 위·아래 여백 120px. 장마다 묶음을 위(top) 또는 세로 가운데(center)에
  둔다. 나란히 놓기·겹치기·가운데 정렬 글은 일부러 없다(2026-10, 좌표 관리를
  없애려고).
- 그림 크기도 규칙: 폭은 `size` 로 460(small,
  아이콘·로고)·920(normal)·1080(full), 높이는 크롭한 비율대로. 남은 높이보다
  크면 모든 그림이 같은 비율로 줄어든다. 그래서 넘치는 건 글이 너무 길 때뿐이고,
  편집기와 export 가 경고한다.
- 이미지 `crop` 은 원본 대비 보일 영역 비율 `{x,y,w,h}`(0~1). 폭이 고정이라 좁게
  자를수록 확대된다. 편집기에선 더블클릭으로 크롭 편집(손잡이·끌기).
- 손으로 쓸 때 레이어 `id`·`crop` 은 빼도 된다(정규화가 채운다). 이미지의
  `nw`/`nh`(원본 픽셀 크기)는 적어야 한다.
- 옛 덱(레이어에 `x`·`y` 가 있는 것, Keynote 가져오기 결과)은 읽을 때 y 순서로
  쌓고, 캔버스 밖으로 나가 있던 그림은 보이던 부분만 크롭으로
  남긴다(migrateSlide).
- 텍스트 상자는 너비가 없다. 내용에 맞춰지고(줄은 `\n` 으로 직접 나눈다), 오른쪽
  여백(폭 920)에 닿을 때만 단어 단위(`keep-all`)로 접히며 그때
  `text-wrap: balance` 가 줄을 고르게 한다.
- 가리기(도형) 레이어는 일부러 없다. 개인정보는 이미지 자체를 고쳐서 넣는다.
- 새 이미지를 넣을 땐 파일을 `assets/` 에 복사하고 `src` 를 적는다. **Storage
  키는 ASCII 만** 되므로 push 가 한글 파일 이름을 바꿔서 올린다.

## 명령

- `pnpm pull` / `pnpm push <폴더> [--force]` → Supabase 와 로컬 사본
  맞추기(Supabase CLI 로그인 필요).
- `pnpm export <폴더>` → `decks/<폴더>/export/*.jpeg` + `layout.json`, 경고는
  터미널에.
- `scripts/test-login.sh <돌아올 주소>` → 편집자 계정 1회 로그인 링크. 로그인한
  화면을 Playwright 로 볼 때 쓴다. 돌아올 주소는 경로까지 줘야 허용
  목록(`/**`)에 맞는다.
- 배포: main 에 푸시하면 Vercel 이 한다(루트 CLAUDE.md). env 는
  `PUBLIC_SUPABASE_URL`·`PUBLIC_SUPABASE_ANON_KEY`(로컬은 레포 루트 .env, anon
  키는 공개용, 접근은 RLS 가 막는다). 새 도메인을 쓰면 Supabase 인증의 redirect
  허용 목록에 추가해야 로그인이 된다.
- `pnpm import-key <파일.key> [폴더]` → Keynote 를 덱으로 변환(uv 필요).
  워터마크는 버리고, 글꼴은 Pretendard 로, 크기는 40/30 으로 맞춘다. 경고를 꼭
  읽을 것.
- `pnpm typecheck`

## 결정과 이유

- **글꼴은 Pretendard Regular·Bold 두 벌만**, 크기는 본문 40·캡션 30 고정.
  사용자가 정한 규칙이다. `font-synthesis: none` 이라 다른 굵기는 안 나온다.
- **줄 간격 1.44** 와 import 의 텍스트 여백(`TEXT_INSET_*`)은 Keynote 내보내기와
  픽셀 단위로 겹쳐 보며 맞춘 값이다(Keynote 1.2배 줄 간격 = 57.6px).
- **빨강은 `#EE220C`**: Keynote 파일에 sRGB 로 저장된 값. AppleScript 가 주는
  `#E6000E` 은 색 공간 변환이 섞인 값이라 쓰지 않는다.
- 백엔드 코드는 없다. 앱은 정적 사이트(Vercel)이고 Supabase 를 직접 부른다.
  `server/` 는 dev 전용(로컬 사본 서빙·export).
- 앱에서 지운 덱은 이미지까지 지워지고 되돌릴 수 없다.
- 글꼴은 `@font-face` 스타일시트로 넣는다(`main.tsx`). FontFace API 로만 넣으면
  브라우저 내보내기에 글꼴이 안 심긴다.
- **워터마크는 `#949494` Regular**: 흰 배경 대비 3.03:1 로 큰 글자 WCAG
  AA(3:1)를 겨우 넘기는 값. 더 연하게 하지 말 것.
- **편집기 UI 는 블로그 디자인 시스템을 따른다**(`@yeolyi/ui` 컴포넌트·토큰,
  정본은 design.yeolyi.com). 어긋나면 디자인 시스템이 이긴다. 다크 모드는 시스템
  설정을 따른다. 슬라이드 내용 규칙(글꼴·크기·색·워터마크)은 디자인 시스템과
  무관하게 그대로다.
- **`.slide` 는 상속되는 값(글꼴 크기·줄 높이·색·color-scheme·tab-size 등)을
  직접 고정한다**(`styles.css`). 편집기 UI 의 본문 크기·다크 모드·Tailwind
  preflight 가 슬라이드와 코드 레이어(Shadow DOM 도 상속받는다)로 새면 내보낸
  픽셀이 바뀐다. UI 를 고친 뒤엔 `/render-local` 결과가 전과 픽셀 단위로 같은지
  본다.
- 캔버스 위 편집 표시(선택 상자·크롭 손잡이)는 테마와 상관없이
  `--canvas-ink`(짙은 잉크)로 그린다. 슬라이드는 늘 흰 종이다.
- **코드 레이어**: 덱은 주인만 열 수 있어 코드도 주인 브라우저에서만 돈다.
  그래서 막지 않고 그대로 실행한다(Blob URL 로 `import()` 해 `export`·맨 위
  `import` 를 쓸 수 있게). Shadow DOM 에 담아 편집기 CSS(`label`·`input` 등)가
  새어 들지 않게 한다. 편집 UI 는 없고, 편집기에서도 내용은 늘 조작되며 선택은
  왼쪽 위 손잡이로 한다. 내용 안 입력칸의 키가 편집기 단축키로 새지 않게
  `composedPath()[0]` 로 판별한다. modern-screenshot 이 Shadow DOM 을 복제하므로
  JPEG 내보내기도 된다.
- **모바일(760px 이하)** 은 위 바·가로 장 띠·캔버스·아래 시트(레이어/인스타 캡션
  탭)로 바뀐다. 캔버스는 `touch-action: none`, 두 번 탭이 더블클릭 대신이다.
  내보내기는 다 만든 뒤 사용자가 "공유"를 눌러야 공유 시트가 열린다(iOS 는 탭
  안에서만 `navigator.share` 를 허락).
