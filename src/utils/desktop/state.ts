import { safeWrap } from "../wrap";
import { easterEggIdeas } from "../../data/desktop-files";

export interface Position {
  x: number;
  y: number;
}
export interface WindowState extends Position {
  width: number;
  height: number;
  closed: boolean;
  shaded: boolean;
  zoomed: boolean;
  z: number;
  placed?: boolean;
  sizeVersion?: number;
}
export interface DesktopState {
  windows: Record<string, WindowState>;
  icons: Record<string, Position>;
  path?: string;
  trash: string[];
  showHidden: boolean;
  seededTrash: boolean;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPosition(value: unknown): value is Position {
  return (
    isRecord(value) &&
    typeof value.x === "number" &&
    Number.isFinite(value.x) &&
    typeof value.y === "number" &&
    Number.isFinite(value.y)
  );
}

function isWindowState(value: unknown): value is WindowState {
  if (!isRecord(value) || !isPosition(value)) {
    return false;
  }
  return (
    typeof value.width === "number" &&
    Number.isFinite(value.width) &&
    value.width > 0 &&
    typeof value.height === "number" &&
    Number.isFinite(value.height) &&
    value.height > 0 &&
    typeof value.z === "number" &&
    Number.isFinite(value.z) &&
    typeof value.closed === "boolean" &&
    typeof value.shaded === "boolean" &&
    typeof value.zoomed === "boolean" &&
    (value.placed === undefined || typeof value.placed === "boolean") &&
    (value.sizeVersion === undefined || (typeof value.sizeVersion === "number" && Number.isFinite(value.sizeVersion)))
  );
}

function parseDesktopState(value: unknown): DesktopState | Error {
  if (!isRecord(value) || !isRecord(value.windows) || !isRecord(value.icons)) {
    return new Error("The saved desktop has an invalid format");
  }
  let trash = value.trash;
  if (trash === undefined) {
    trash = [];
  }
  if (
    !Array.isArray(trash) ||
    !trash.every((id) => typeof id === "string") ||
    (value.path !== undefined && typeof value.path !== "string") ||
    (value.showHidden !== undefined && typeof value.showHidden !== "boolean") ||
    (value.seededTrash !== undefined && typeof value.seededTrash !== "boolean")
  ) {
    return new Error("The saved desktop preferences have an invalid format");
  }
  const windows: Record<string, WindowState> = Object.create(null);
  const icons: Record<string, Position> = Object.create(null);
  for (const [id, entry] of Object.entries(value.windows)) {
    if (!isWindowState(entry)) {
      return new Error(`The saved window ${id} has an invalid format`);
    }
    windows[id] = {
      x: entry.x,
      y: entry.y,
      width: entry.width,
      height: entry.height,
      closed: entry.closed,
      shaded: entry.shaded,
      zoomed: entry.zoomed,
      z: entry.z,
      ...(entry.placed !== undefined && { placed: entry.placed }),
      ...(entry.sizeVersion !== undefined && { sizeVersion: entry.sizeVersion }),
    };
  }
  for (const [id, position] of Object.entries(value.icons)) {
    if (!isPosition(position)) {
      return new Error(`The saved icon ${id} has an invalid format`);
    }
    icons[id] = { x: position.x, y: position.y };
  }
  return {
    windows,
    icons,
    trash,
    showHidden: value.showHidden ?? false,
    seededTrash: value.seededTrash ?? false,
    ...(value.path !== undefined && { path: value.path }),
  };
}

const storageKey = "kasperrt-desktop-v1";
const legacyStorageKey = "kasperrt-mac-desktop-v1";

export function emptyDesktopState(): DesktopState {
  return { windows: {}, icons: {}, trash: [easterEggIdeas.id], showHidden: false, seededTrash: true };
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
  const result = parseDesktopState(parsed);
  if (result instanceof Error) {
    return new Error("Could not restore the desktop", { cause: result });
  }
  if (!result.seededTrash) {
    result.trash.push(easterEggIdeas.id);
    result.seededTrash = true;
  }
  return result;
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
