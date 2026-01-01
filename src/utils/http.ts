import { z } from "astro/zod";
import { RequestClient, type RequestDefinitions } from "wiretyped";
import { cvEntriesSchema } from "~/schemas/more";

const endpoints = {
  "/cv.json": {
    get: {
      response: cvEntriesSchema,
    },
  },
} satisfies RequestDefinitions;

const trackingEndpoints = {
  "/api/event": {
    post: {
      request: z.object({
        d: z.literal("kasperrt.me"),
        n: z.literal("pageview"),
        r: z.string().nullable(),
        u: z.string().url(),
      }),
      response: z.string(),
    },
  },
} satisfies RequestDefinitions;

export const httpClient = new RequestClient({
  endpoints,
  baseUrl: "/",
  hostname: "https://kasperrt.me",
});

export const trackingClient = new RequestClient({
  endpoints: trackingEndpoints,
  baseUrl: "https://analytics.kasperrt.me",
  hostname: "https://analytics.kasperrt.me",
});
