import { resolve } from "node:path";
import sharp from "sharp";
import type { APIRoute } from "astro";
import { safeWrapAsync } from "../utils/wrap";
import { buildErrorResponse } from "../utils/build-error";

export const GET: APIRoute = async () => {
  const [error, portrait] = await safeWrapAsync(() =>
    sharp(resolve("src/assets/portrait.webp")).resize({ width: 224 }).webp({ quality: 76 }).toBuffer(),
  );
  if (error) {
    return buildErrorResponse(new Error("Could not resize the portrait", { cause: error }));
  }
  return new Response(new Uint8Array(portrait), { headers: { "Content-Type": "image/webp" } });
};
