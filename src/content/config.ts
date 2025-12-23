import { defineCollection, z } from "astro:content";
import { blogSchema } from "~/schemas/blog";
import { educationSchema, experienceSchema, skillsSchema } from "~/schemas/more";

const more = defineCollection({
  type: "content",
  schema: z.discriminatedUnion("type", [experienceSchema, skillsSchema, educationSchema]),
});

const blog = defineCollection({
  type: "content",
  schema: blogSchema,
});

export const collections = {
  blog,
  more,
};
