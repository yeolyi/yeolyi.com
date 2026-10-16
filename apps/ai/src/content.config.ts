import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// 프롬프트 하나 = src/prompts/<id>.md. examples 는 페이지 맨 위에 Claude Code 화면으로 보이는 실제 대화. 본문은 마크다운으로 그리지 않고 그대로 복사해 쓰는 프롬프트 원문이다.
const prompts = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/prompts" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    examples: z.array(
      z.object({
        user: z.string(),
        ai: z.string(),
        meta: z.string().optional(),
      }),
    ),
  }),
});

export const collections = { prompts };
