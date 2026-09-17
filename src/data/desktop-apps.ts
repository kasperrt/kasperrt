export const desktopApps = [
  {
    id: "brick",
    title: "Brick",
    url: "https://brick.etys.no",
    description: "Build a car, race for championship rewards, or challenge a friend.",
  },
  {
    id: "idle",
    title: "Idle",
    url: "https://idle.etys.no",
    description: "A small 3D runner about momentum, rewards, and staying in the zone.",
  },
  {
    id: "shot",
    title: "Shot",
    url: "https://shot.etys.no",
    description: "A shared countdown for your next round.",
  },
  {
    id: "unhinged",
    title: "Unhinged",
    url: "https://unhinged.etys.no",
    description: "Anonymous confessions, dramatic guesses, and big reveals.",
  },
  {
    id: "runtime-lab",
    title: "Runtime Lab",
    url: "https://lab.etys.no",
    description: "Small programming challenges. Write a solution, run it, compare runtimes.",
  },
] as const;

export const desktopGames = desktopApps.filter((app) => app.id !== "runtime-lab");
