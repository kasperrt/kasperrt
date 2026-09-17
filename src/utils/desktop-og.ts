import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { create, type Font } from "fontkit";
import sharp from "sharp";

export type DesktopOg = {
  kind: "home" | "listing" | "article";
  windowTitle: string;
  title: string;
  subtitle: string;
  summary?: string;
  rows?: { label: string; detail: string }[];
};

const width = 1200;
const height = 630;
const ink = "#111111";
const blue = "#243c7b";
const face = "#cccccc";
let resources: Promise<{ chicago: Font; mono: Font; portrait: string }> | undefined;

function loadResources() {
  resources ??= Promise.all([
    readFile(resolve("public/fonts/ChicagoFLF.ttf")),
    readFile(resolve("public/fonts/DepartureMono.woff2")),
    sharp(resolve("public/me.webp")).resize(156, 198, { fit: "cover" }).png().toBuffer(),
  ]).then(([chicago, mono, portrait]) => {
    const heading = create(chicago);
    const body = create(mono);
    if (!("layout" in heading) || !("layout" in body)) throw new Error("Expected individual desktop fonts");
    return { chicago: heading, mono: body, portrait: portrait.toString("base64") };
  });
  return resources;
}

export async function createDesktopOg(card: DesktopOg): Promise<Uint8Array<ArrayBuffer>> {
  const { chicago, mono, portrait } = await loadResources();
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
      svg.push(
        `<path fill="${color}" transform="translate(${x + (offset + position.xOffset) * scale} ${y - position.yOffset * scale}) scale(${scale} ${-scale})" d="${glyph.path.toSVG()}"/>`,
      );
      offset += position.xAdvance;
    }
  }
  function lines(value: string, size: number, maxWidth: number, font = chicago) {
    const result: string[] = [];
    let current = "";
    for (const word of value.split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;
      if (current && measure(candidate, size, font) > maxWidth) {
        result.push(current);
        current = word;
      } else current = candidate;
    }
    if (current) result.push(current);
    return result;
  }
  function paragraph(value: string, x: number, y: number, size: number, maxWidth: number, color = ink, font = chicago) {
    const wrapped = lines(value, size, maxWidth, font);
    for (const [index, line] of wrapped.entries()) text(line, x, y + index * size * 1.45, size, color, font);
    return y + wrapped.length * size * 1.45;
  }
  function button(x: number, y: number, size: number) {
    rect(x, y, size, size, "#555555");
    rect(x + 1, y + 1, size - 1, size - 1, "#ffffff");
    rect(x + 2, y + 2, size - 3, size - 3, "#eeeeee");
    rect(x + 4, y + 4, size - 5, size - 5, "#aaaaaa");
  }
  rect(0, 0, width, height, "#bba8de");
  const windowHeight = card.kind === "home" ? 342 : 516;
  const bottomOffset = windowHeight - 516;
  svg.push(`<g transform="translate(53 ${(height - windowHeight - 4) / 2 - 58})">`);

  // Match the site's square, striped window chrome, including its one-pixel bevels.
  rect(54, 62, 990, windowHeight, ink);
  rect(50, 58, 990, windowHeight, ink);
  rect(52, 60, 986, windowHeight - 4, "#ffffff");
  rect(54, 62, 982, windowHeight - 8, face);
  button(64, 70, 18);
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
  while (measure(card.windowTitle, titleSize) > 770) titleSize--;
  const titleWidth = measure(card.windowTitle, titleSize);
  rect(531 - titleWidth / 2 - 12, 65, titleWidth + 24, 27, face);
  text(card.windowTitle, 531 - titleWidth / 2, 86, titleSize);
  rect(56, 98, 978, windowHeight - 76, "#777777");
  rect(58, 100, 974, windowHeight - 80, "#ffffff");
  text("kasperrt.me", 64, 560 + bottomOffset, 17);
  text("Oslo, Norway", 857, 560 + bottomOffset, 16, "#444444", mono);
  for (let i = 0; i < 4; i++)
    svg.push(`<path d="M${1022 + i * 4} ${568 + bottomOffset}L1034 ${556 + i * 4 + bottomOffset}" stroke="#777777"/>`);

  if (card.kind === "home") {
    text(card.title, 92, 164, 37);
    text(card.subtitle, 94, 211, 23);
    text("Cofounder & CTO at embroidery.", 94, 261, 23);
    text("Previously VP of Engineering at Pistachio.", 94, 297, 20, "#444444");
    rect(838, 133, 164, 206, "#999999");
    rect(840, 135, 160, 202, "#dddddd");
    svg.push(`<image x="842" y="137" width="156" height="198" href="data:image/png;base64,${portrait}"/>`);
  } else if (card.kind === "article") {
    const titleBottom = paragraph(card.title, 94, 174, 43, 880);
    text(card.subtitle, 96, titleBottom + 7, 17, "#555555", mono);
    rect(94, titleBottom + 32, 902, 1, "#bbbbbb");
    paragraph(card.summary ?? "", 94, titleBottom + 78, 23, 882, "#333333");
    text("Kasper Rynning-Tønnesen", 94, 505, 20);
  } else {
    text(card.title, 94, 168, 39);
    text(card.subtitle, 94, 209, 20, "#555555");
    rect(94, 233, 902, 1, "#bbbbbb");
    let y = 278;
    for (const row of card.rows ?? []) {
      const next = paragraph(row.label, 94, y, 23, 896, blue);
      if (row.detail) text(row.detail, 96, next - 10, 15, "#555555", mono);
      y = next + ((card.rows?.length ?? 0) > 3 ? 18 : 35);
    }
  }
  svg.push("</g>");
  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${svg.join("")}</svg>`;
  return new Uint8Array(await sharp(Buffer.from(source)).png().toBuffer());
}
