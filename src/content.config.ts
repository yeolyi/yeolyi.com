import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const post = defineCollection({
  loader: glob({
    base: "./src/content",
    pattern: "{ko,en}/post/**/*.mdx",
  }),
  schema: z.object({
    title: z.string(),
    date: z.date(),
  }),
});

const react = defineCollection({
  loader: glob({
    base: "./src/content",
    pattern: "{ko,en}/react/**/index.mdx",
  }),
  schema: z.object({
    title: z.string(),
    order: z.number(),
    category: z.string(),
    isHidden: z.boolean().optional(),
  }),
});

const cs = defineCollection({
  loader: glob({
    base: "./src/content",
    pattern: "{ko,en}/cs/**/*.mdx",
  }),
  schema: z.object({
    title: z.string(),
    order: z.number(),
    category: z.string(),
  }),
});

export const collections = { post, react, cs };
