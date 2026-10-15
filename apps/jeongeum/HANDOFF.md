# 정음 — 인수인계 (Claude Code용)

이 폴더는 한글날(2026-10-09)에 만든 크롬 확장 「정음」의 전체 소스와 소개 캐러셀
초안이다. 이 세션에서 할 일은 **@yeol.dev 인스타그램에 올릴 소개 캐러셀을
완성하는 것**이다. 캐러셀은 carousel 스킬(SKILL.md)을 따른다. 스킬 설치와 토큰
설정은 사용자가 따로 준다.

## 1. 확장 프로그램 개요

- 이름: **정음 — 외국어를 한글 소리로** (짧은 이름 "정음", 아이콘은 빨간 바탕에
  "한")
- 이름 유래: 훈민정음, "바른 소리"
- 기능: 켜 두면 웹페이지의 영어·일본어·중국어(+악센트 붙은 라틴 문자)를 한글
  음차로 바꿔 보여 준다. 끄면 원래대로 돌아온다.
- 팝업 설정: 전체 켜기/끄기, 사이트별 끄기, 숫자도 한글로 읽기(기본 끔, 2026 →
  이천이십육)
- 권한: `storage` 하나 + 모든 사이트 content script. 네트워크 요청 없음, 데이터
  수집 없음.
- Manifest V3, 순수 JS, 빌드 도구 없음. zip 크기 약 690KB(사전 data.js 약
  1.5MB).

## 2. 어떻게 만들었나 (캐러셀 소재)

**영어**

- 철자로는 발음을 알 수 없다는 게 핵심 문제: though → 도, through → 스루, tough
  → 터프
- 그래서 **CMU 발음사전**의 발음기호를 한글로 조합한다. computer = K AH M · P Y
  UW · T ER → 컴퓨터
- wordfreq 빈도 상위 **6만 단어**를 빌드할 때 미리 변환해 사전(data.js)에
  넣는다. 사전에 없는 단어는 철자 규칙으로 처리한다.
- 외래어 표기법 규칙을 코드로 옮겼다: 짧은 모음 뒤 t는 받침(cat → 캣), 모음 앞
  l은 겹침(melon → 멜론), 어말 -le은 '을'(google → 구글)
- 발음대로만 적으면 약모음(schwa)이 전부 '어'가 돼 어색하다: political →
  펄리터컬, family → 패멀리
  - 철자의 모음 글자와 발음기호의 모음을 짝지어, 약모음은 철자대로 적게 보정했다
    → **폴리티컬, 패밀리**
- 굳어진 표기는 직접 넣었다: GitHub → 깃허브, YouTube → 유튜브, frontend →
  프론트엔드
- 약어는 알파벳 이름으로 읽는다: API → 에이피아이, HTML → 에이치티엠엘 (NASA →
  나사처럼 읽히는 건 예외)

**일본어**

- 가나는 외래어 표기법 표대로: ラーメン → 라멘, コーヒー → 고히, カフェ → 가페
- 한자는 **우리 한자음**으로 읽는다: 東京 → 동경 (그래서 東京タワー →
  동경다와처럼 낯설게 나오기도 한다)

**중국어**

- 병음(pypinyin)을 중국어 표기법으로 한글화: 北京欢迎你 → 베이징환잉니, 你好 →
  니하오
- 한자를 어떻게 읽을지는 페이지 언어(lang)와 가나가 섞였는지로 판단한다.

**동작 방식**

- 바꾼 텍스트 노드마다 원문을 WeakMap에 기억해 두고, 끄면 그대로 돌려놓는다.
- 유튜브 같은 SPA나 무한 스크롤은 MutationObserver로 따라간다.
- 입력창, textarea, code/pre, 편집 중인 글(contenteditable)은 건드리지 않는다.
- 모든 변환은 브라우저 안에서만 한다.

**만들면서 잡은 버그** (비하인드 소재)

- カフェ가 "가헤", プロフィール이 "푸로히루"로 나옴 → ふ 계열 작은 모음 처리
  수정해 "가페", "푸로피루"
- 长城이 "장청"으로 나옴 → 여러 소리가 나는 한자 기본값 보정해 "창청"
- custom → 커스톰, installation → 인스탈레이션 → "커스텀", "인스톨레이션"

**지원 언어를 고른 이유**

- Semrush 2026년 8월 기준 한국 방문 상위 사이트는 YouTube, Google, Naver, X,
  ChatGPT, Instagram, Reddit, AliExpress 등 대부분 영어/국제 사이트였다. 그다음
  많이 접하는 게 일본어·중국어라 이 셋부터 지원했다.

## 3. 검증된 변환 결과 (캐러셀에 그대로 써도 됨)

실제 엔진으로 돌려서 확인한 값이다. 새 예시를 쓰려면
`node build/try.js "문장"`으로 먼저 확인할 것. | 원문 | 결과 | |---|---| |
Hello, world! Welcome to my YouTube channel. | 헬로, 월드! 웰컴 투 마이 유튜브
채널. | | Sign in to GitHub — Build software better, together. | 사인 인 투
깃허브 — 빌드 소프트웨어 베터, 투게더. | | Frontend Developer at Kakao, working
with React and TypeScript | 프론트엔드 디벨로퍼 앳 카카오, 워킹 위드 리액트 앤드
타입스크립트 | | Sign in to continue / Breaking news | 사인 인 투 컨티뉴 /
브레이킹 뉴스 | | though through tough | 도 스루 터프 | | political family |
폴리티컬 패밀리 | | computer melon cat google | 컴퓨터 멜론 캣 구글 | | API,
HTML, CSS, NASA, iPhone | 에이피아이, 에이치티엠엘, 씨에스에스, 나사, 아이폰 |
| ラーメン / コーヒー / コーヒーとチョコレート | 라멘 / 고히 / 고히토초코레토 |
| 東京 / 東京タワー / 東京のカフェ | 동경 / 동경다와 / 동경노카페 |
| 北京欢迎你 / 你好 / 长城 | 베이징환잉니 / 니하오 / 창청 |

## 4. 출시 상태 (2026-10-10 기준, 사용자가 최신 상태로 고쳐 줄 것)

- 크롬 웹 스토어 항목 ID: `dnjpljkangmliladjiifbdfhdkbgepah` (초안)
- 완료: 개발자 등록(비판매자), 패키지 업로드, 제목·요약·설명, 아이콘, 캡처화면
  1장, 프로모션 타일
- 남은 것:
  - 게시자 연락처 이메일 입력 및 인증
  - 개인정보처리방침 링크: claude.ai 아티팩트로
    만들었음(https://claude.ai/artifact/WnTAT8scHQHVB3ke6TxzWi). 공개로 공유해야
    심사자가 열 수 있음
  - "광범위한 호스트 권한" 경고: 그대로 내면 정밀 심사(1~3주 예상). 대안은 기본
    activeTab + 자동 변환은 optional_host_permissions. **아직 결정 안 함**
  - 실제 크롬에서 한 번도 안 돌려 봄(jsdom/headless로만 검증). 공개 전
    `chrome://extensions` → 압축해제 로드로 테스트 필요
- 캡처화면 카피: "세종대왕 보시기에 좋은 인터넷" / "켜면 영어·일본어·중국어가
  소리 나는 대로 바뀝니다."

## 5. 캐러셀 초안

- `carousel/deck.json`: carousel 스킬 형식의 8장짜리 초안. 아직 편집기에 안
  올렸다.
  - 1 훅(Hello, world! → 헬로, 월드!) → 2 사용 예시 → 3
    문제(though/through/tough) → 4 발음기호 → 한글 조합 → 5 schwa 보정 → 6
    일본어·중국어 → 7 원래대로 되돌리기/프라이버시 → 8 마무리
  - 2장은 실제 화면 캡처를 편집기에서 넣어야 한다(스크립트로 이미지 추가 불가).
  - 캡션의 "심사 중" 문구는 실제 출시 상태에 맞게 고칠 것.
- 올리기: `node <스킬 폴더>/carousel.mjs new carousel/deck.json`
- 사용자 톤: @yeol.dev는 개발자 대상 계정. 문구는 짧고 담백하게, AI 같은 장식
  문구는 피한다(사용자가 "AI스럽다"고 여러 번 지적함).

## 6. 폴더 구조

```
ext/            확장 프로그램 본체(이 폴더를 zip하면 스토어용 패키지)
  manifest.json, content.js, popup.html, popup.js, engine.js, data.js, icons/, CREDITS.txt
src/engine.js   음차 엔진 원본(빌드 시 ext/로 복사)
build/          사전 생성 스크립트
  dump.py       CMU·wordfreq·pypinyin·hanja → data/*.tsv (pip: cmudict wordfreq pypinyin hanja)
  build.js      data/*.tsv → ext/data.js
  overrides.js  굳어진 표기 사전
  pinyin.js     병음 → 한글
  try.js        문장 변환 확인: node build/try.js "문장"
data/           원천 데이터 TSV
carousel/deck.json   소개 캐러셀 초안
kit/            스토어 제출 파일(zip, 이미지, STORE.md 문구)
```
