// 모노레포 루트의 lint-staged 가 이 파일을 찾아 블로그 파일에만 적용한다. 명령은 루트에서
// 실행되므로 블로그의 node_modules 실행 파일을 쓰도록 `pnpm --filter blog exec` 로 부른다.
export default {
  // tsc(CLI)는 .ts 의 .astro import 를 해석하지 못한다 — astro check 로 .ts/.tsx 에
  // 더해 .astro 프런트매터까지 타입체크한다.
  "*.{ts,tsx,astro}": [() => "pnpm --filter blog exec astro check"],
  "*": [
    "pnpm --filter blog exec biome check --write --no-errors-on-unmatched --files-ignore-unknown=true",
    "pnpm --filter blog exec prettier --write --ignore-unknown",
  ],
};
