import { resolve } from "node:path";
import sharp from "sharp";
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { createCvPdf } from "../utils/cv-pdf";
import { safeWrapAsync } from "../utils/wrap";
import { buildErrorResponse } from "../utils/build-error";

export const prerender = true;

export const GET: APIRoute = async () => {
  const [error, resources] = await safeWrapAsync(() =>
    Promise.all([
      getCollection("more"),
      sharp(resolve("src/assets/portrait.png")).resize({ width: 256 }).jpeg({ quality: 85 }).toBuffer(),
    ]),
  );
  if (error) {
    return buildErrorResponse(new Error("Could not load the CV resources", { cause: error }));
  }
  const [entries, portrait] = resources;
  const pdf = await createCvPdf(entries, portrait);
  if (pdf instanceof Error) {
    return buildErrorResponse(pdf);
  }
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="kasper-rynning-tonnesen-cv.pdf"',
      "Cache-Control": "no-cache",
    },
  });
};
