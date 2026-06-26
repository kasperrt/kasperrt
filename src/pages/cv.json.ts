import type { APIRoute } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import type { CvEntry, Education, Experience, Skills } from "../schemas/more";

type EducationGrade = Education["grades"][number];

export const prerender = true;

function splitLines(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildExperienceLines(entries: Array<CollectionEntry<"more"> & { data: Experience }>) {
  return entries.flatMap((entry) => {
    const { from, to, where, positions, skills } = entry.data;
    const lines: string[] = [];

    const date = from ? `${from}${to !== undefined ? ` - ${to}` : ""}` : "";
    const role = positions?.length ? positions.join(" / ") : "";
    const heading = [[date, where].filter(Boolean).join(" | "), role].filter(Boolean).join(" / ");

    if (heading) {
      lines.push(`_${heading}_`);
    }

    if (skills?.length) {
      lines.push(`*${skills.join(", ")}*`);
    }

    if (entry.body?.trim()) {
      lines.push(...splitLines(entry.body));
      lines.push(" ");
    }

    return lines;
  });
}

function buildSkillLines(entries: Array<CollectionEntry<"more"> & { data: Skills }>) {
  const c = entries.map((entry) => `${entry.data.area}: ${entry.data.points.join(", ")}`);
  c.push(" ");
  return c;
}

function buildEducationLines(entries: Array<CollectionEntry<"more"> & { data: Education }>) {
  return entries.flatMap((entry) => {
    const lines: string[] = [];

    lines.push(`${entry.data.from} - ${entry.data.to} | ${entry.data.where}`);
    lines.push(...entry.data.grades.flatMap((g: EducationGrade) => `${g.title}${g.grade ? ` - ${g.grade}` : ""}`));
    lines.push(" ");

    return lines;
  });
}

function withLabel(label: string, lines: string[]): CvEntry[] {
  return lines.map((line, index) => ({
    label: index === 0 ? label : " ",
    text: line,
  }));
}

export const GET: APIRoute = async () => {
  const collection = await getCollection("more");

  const experienceEntries = collection
    .filter((entry): entry is CollectionEntry<"more"> & { data: Experience } => entry.data.type === "experience")
    .sort((a, b) => a.data.order - b.data.order);

  const skillEntries = collection
    .filter((entry): entry is CollectionEntry<"more"> & { data: Skills } => entry.data.type === "skills")
    .sort((a, b) => a.data.order - b.data.order);

  const educationEntries = collection
    .filter((entry): entry is CollectionEntry<"more"> & { data: Education } => entry.data.type === "education")
    .sort((a, b) => a.data.order - b.data.order);

  const cvEntries = [
    ...withLabel("Experience", buildExperienceLines(experienceEntries)),
    { label: "", text: " " },
    ...withLabel("Skills", buildSkillLines(skillEntries)),
    { label: "", text: " " },
    ...withLabel("Education", buildEducationLines(educationEntries)),
    { label: "", text: " " },
  ];

  return new Response(JSON.stringify(cvEntries), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
