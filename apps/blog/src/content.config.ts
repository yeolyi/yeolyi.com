import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// 글 — mdx/post 하위. CS 시리즈는 cs.yeolyi.com(apps/cs)에 있다.
const post = defineCollection({
  loader: glob({ base: "./mdx", pattern: "post/**/[^_]*.mdx" }),
  schema: z.object({
    title: z.string(),
    hidden: z.boolean().optional(),
    // 검색 스니펫·OG/twitter description.
    description: z.string(),
    date: z.date(),
  }),
});

export const collections = { post };
