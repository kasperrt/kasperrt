import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { create, type Font } from "fontkit";
import sharp from "sharp";
import { safeWrap, safeWrapAsync } from "./wrap";

interface DesktopOgRow {
  label: string;
  detail: string;
}

interface DesktopResources {
  chicago: Font;
  mono: Font;
  portrait: string;
}

export type DesktopOg = {
  kind: "home" | "listing" | "article";
  windowTitle: string;
  title: string;
  subtitle: string;
  summary?: string;
  rows?: DesktopOgRow[];
};

const width = 1200;
const height = 630;
const ink = "#111111";
const blue = "#243c7b";
const face = "#cccccc";
let resources: Promise<DesktopResources | Error> | undefined;

async function readResources(): Promise<DesktopResources | Error> {
  const [readError, files] = await safeWrapAsync(() =>
    Promise.all([
      readFile(resolve("public/fonts/ChicagoFLF.ttf")),
      readFile(resolve("public/fonts/DepartureMono.woff2")),
      sharp(resolve("public/me.webp")).resize(156, 198, { fit: "cover" }).png().toBuffer(),
    ]),
  );
  if (readError) {
    return new Error("Could not read the social preview resources", { cause: readError });
  }
  const [chicago, mono, portrait] = files;
  const [fontError, fonts] = safeWrap(() => ({ heading: create(chicago), body: create(mono) }));
  if (fontError) {
    return new Error("Could not load the social preview fonts", { cause: fontError });
  }
  if (!("layout" in fonts.heading) || !("layout" in fonts.body)) {
    return new Error("Expected individual desktop fonts");
  }
  return { chicago: fonts.heading, mono: fonts.body, portrait: portrait.toString("base64") };
}

async function renderDesktopOg(card: DesktopOg, { chicago, mono, portrait }: DesktopResources) {
  const svg: string[] = [];
  const rect = (x: number, y: number, w: number, h: number, fill: string) =>
    svg.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`);
  const measure = (value: string, size: number, font = chicago) =>
    (font.layout(value).advanceWidth * size) / font.unitsPerEm;

  // Outline the bundled fonts so Linux builds do not depend on installed system fonts.
  function text(value: string, x: number, y: number, size: number, color = ink, font = chicago) {
    const run = font.layout(value);
    const scale = size / font.unitsPerEm;
    let offset = 0;
    for (const [index, glyph] of run.glyphs.entries()) {
      const position = run.positions[index];
      const xOffset = position?.xOffset ?? 0;
      const yOffset = position?.yOffset ?? 0;
      const advance = position?.xAdvance ?? glyph.advanceWidth;
      svg.push(
        `<path fill="${color}" transform="translate(${x + (offset + xOffset) * scale} ${y - yOffset * scale}) scale(${scale} ${-scale})" d="${glyph.path.toSVG()}"/>`,
      );
      offset += advance;
    }
  }
  function lines(value: string, size: number, maxWidth: number, font = chicago) {
    const result: string[] = [];
    let current = "";
    for (const word of value.split(/\s+/)) {
      let candidate = word;
      if (current) {
        candidate = `${current} ${word}`;
      }
      if (current && measure(candidate, size, font) > maxWidth) {
        result.push(current);
        current = word;
        continue;
      }
      current = candidate;
    }
    if (current) {
      result.push(current);
    }
    return result;
  }
  function paragraph(value: string, x: number, y: number, size: number, maxWidth: number, color = ink, font = chicago) {
    const wrapped = lines(value, size, maxWidth, font);
    for (const [index, line] of wrapped.entries()) {
      text(line, x, y + index * size * 1.45, size, color, font);
    }
    return y + wrapped.length * size * 1.45;
  }
  function button(x: number, y: number, size: number) {
    rect(x, y, size, size, "#555555");
    rect(x + 1, y + 1, size - 1, size - 1, "#ffffff");
    rect(x + 2, y + 2, size - 3, size - 3, "#eeeeee");
    rect(x + 4, y + 4, size - 5, size - 5, "#aaaaaa");
  }
  rect(0, 0, width, height, "#bba8de");
  let windowHeight = 516;
  if (card.kind === "home") {
    windowHeight = 342;
  }
  const bottomOffset = windowHeight - 516;
  svg.push(`<g transform="translate(53 ${(height - windowHeight - 4) / 2 - 58})">`);

  // Match the site's square, striped window chrome, including its one-pixel bevels.
  rect(54, 62, 990, windowHeight, ink);
  rect(50, 58, 990, windowHeight, ink);
  rect(52, 60, 986, windowHeight - 4, "#ffffff");
  rect(54, 62, 982, windowHeight - 8, face);
  button(64, 70, 18);
  svg.push('<path d="M69 75l8 8M77 75l-8 8" fill="none" stroke="#111" stroke-width="2" shape-rendering="crispEdges"/>');
  button(980, 70, 18);
  button(1008, 70, 18);
  rect(985, 75, 8, 7, "#666666");
  rect(986, 76, 6, 5, "#dddddd");
  rect(1012, 77, 10, 2, "#666666");
  for (let y = 69; y <= 88; y += 4) {
    rect(94, y, 874, 1, "#888888");
    rect(94, y + 1, 874, 1, "#ffffff");
  }
  let titleSize = 21;
  while (measure(card.windowTitle, titleSize) > 770) {
    titleSize--;
  }
  const titleWidth = measure(card.windowTitle, titleSize);
  rect(531 - titleWidth / 2 - 12, 65, titleWidth + 24, 27, face);
  text(card.windowTitle, 531 - titleWidth / 2, 86, titleSize);
  rect(56, 98, 978, windowHeight - 76, "#777777");
  rect(58, 100, 974, windowHeight - 80, "#ffffff");
  text("kasperrt.me", 64, 560 + bottomOffset, 17);
  text("Oslo, Norway", 857, 560 + bottomOffset, 16, "#444444", mono);
  for (let i = 0; i < 4; i++) {
    svg.push(`<path d="M${1022 + i * 4} ${568 + bottomOffset}L1034 ${556 + i * 4 + bottomOffset}" stroke="#777777"/>`);
  }

  function drawContent() {
    if (card.kind === "home") {
      text(card.title, 92, 164, 37);
      text(card.subtitle, 94, 211, 23);
      text("Cofounder & CTO at embroidery.", 94, 261, 23);
      text("Previously VP of Engineering at Pistachio.", 94, 297, 20, "#444444");
      rect(838, 133, 164, 206, "#999999");
      rect(840, 135, 160, 202, "#dddddd");
      svg.push(`<image x="842" y="137" width="156" height="198" href="data:image/png;base64,${portrait}"/>`);
      return;
    }
    if (card.kind === "article") {
      const titleBottom = paragraph(card.title, 94, 174, 43, 880);
      text(card.subtitle, 96, titleBottom + 7, 17, "#555555", mono);
      rect(94, titleBottom + 32, 902, 1, "#bbbbbb");
      paragraph(card.summary ?? "", 94, titleBottom + 78, 23, 882, "#333333");
      text("Kasper Rynning-Tønnesen", 94, 505, 20);
      return;
    }
    text(card.title, 94, 168, 39);
    text(card.subtitle, 94, 209, 20, "#555555");
    rect(94, 233, 902, 1, "#bbbbbb");
    let y = 278;
    for (const row of card.rows ?? []) {
      const next = paragraph(row.label, 94, y, 23, 896, blue);
      if (row.detail) {
        text(row.detail, 96, next - 10, 15, "#555555", mono);
      }
      let gap = 35;
      if ((card.rows?.length ?? 0) > 3) {
        gap = 18;
      }
      y = next + gap;
    }
  }
  drawContent();
  svg.push("</g>");
  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${svg.join("")}</svg>`;
  return new Uint8Array(await sharp(Buffer.from(source)).png().toBuffer());
}

export async function createDesktopOg(card: DesktopOg) {
  resources ??= readResources();
  const loaded = await resources;
  if (loaded instanceof Error) {
    resources = undefined;
    return loaded;
  }
  const [error, image] = await safeWrapAsync(() => renderDesktopOg(card, loaded));
  if (error) {
    return new Error(`Could not render the social preview for ${card.windowTitle}`, { cause: error });
  }
  return image;
}
