/* =============================================================================
 * mono — Tonsky식 흑백 구문 강조 (https://tonsky.me/blog/syntax-highlighting/)
 *
 * 토큰 "종류"별로 색칠하는 대신, 색조도 굵기도 없이 시스템 프리미티브만 쓴다:
 *   muted — 키워드·저장소·연산자·구두점·주석 (예측 가능한 노이즈, 죽인다)
 *   ink   — 이름·변수·함수·문자열·숫자·정의 (기본, 읽는 대상)
 *
 * 색을 DS CSS 변수로 지정해 단일 테마 하나로 라이트/다크를 모두 처리한다 —
 * 토큰(--color-foreground/muted-foreground)이 다크에서 알아서 뒤집히므로, shiki 가
 * 인라인으로 박는 색이 그대로 다크에 대응한다(별도 다크 테마·!important 불필요).
 * 배경은 투명(본문과 동일 취급), 볼드는 쓰지 않는다(2색·1굵기).
 * ========================================================================== */

const ink = "var(--color-foreground)";
const muted = "var(--color-muted-foreground)";

export const mono = {
  name: "mono",
  type: "light" as const,
  colors: {
    "editor.foreground": ink,
  },
  settings: [
    { settings: { foreground: ink } },
    {
      scope: [
        "keyword",
        "storage",
        "storage.type",
        "storage.modifier",
        "keyword.control",
        "keyword.operator",
        "punctuation",
        "punctuation.separator",
        "punctuation.terminator",
        "punctuation.definition",
        "meta.brace",
        "comment",
        "punctuation.definition.comment",
      ],
      settings: { foreground: muted },
    },
  ],
};

// 배경은 CSS(.astro-code) 소유 — 테마가 주는 배경(투명 정규화 #00000003 포함)을
// 출력에서 제거한다.
export const stripBackground = {
  name: "strip-background",
  pre(node: { properties: { style?: string } }) {
    if (typeof node.properties.style === "string") {
      node.properties.style = node.properties.style
        .split(";")
        .filter((decl) => !decl.startsWith("background-color:"))
        .join(";");
    }
  },
};
