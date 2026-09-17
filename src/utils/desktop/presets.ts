import type { WindowRect } from "./placement";
import type { WindowState } from "./state";

const mainPreset: WindowRect = { width: 690, height: 360, x: 45, y: 65 };
const articlePreset: WindowRect = { width: 820, height: 710, x: 110, y: 100 };
const textFilePreset: WindowRect = { width: 640, height: 430, x: 70, y: 120 };
const presets: Record<string, WindowRect | undefined> = {
  main: mainPreset,
  projects: { width: 800, height: 650, x: 95, y: 110 },
  writing: { width: 740, height: 600, x: 130, y: 150 },
  cv: { width: 780, height: 680, x: 80, y: 90 },
  terminal: { width: 620, height: 350, x: 185, y: 180 },
  music: { width: 600, height: 560, x: 130, y: 110 },
  git: { width: 430, height: 340, x: 35, y: 120 },
  env: { width: 760, height: 460, x: 55, y: 100 },
  "new-file": { width: 360, height: 205, x: 160, y: 150 },
  trash: { width: 360, height: 280, x: 170, y: 140 },
  brick: { width: 960, height: 710, x: 70, y: 60 },
  idle: { width: 900, height: 710, x: 100, y: 95 },
  shot: { width: 760, height: 660, x: 145, y: 130 },
  unhinged: { width: 820, height: 680, x: 180, y: 165 },
  "runtime-lab": { width: 1100, height: 760, x: 50, y: 55 },
  about: { width: 420, height: 330, x: 170, y: 130 },
  help: { width: 440, height: 350, x: 190, y: 145 },
  info: { width: 370, height: 235, x: 220, y: 165 },
};

export function createWindowState(id: string, initial: string): WindowState {
  let preset = presets[id] ?? mainPreset;
  if (id.startsWith("article-")) {
    preset = articlePreset;
  }
  if (id.startsWith("file-")) {
    preset = textFilePreset;
  }
  let width = Math.min(preset.width, window.innerWidth - 135);
  let height = Math.min(preset.height, window.innerHeight - 100);
  let x = Math.min(preset.x, window.innerWidth - width - 110);
  let y = preset.y;
  if (window.innerWidth < 600) {
    width = Math.min(preset.width, window.innerWidth - 20);
    height = Math.min(preset.height, window.innerHeight - 135);
    x = 10;
    y = 116;
  }
  let z = 10;
  if (id === initial) {
    z = 12;
  }
  let sizeVersion = 3;
  if (id === "main") {
    sizeVersion = 4;
  }
  return {
    x,
    y,
    width,
    height,
    closed: id !== "main" && id !== initial,
    placed: id === "main" || id === initial,
    shaded: false,
    zoomed: id === "cv" && initial === "cv",
    z,
    sizeVersion,
  };
}
