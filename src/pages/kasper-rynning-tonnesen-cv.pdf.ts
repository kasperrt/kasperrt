import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { createCvPdf } from "../utils/cv-pdf";

export const prerender = true;

export const GET: APIRoute = async () => {
  const [entries, portrait] = await Promise.all([getCollection("more"), readFile(resolve("public/me.png"))]);
  const pdf = await createCvPdf(entries, portrait);
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="kasper-rynning-tonnesen-cv.pdf"',
      "Cache-Control": "no-cache",
    },
  });
};
