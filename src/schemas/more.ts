import { z } from "astro:schema";

export const experienceSchema = z.object({
  type: z.literal("experience"),
  order: z.number(),
  id: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  where: z.string().optional(),
  skills: z.array(z.string()).optional(),
  positions: z.array(z.string()).optional(),
});

export const skillsSchema = z.object({
  type: z.literal("skills"),
  order: z.number(),
  area: z.string(),
  points: z.array(z.string()),
});

export const educationSchema = z.object({
  type: z.literal("education"),
  order: z.number(),
  from: z.string(),
  to: z.string(),
  where: z.string(),
  grades: z.array(
    z.object({
      title: z.string(),
      grade: z.string().optional(),
    })
  ),
});

export const cvEntrySchema = z.object({
  label: z.string(),
  text: z.string(),
});

export const cvEntriesSchema = z.array(cvEntrySchema);

export type Experience = z.infer<typeof experienceSchema>;
export type Skills = z.infer<typeof skillsSchema>;
export type Education = z.infer<typeof educationSchema>;
export type CvEntry = z.infer<typeof cvEntrySchema>;
