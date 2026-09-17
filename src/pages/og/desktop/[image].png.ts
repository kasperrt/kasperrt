import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import { getPageProjects } from "../../../data/projects";
import { createDesktopOg, type DesktopOg } from "../../../utils/desktop-og";
import { formatReadingTime } from "../../../utils/readingTime";

export const prerender = true;

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = (await getCollection("blog")).sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
  const projects = getPageProjects();
  const cards: Record<string, DesktopOg> = {
    home: {
      kind: "home",
      windowTitle: "kasperrt.me",
      title: "Kasper Rynning-Tønnesen",
      subtitle: "Developer in Oslo, Norway.",
    },
    projects: {
      kind: "listing",
      windowTitle: "Projects",
      title: "Things I've made",
      subtitle: "Kasper Rynning-Tønnesen",
      rows: projects.map((project) => ({ label: project.name, detail: project.host })),
    },
    writing: {
      kind: "listing",
      windowTitle: "Writing",
      title: "Writing",
      subtitle: "Mostly tech, occasionally everything else.",
      rows: posts
        .filter((post) => !post.data.draft)
        .slice(0, 3)
        .map((post) => ({
          label: post.data.title,
          detail: post.data.pubDate.toISOString().slice(0, 10),
        })),
    },
    cv: {
      kind: "listing",
      windowTitle: "Curriculum Vitae",
      title: "Kasper Rynning-Tønnesen",
      subtitle: "Curriculum Vitae · Oslo, Norway",
      rows: [
        { label: "CTO & cofounder at embroidery", detail: "" },
        { label: "Previously VP of Engineering at Pistachio", detail: "" },
        { label: "Go · TypeScript · React · PostgreSQL", detail: "" },
      ],
    },
  };
  for (const post of posts)
    cards[`blog-${post.id}`] = {
      kind: "article",
      windowTitle: `${post.data.title}.txt`,
      title: post.data.title,
      subtitle: `${post.data.pubDate.toISOString().slice(0, 10)} · ${formatReadingTime(post.body ?? "")}`,
      summary: post.data.description,
    };
  return Object.entries(cards).map(([image, card]) => ({ params: { image }, props: { card } }));
};

export const GET: APIRoute = async ({ props }) => {
  const image = await createDesktopOg(props.card);
  return new Response(image, { headers: { "Content-Type": "image/png" } });
};
