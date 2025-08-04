// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import node from "@astrojs/node";

import vercel from "@astrojs/vercel";

import mdx from "@astrojs/mdx";

import sitemap from "@astrojs/sitemap";
import {
  transformerNotationDiff,
  transformerNotationFocus,
  transformerNotationHighlight,
} from "@shikijs/transformers";
import tailwindcss from "@tailwindcss/vite";

const adapter = process.argv.includes("--node")
  ? node({ mode: "standalone" })
  : vercel();

// https://astro.build/config
export default defineConfig({
  site: "https://yeolyi.com",
  integrations: [react(), mdx(), sitemap()],
  adapter,

  vite: {
    plugins: [tailwindcss()],
  },

  i18n: {
    locales: ["en", "ko"],
    defaultLocale: "en",
  },
  markdown: {
    shikiConfig: {
      themes: {
        light: "one-light",
        dark: "one-dark-pro",
      },
      defaultColor: "light-dark()",
      transformers: [
        transformerNotationHighlight(),
        transformerNotationFocus(),
        transformerNotationDiff(),
      ],
    },
  },
  redirects: {
    "/": "/ko",
    "/post/[slug]": "/ko/post/[slug]",
    "/cs": "/ko/cs",
    "/cs/[slug]": "/ko/cs/[slug]",
    "/react": "/ko/react",
    "/react/[slug]": "/ko/react/[slug]",
  },
});
