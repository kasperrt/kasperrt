import { desktopApps } from "./desktop-apps";

export const windowApps: Record<string, string> = {
  trash: "Trash",
  main: "kasperrt.me",
  projects: "Projects",
  writing: "Writing",
  cv: "Curriculum Vitae",
  terminal: "Terminal",
  git: ".git",
  env: ".env",
  music: "Music Player",
  about: "Info",
  help: "Using this desktop",
  ...Object.fromEntries(desktopApps.map((app) => [app.id, app.title])),
};
