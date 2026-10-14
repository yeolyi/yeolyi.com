import { fileURLToPath } from "node:url";
import { unified } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import rehypeExternalLinks from "@yeolyi/site/markdown/rehype-external-links";
import remarkFormatCode from "@yeolyi/site/markdown/remark-format-code";
import { mono, stripBackground } from "@yeolyi/site/markdown/shiki-mono";
import { SITES } from "@yeolyi/ui/sites";
import { defineConfig } from "astro/config";

// cs.yeolyi.com. 글 처리는 블로그와 같은 것(@yeolyi/site)을 쓴다. 추천·조회수·구독은 서버 액션이라 vercel 어댑터.
export default defineConfig({
  site: "https://cs.yeolyi.com",
  server: { port: SITES.cs.port },
  integrations: [react(), mdx(), sitemap()],
  adapter: vercel(),
  vite: {
    envDir: fileURLToPath(new URL("../..", import.meta.url)),
    plugins: [tailwindcss()],
    worker: { format: "es" },
  },
  markdown: {
    shikiConfig: { theme: mono, transformers: [stripBackground] },
    processor: unified({ remarkPlugins: [remarkFormatCode], rehypePlugins: [rehypeExternalLinks] }),
  },
  prefetch: true,
});
