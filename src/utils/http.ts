import { RequestClient, type RequestDefinitions } from "wiretyped";
import { cvEntriesSchema } from "~/schemas/more";

const endpoints = {
  "/cv.json": {
    get: {
      response: cvEntriesSchema,
    },
  },
} satisfies RequestDefinitions;

export const httpClient = new RequestClient({
  endpoints,
  baseUrl: "/",
  hostname: "https://kasperrt.me",
});
