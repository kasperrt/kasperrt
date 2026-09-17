import { desktopApps } from "./desktop-apps";

export const windowApps = [
  "trash",
  "main",
  "projects",
  "writing",
  "cv",
  "terminal",
  "git",
  "env",
  "music",
  "about",
  "help",
  ...desktopApps.map((app) => app.id),
];
