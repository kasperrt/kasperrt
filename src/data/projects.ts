export type Project = {
  /** Short name used as the heading on /projects. */
  name: string;
  /** Host, doubling as the link label. */
  host: string;
  url: string;
  /** One-liner, used by the terminal and as the page lead-in. */
  tagline: string;
  /** A couple of sentences for /projects. */
  blurb?: string;
  /** Basename of the source thumbnail in src/assets/projects. */
  image?: string;
  alt?: string;
  /** Some projects only make sense in the terminal listing. */
  listOnPage?: boolean;
};

export const projects: Project[] = [
  {
    name: "zoff",
    host: "zoff.me",
    url: "https://zoff.me",
    tagline: "Virtual jukebox for shared music rooms.",
    blurb:
      "Shared music rooms, made for listening together. Name a room, share the link, and everyone in it queues and votes on what plays next. No accounts, no app, just a playlist a whole group can argue about.",
    image: "zoff",
    alt: "The zoff.me room picker",
  },
  {
    name: "wiretyped",
    host: "wiretyped.io",
    url: "https://wiretyped.io",
    tagline: "Typed HTTP client for fetch runtimes.",
    blurb:
      "A universal, fetch-based HTTP client. Endpoints are declared once and validated with Standard Schema, and every call comes back error-first, so responses are never a guess. Retries, caching and SSE are part of the deal.",
    image: "wiretyped",
    alt: "The wiretyped.io landing page",
  },
  {
    name: "etys",
    host: "etys.no",
    url: "https://etys.no",
    tagline: "Playful browser games and tiny web experiments.",
    blurb:
      "A small pile of browser games and tools: LEGO Racers reworked for the browser, a 3D endless runner, confession rooms, code challenges and a drinking game timer. Each one quick to open, none of them particularly serious.",
    image: "etys",
    alt: "The etys.no landing page",
  },
  {
    name: "swarm aid",
    host: "swarmaid.ai",
    url: "https://swarmaid.ai",
    tagline: "Message board where AI agents pay each other for tasks.",
    blurb:
      "An agent-first message board. Independent AI agents post tasks, pay and fund each other, find collaborators and coordinate on shared goals, with their own agendas intact.",
    image: "swarmaid",
    alt: "The swarmaid.ai landing page",
  },
  {
    name: "degen",
    host: "degen.kasperrt.me",
    url: "https://degen.kasperrt.me",
    tagline: "(de)generative art",
    blurb:
      "Generative art rendered live in the browser, and happy to feed on your camera and microphone if you let it. Every visit degenerates a little differently.",
    image: "degen",
    alt: "A degen generative art render",
  },
  {
    name: "henie",
    host: "henie.cool",
    url: "https://henie.cool",
    tagline: "Pink and purple is life.",
    listOnPage: false,
  },
];

export function getPageProjects() {
  return projects.filter((project) => project.listOnPage !== false);
}
