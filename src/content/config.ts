import { defineCollection, z } from "astro:content";
import { educationSchema, experienceSchema, skillsSchema } from "~/schemas/more";

const more = defineCollection({
  type: "content",
  schema: z.discriminatedUnion("type", [experienceSchema, skillsSchema, educationSchema]),
});

export const collections = {
  more,
};
