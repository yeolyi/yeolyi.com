import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { unified } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import node from "@astrojs/node";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import rehypeExternalLinks from "@yeolyi/site/markdown/rehype-external-links";
import remarkFormatCode from "@yeolyi/site/markdown/remark-format-code";
import { mono, stripBackground } from "@yeolyi/site/markdown/shiki-mono";
import { SITES } from "@yeolyi/ui/sites";
import { defineConfig } from "astro/config";
import { visualizer } from "rollup-plugin-visualizer";

const adapter = process.argv.includes("--node")
  ? node({ mode: "standalone" })
  : vercel();

// https://astro.build/config
export default defineConfig({
  site: "https://yeolyi.com",
  server: { port: SITES.blog.port },
  integrations: [
    react(),
    mdx(),
    // noindex 라우트(비공개·인증 콜백)는 제출하지 않는다 — noindex 페이지가
    // 사이트맵에 있으면 GSC 신호 충돌 경고가 쌓인다.
    sitemap({
      filter: (page) => !page.includes("/private") && !page.includes("/auth/"),
    }),
  ],
  adapter,
  // 다른 도메인으로 옮긴 것들: 디자인 시스템 글, 자기 사이트가 있는 작업의 소개 페이지, 논리 게이트 예제 회로.
  // CS 시리즈는 글마다 하나씩 건다. Astro 는 바깥 주소로 가는 동적 경로(/cs/[...path])를 못 만들고,
  // 어댑터가 빌드 결과를 직접 내므로 vercel.json 의 redirects 도 먹지 않는다.
  redirects: {
    "/cs": "https://cs.yeolyi.com",
    "/cs/cpu/simulator": "https://cs.yeolyi.com/cpu/simulator",
    ...Object.fromEntries(
      readdirSync(new URL("../cs/mdx", import.meta.url))
        .filter((d) => /^\d+-/.test(d))
        .map((d) => d.replace(/^\d+-/, ""))
        .map((s) => [`/cs/${s}`, `https://cs.yeolyi.com/${s}`]),
    ),
    "/post/design-system": "https://design.yeolyi.com",
    "/work/carousel": "https://carousel.yeolyi.com",
    "/work/logic-gate-simulator": "https://logic.yeolyi.com",
    "/work/chadcn-ui": "https://chad-cn.com",
    ...Object.fromEntries(
      [
        "half-adder",
        "full-adder",
        "seven-segment",
        "fibonacci-8bit",
        "fibonacci-8bit-nand",
      ].map((s) => [
        `/craft/logic-gate-simulator/${s}`,
        `https://logic.yeolyi.com/examples/${s}`,
      ]),
    ),
  },

  vite: {
    // 비밀값은 레포 루트 .env 하나에 둔다(블로그가 apps/blog 로 옮기기 전부터 거기 있었다).
    envDir: fileURLToPath(new URL("../..", import.meta.url)),
    plugins: [
      tailwindcss(),
      // 번들 분석은 명시적 opt-in: STATS=1 astro build. import.meta.env 는 설정
      // 로드(plain Node) 시점엔 undefined 라 여기서 쓰면 안 된다.
      process.env.STATS &&
        visualizer({ emitFile: true, filename: "stats.html" }),
    ],
    worker: {
      format: "es",
    },
  },

  markdown: {
    shikiConfig: {
      // 색을 DS CSS 변수로 지정한 단일 흑백 테마. 다크는 토큰이 뒤집혀 자동 대응.
      theme: mono,
      transformers: [stripBackground],
    },
    // v7 기본 프로세서 대신 remark/rehype 파이프라인 유지(커스텀 플러그인 사용).
    processor: unified({
      // 코드 펜스를 읽기 폭(60자)에 맞춰 prettier 로 재포맷(shiki 하이라이팅 전 단계).
      remarkPlugins: [remarkFormatCode],
      // 외부(절대 http) 링크에 target=_blank + rel 부여(모양은 다른 링크와 같다).
      rehypePlugins: [rehypeExternalLinks],
    }),
  },

  prefetch: true,
});
