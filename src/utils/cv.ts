import type { CollectionEntry } from "astro:content";
import type { Education, Experience, Skills } from "../schemas/more";

export type MoreEntry = CollectionEntry<"more">;
export type ExperienceEntry = MoreEntry & { data: Experience };
export type SkillsEntry = MoreEntry & { data: Skills };
export type EducationEntry = MoreEntry & { data: Education };
export type EducationGrade = Education["grades"][number];

export function getCvEntries(entries: MoreEntry[]) {
  const experiences = entries
    .filter((entry): entry is ExperienceEntry => entry.data.type === "experience")
    .sort((a, b) => a.data.order - b.data.order);
  const skills = entries
    .filter((entry): entry is SkillsEntry => entry.data.type === "skills")
    .sort((a, b) => a.data.order - b.data.order);
  const educations = entries
    .filter((entry): entry is EducationEntry => entry.data.type === "education")
    .sort((a, b) => a.data.order - b.data.order);
  return { experiences, skills, educations };
}

export function formatCvDateRange(from = "", to?: string, separator = " – ") {
  if (to === undefined) {
    return from;
  }
  return `${from}${separator}${to || "present"}`;
}

export function formatGrade(grade: EducationGrade) {
  if (!grade.grade) {
    return grade.title;
  }
  return `${grade.title} - ${grade.grade}`;
}
