// 커밋 전 검사(루트 husky 가 부른다). 모든 앱·패키지에 같은 포맷·린트를 적용한다.
// 포맷은 prettier(.astro 템플릿·.md 본문까지), 린트와 import 정렬은 biome(포맷터는 biome.jsonc 에서 꺼둠. 둘이 겹치면 서로 되돌린다).
// 타입 검사는 바뀐 파일이 속한 앱만 돈다. packages 가 바뀌면 쓰는 앱이 전부라 다 돌리기엔 비싸서 정본인 design 만 돈다.
const CHECK = {
  blog: "pnpm --filter blog exec astro check",
  design: "pnpm --filter design check",
  cs: "pnpm --filter cs check",
  house: "pnpm --filter house typecheck",
  carousel: "pnpm --filter carousel typecheck",
  logic: "pnpm --filter logic typecheck",
  stats: "pnpm --filter stats typecheck",
};

export default {
  "*": [
    "biome check --write --no-errors-on-unmatched --files-ignore-unknown=true",
    "prettier --write --ignore-unknown",
  ],
  "*.{ts,tsx,astro}": (files) => {
    const apps = new Set();
    for (const f of files) {
      const m = f.match(/\/apps\/([^/]+)\//);
      if (m && CHECK[m[1]]) apps.add(m[1]);
      else if (f.includes("/packages/")) apps.add("design");
    }
    return [...apps].map((a) => CHECK[a]);
  },
};
