# yeolyi.com

개인 사이트 (Astro + React 아일랜드 + Supabase). 한국어 전용.

## 파일 배치 컨벤션

파일 위치는 "무엇을 import해도 되는가"라는 **의존 방향**으로 결정한다. 위는
아래를 import할 수 있고, **아래는 위를 절대 import하지 않는다.**

```
pages         라우트 셸 (데이터 fetch + import + 최소 조립만)
  ↓
components/{feature}   기능 콜로케이션 (home · resume · private · post):
                       그 기능의 컴포넌트 + 전용 유틸·타입·상태
  ↓
@yeolyi/logic   논리게이트 시뮬레이터 (레포 루트 packages/logic, logic.yeolyi.com 과 공용)
@yeolyi/ui      DS 컴포넌트 (도메인 지식 0, 레포 루트 packages/ui) · lib   범용 런타임 유틸
```

라우팅 대상이 아닌 옆 갈래: `mdx`(글 + 글 전용 콜로케이션, **리포 최상단**) ·
`actions`(서버) · `build`(remark/rehype/shiki) · `assets` · `style` · `types`.

### 판별식 (공용이냐 아니냐)

> `lib/`·`@yeolyi/ui`에 둔 코드가 feature나 post(콘텐츠)를 import해야 한다면
> 그건 공용이 아니다. 소비하는 기능 폴더로 내려라.

- **소비자 2곳+** → `lib/`(유틸) 또는 `packages/ui`(컴포넌트, 다른 앱도 쓰는 DS
  부품만)
- **소비자 1곳** → 그 기능 폴더로 콜로케이션 (지금 공용이 아니면 모아둔다.
  나중에 두 번째 소비자가 생기면 그때 올린다)

ui·logic 은 별도 패키지라 블로그 코드를 import 할 수 없다. logic 은
입구(`@yeolyi/logic`)와 `theme.css` 만 내보내 안쪽 파일로 들어올 수 없다.

### 디렉토리 규칙

| 위치                                    | 담는 것                                                                                                     |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `src/pages/`                            | **라우트만.** Astro가 여기 `.ts`→엔드포인트, `.astro`→페이지로 만든다. 유틸·부분 컴포넌트를 여기 두지 말 것 |
| `src/components/{feature}/`             | 그 기능 컴포넌트 + 전용 유틸(`{feature}/lib/`)·타입                                                         |
| `src/lib/`                              | 범용 런타임 유틸만 (`content`, `supabase-server` 등)                                                        |
| `@yeolyi/site`(레포 루트 packages/site) | 기본 꼴(base.css)·글 스타일(prose.css)·마크다운 플러그인. design 앱과 같이 쓴다                             |
| `mdx/post/{slug}/`                      | 글: `ko.mdx` + `components/` + `lib/`(유틸·훅·스토어) + `assets/`. **리포 최상단**                          |
| `src/actions/`                          | 서버 액션                                                                                                   |
| `src/assets/`                           | 기능에 안 매인 전역 앱 레벨 에셋만 (홈 히어로·전역 OG 등)                                                   |

- **기능 전용 유틸은 `{feature}/lib/`**, **기능 전용 에셋은
  `{feature}/assets/`** 에 (콘텐츠 글의 `mdx/post/{slug}/lib`·`assets`와 동일
  패턴). import 는 상대경로 `./assets/…`.
- 글이 아닌 문서(로드맵·스펙·초안)는 컬렉션에 안 잡히게 `mdx/` 밖 또는 루트
  `.md`로 둔다.
- 콘텐츠에서 코드로 들어가는 import는 `@mdx/*` (→ `mdx/*`) 별칭.
- **이미지 규약** — 기본은 마크다운 `![캡션](./assets/x.png)`: `Img.astro`가
  본문 폭 기준 1x/2x webp 로 최적화하고 alt 를 캡션(figcaption)으로 렌더한다.
  크기·배치를 개별 제어할 때만 `import` + astro:assets `<Image>`. 테마 색을
  따라야 하는 SVG(로고·다이어그램)는 `import Logo from "./x.svg"` 후 `<Logo />`
  인라인 (SVG 컴포넌트, `fill="currentColor"`). 로고 여러 개의 크기는 등면적
  규칙으로 맞춘다: `h = H₀ ÷ √(가로세로비)` — 지각 크기는 면적을 따른다.

### 네이밍

- 컴포넌트 `PascalCase` (`.tsx` 아일랜드 / `.astro` 정적)
- 유틸·훅·스토어 `camelCase` (`useHeart.ts`, `trainerStore.ts`)
- 폴더 lowercase, 서브시스템 진입점은 `index.ts(x)` 배럴
- **같은 폴더에서 컴포넌트와 유틸 파일명이 대소문자만 다르면 안 됨** (macOS
  파일시스템 충돌). 유틸은 `{feature}/lib/` 로 분리해 회피한다.
- import는 별칭 절대경로: `@/*` → `src/*`, `@mdx/*` → `mdx/*`

## 콘텐츠

- 글은 리포 최상단 `mdx/post/`. 컬렉션은 `post` 하나(`src/content.config.ts`).
  CS 시리즈는 cs.yeolyi.com(`apps/cs`)으로 옮겼고, 옛 `/cs/*` 주소는
  `astro.config.mjs` 의 redirects 가 넘긴다.
- 추천·조회수·MDX 요소는 `@yeolyi/post`(레포 루트 packages/post).
- URL slug는 폴더명에서 파생(`lib/content.ts`의 `postSlug`) — 프런트매터에 적지
  않는다.

## 문제 해결 원칙

증상을 수동으로 고치지 말고 원인을 찾아 시스템을 고쳐라. 사용자가 의식적으로
반복 작업하지 않아도 자연스럽게 올바른 상태가 유지되는 방향을 택한다.
