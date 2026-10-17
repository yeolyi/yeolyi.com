import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// 프롬프트 하나 = src/prompts/<id>.md. 예시는 examples(대화) 나 page(결과물 문서) 중 하나. 본문은 마크다운으로 그리지 않고 그대로 복사해 쓰는 프롬프트 원문이다.
const prompts = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/prompts" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    // 말투 프롬프트: Claude Code 화면으로 보여 줄 실제 대화
    examples: z
      .array(
        z.object({
          user: z.string(),
          ai: z.string(),
          meta: z.string().optional(),
        }),
      )
      .default([]),
    // 결과물이 A4 문서인 프롬프트: 실제로 돌려 받은 결과 HTML(public/ 아래 경로). 그림 대신 그대로 띄운다
    page: z.object({ src: z.string(), title: z.string() }).optional(),
    // 결과물의 HTML 틀(public/ 아래 경로). 복사하는 프롬프트 끝에 붙는다
    template: z.string().optional(),
  }),
});

export const collections = { prompts };
