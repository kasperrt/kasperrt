import PDFDocument from "pdfkit";
import type { CollectionEntry } from "astro:content";
import { formatCvDateRange, formatGrade, getCvEntries } from "./cv";
import { safeWrapAsync } from "./wrap";

type TextBlock = {
  text: string;
  font?: string;
  size?: number;
  leading?: number;
  color?: string;
  link?: string;
};
type Row = { date: string; blocks: TextBlock[]; company?: boolean };
const plainText = (text: string) =>
  text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

async function renderCvPdf(entries: CollectionEntry<"more">[], portrait: Buffer): Promise<Uint8Array<ArrayBuffer>> {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 33, bottom: 32, left: 36, right: 36 },
    info: { Title: "Kasper Rynning-Tønnesen - CV", Author: "Kasper Rynning-Tønnesen" },
  });
  const chunks: Buffer[] = [];
  const result = new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    doc.on("error", reject);
  });
  const left = 36;
  const contentX = 124;
  const contentWidth = doc.page.width - contentX - 36;
  let y = 33;

  function textStyle(block: TextBlock) {
    doc
      .font(block.font ?? "Helvetica")
      .fontSize(block.size ?? 9)
      .fillColor(block.color ?? "#222222");
    return { width: contentWidth, lineGap: (block.leading ?? 11.5) - doc.currentLineHeight(), link: block.link };
  }
  function height(block: TextBlock) {
    return doc.heightOfString(block.text, textStyle(block)) + 3;
  }
  function rowHeight(row: Row) {
    return (
      Math.max(
        13,
        row.blocks.reduce((sum, block) => sum + height(block), 0),
      ) + 5
    );
  }
  function ensureSpace(required: number) {
    if (y + required <= doc.page.height - 32) {
      return;
    }
    doc.addPage();
    y = 33;
  }
  function drawRow(row: Row) {
    ensureSpace(rowHeight(row));
    doc.font("Helvetica").fontSize(8.5).fillColor("#555555").text(row.date, left, y, { width: 73, align: "right" });
    for (const block of row.blocks) {
      const blockHeight = height(block);
      doc.text(block.text, contentX, y, textStyle(block));
      y += blockHeight;
    }
    y += 5;
  }
  function section(title: string, firstRowHeight: number) {
    ensureSpace(25 + firstRowHeight);
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#111111").text(title, left, y, { width: 73, align: "right" });
    y += 25;
  }

  doc
    .save()
    .circle(68, 65, 32)
    .clip()
    .image(portrait, left, y, { cover: [64, 64], align: "center" })
    .restore();
  doc
    .font("Helvetica-Bold")
    .fontSize(17)
    .fillColor("#111111")
    .text("Kasper Rynning-Tønnesen", contentX, y, { width: contentWidth });
  const contacts = [
    ["Oslo, Norway", undefined, "kasperrt.me", "https://kasperrt.me"],
    [
      "kasper@rynning-toennesen.email",
      "mailto:kasper@rynning-toennesen.email",
      "github.com/kasperrt",
      "https://github.com/kasperrt",
    ],
    ["+47 977 40 427", "tel:+4797740427", "linkedin.com/in/kasperrt", "https://www.linkedin.com/in/kasperrt/"],
  ];
  for (const [index, [label, link, otherLabel, otherLink]] of contacts.entries()) {
    doc.font("Helvetica").fontSize(7.5).fillColor("#444444");
    doc.text(label ?? "", contentX, y + 32 + index * 14, { width: contentWidth * 0.58, link });
    doc.text(otherLabel ?? "", contentX + contentWidth * 0.58, y + 32 + index * 14, {
      width: contentWidth * 0.42,
      link: otherLink,
    });
  }
  y += 90;

  const sections = getCvEntries(entries);
  const experienceRows: Row[] = sections.experiences.map((entry) => {
    const data = entry.data;
    const blocks: TextBlock[] = [];
    if (data.where) {
      blocks.push({ text: data.where, font: "Helvetica-Bold", size: 9.5, link: data.url });
    }
    if (data.skills?.length) {
      blocks.push({
        text: data.skills.join(", "),
        font: "Helvetica-Oblique",
        size: 8,
        leading: 10,
        color: "#555555",
      });
    }
    for (const position of data.positions ?? []) {
      blocks.push({ text: position, font: "Helvetica-Bold" });
    }
    for (const paragraph of (entry.body ?? "").split(/\n\s*\n/)) {
      const text = plainText(paragraph);
      if (text) {
        blocks.push({ text });
      }
    }
    return {
      date: formatCvDateRange(data.from, data.to, " - "),
      blocks,
      company: Boolean(data.where),
    };
  });
  function firstRowHeight(rows: Row[]) {
    const [first] = rows;
    if (!first) {
      return 0;
    }
    return rowHeight(first);
  }
  section("Experience", firstRowHeight(experienceRows));
  for (const [index, row] of experienceRows.entries()) {
    const next = experienceRows[index + 1];
    if (row.company && next && !next.company) {
      ensureSpace(rowHeight(row) + rowHeight(next));
    }
    drawRow(row);
  }

  const skills: Row[] = sections.skills.map((entry) => {
    return { date: "", blocks: [{ text: `${entry.data.area}: ${entry.data.points.join(", ")}` }] };
  });
  section("Skills", firstRowHeight(skills));
  for (const row of skills) {
    drawRow(row);
  }

  const education: Row[] = sections.educations.map((entry) => {
    return {
      date: `${entry.data.from} - ${entry.data.to}`,
      blocks: [
        { text: entry.data.where, font: "Helvetica-Bold", link: entry.data.url },
        ...entry.data.grades.map((grade) => ({ text: formatGrade(grade) })),
      ],
    };
  });
  section("Education", firstRowHeight(education));
  for (const row of education) {
    drawRow(row);
  }

  doc.end();
  return result;
}

export async function createCvPdf(entries: CollectionEntry<"more">[], portrait: Buffer) {
  const [error, pdf] = await safeWrapAsync(() => renderCvPdf(entries, portrait));
  if (error) {
    return new Error("Could not generate the CV PDF", { cause: error });
  }
  return pdf;
}
