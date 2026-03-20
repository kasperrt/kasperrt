import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { blogSchema } from "~/schemas/blog";
import { educationSchema, experienceSchema, skillsSchema } from "~/schemas/more";

const more = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/more" }),
  schema: z.discriminatedUnion("type", [experienceSchema, skillsSchema, educationSchema]),
});

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: blogSchema,
});

export const collections = {
  blog,
  more,
};
