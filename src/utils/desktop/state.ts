import { z } from "astro/zod";
import { safeWrap } from "../wrap";

const positionSchema = z.object({ x: z.number(), y: z.number() });
const windowSchema = positionSchema.extend({
  width: z.number().positive(),
  height: z.number().positive(),
  closed: z.boolean(),
  shaded: z.boolean(),
  zoomed: z.boolean(),
  z: z.number(),
  placed: z.boolean().optional(),
  sizeVersion: z.number().optional(),
});
const desktopSchema = z.object({
  windows: z.record(z.string(), windowSchema),
  icons: z.record(z.string(), positionSchema),
  path: z.string().optional(),
});

export type Position = z.infer<typeof positionSchema>;
export type WindowState = z.infer<typeof windowSchema>;
export type DesktopState = z.infer<typeof desktopSchema>;

const storageKey = "kasperrt-desktop-v1";
const legacyStorageKey = "kasperrt-mac-desktop-v1";

export function emptyDesktopState(): DesktopState {
  return { windows: {}, icons: {} };
}

export function readDesktopState(): DesktopState | Error {
  const [readError, value] = safeWrap(() => localStorage.getItem(storageKey) ?? localStorage.getItem(legacyStorageKey));
  if (readError) {
    return new Error("Could not read the saved desktop", { cause: readError });
  }
  if (!value) {
    return emptyDesktopState();
  }
  const [parseError, parsed] = safeWrap<Error, unknown>(() => JSON.parse(value));
  if (parseError) {
    return new Error("Could not parse the saved desktop", { cause: parseError });
  }
  const result = desktopSchema.safeParse(parsed);
  if (!result.success) {
    return new Error("The saved desktop has an invalid format", { cause: result.error });
  }
  return result.data;
}

export function saveDesktopState(state: DesktopState): Error | undefined {
  const [error] = safeWrap(() => {
    localStorage.setItem(storageKey, JSON.stringify(state));
    localStorage.removeItem(legacyStorageKey);
  });
  if (error) {
    return new Error("Could not save the desktop", { cause: error });
  }
}
