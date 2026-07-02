import { z } from "astro/zod";

export const blogSchema = z.object({
  title: z.string(),
  description: z.string(),
  pubDate: z.date(),
  updatedDate: z.date().optional(),
  draft: z.boolean().default(false),
  hero: z.string(),
});

export type BlogPost = z.infer<typeof blogSchema>;
