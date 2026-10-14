import prettier from "prettier";

/* =============================================================================
 * remark-format-code — 코드 펜스를 빌드타임에 prettier 로 재포맷한다. printWidth 를
 * 읽기 폭(--measure 40rem ≈ 고정폭 60자)에 맞춰, 긴 줄이 CSS 로 아무데서나 접히는
 * 대신 소스 수준에서 논리적 위치(콤마·연산자)에서 개행되게 한다. 레포 포맷터와 같은
 * prettier 다. prettier 가 지원하지 않는 언어(py·c·txt 등)는 건너뛰고 CSS wrap 폴백
 * (.astro-code)에 맡긴다.
 *
 * 주의: .prettierrc 를 로드하지 않는다(옵션만 명시). prettier-plugin-tailwindcss 가
 * 샘플 JSX 의 className 까지 재정렬해 예제 코드를 훼손하기 때문.
 * ========================================================================== */

const PARSERS: Record<string, string> = {
  js: "babel",
  javascript: "babel",
  jsx: "babel",
  mjs: "babel",
  cjs: "babel",
  ts: "typescript",
  tsx: "typescript",
  typescript: "typescript",
  json: "json",
  jsonc: "json",
  css: "css",
  scss: "scss",
  html: "html",
};

const PRINT_WIDTH = 60;

interface MdNode {
  type: string;
  lang?: string | null;
  value?: string;
  children?: MdNode[];
}

async function formatNode(node: MdNode): Promise<void> {
  if (node.type === "code" && node.lang && typeof node.value === "string") {
    const parser = PARSERS[node.lang];
    if (parser) {
      try {
        const out = await prettier.format(node.value, {
          parser,
          printWidth: PRINT_WIDTH,
        });
        node.value = out.replace(/\n+$/, "");
      } catch {
        // 문법 오류(불완전한 스니펫 등)로 포맷 실패하면 원본을 그대로 둔다.
      }
    }
  }
  if (node.children) {
    for (const child of node.children) await formatNode(child);
  }
}

export default function remarkFormatCode() {
  return async (tree: MdNode) => {
    await formatNode(tree);
  };
}
