import { unified } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import rehypeExternalLinks from "@yeolyi/site/markdown/rehype-external-links";
import remarkFormatCode from "@yeolyi/site/markdown/remark-format-code";
import { mono, stripBackground } from "@yeolyi/site/markdown/shiki-mono";
import { SITES } from "@yeolyi/ui/sites";
import { defineConfig } from "astro/config";

// design.yeolyi.com. 마크다운 처리는 블로그와 같은 것(@yeolyi/site)을 쓴다.
export default defineConfig({
  site: "https://design.yeolyi.com",
  server: { port: SITES.design.port },
  integrations: [react(), mdx()],
  adapter: vercel(),
  vite: { plugins: [tailwindcss()] },
  markdown: {
    shikiConfig: { theme: mono, transformers: [stripBackground] },
    processor: unified({
      remarkPlugins: [remarkFormatCode],
      rehypePlugins: [rehypeExternalLinks],
    }),
  },
});
