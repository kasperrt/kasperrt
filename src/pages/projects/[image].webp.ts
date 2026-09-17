import { resolve } from "node:path";
import sharp from "sharp";
import type { APIRoute, GetStaticPaths } from "astro";
import { getPageProjects } from "../../data/projects";
import { safeWrapAsync } from "../../utils/wrap";
import { buildErrorResponse } from "../../utils/build-error";

export const getStaticPaths: GetStaticPaths = () =>
  getPageProjects()
    .filter((project) => project.image)
    .map((project) => ({ params: { image: project.image } }));

export const GET: APIRoute = async ({ params }) => {
  const source = resolve("src/assets/projects", `${params.image}.webp`);
  const [error, thumbnail] = await safeWrapAsync(() =>
    sharp(source).resize({ width: 480 }).webp({ quality: 70 }).toBuffer(),
  );
  if (error) {
    return buildErrorResponse(new Error("Could not resize the project thumbnail", { cause: error }));
  }
  return new Response(new Uint8Array(thumbnail), { headers: { "Content-Type": "image/webp" } });
};
