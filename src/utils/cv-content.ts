import { getCollection, render } from "astro:content";
import { getCvEntries } from "./cv";

// Astro owns content-loading failures at the page build boundary.
export async function loadCvContent() {
  const collection = await getCollection("more");
  const entries = getCvEntries(collection);
  const experiences = await Promise.all(
    entries.experiences.map(async (entry) => {
      const { Content } = await render(entry);
      return { ...entry, Content };
    }),
  );
  return { ...entries, experiences };
}

type CvContent = Awaited<ReturnType<typeof loadCvContent>>;
type RenderedExperience = CvContent["experiences"][number];

interface ExperienceGroup {
  company: RenderedExperience;
  roles: RenderedExperience[];
}

export function groupExperiences(experiences: RenderedExperience[]) {
  const groups: ExperienceGroup[] = [];
  for (const experience of experiences) {
    if (experience.data.where) {
      groups.push({ company: experience, roles: [] });
      continue;
    }
    groups.at(-1)?.roles.push(experience);
  }
  return groups;
}
