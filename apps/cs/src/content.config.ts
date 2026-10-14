import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// CS 시리즈 글 — mdx/{N-slug}/ko.mdx. 날짜 없이 order(10 간격) 순으로 읽는다.
// 사이에 새 글을 끼울 땐 빈 번호(예: 141)를 쓴다.
const post = defineCollection({
  loader: glob({ base: "./mdx", pattern: "**/[^_]*.mdx" }),
  schema: z.object({
    title: z.string(),
    hidden: z.boolean().optional(),
    // 검색 스니펫·OG description. 목록에선 부제로도 보인다.
    description: z.string(),
    part: z.number(),
    order: z.number(),
  }),
});

export const collections = { post };
