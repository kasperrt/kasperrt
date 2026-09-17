import { safeWrap } from "../wrap";

export const backgroundStorageKey = "kasperrt-background-color";

export function normalizeBackgroundColor(value: string) {
  const color = value.trim().toLowerCase();
  if (/^#[\da-f]{6}$/.test(color)) {
    return color;
  }
  if (/^#[\da-f]{3}$/.test(color)) {
    return `#${Array.from(color.slice(1), (digit) => digit.repeat(2)).join("")}`;
  }
  return null;
}

export function currentBackgroundColor() {
  const value = getComputedStyle(document.documentElement).backgroundColor;
  const channels = value.match(/[\d.]+/g)?.slice(0, 3);
  if (channels?.length !== 3) {
    return "#bba8de";
  }
  return `#${channels.map((channel) => Math.round(Number(channel)).toString(16).padStart(2, "0")).join("")}`;
}

export function saveBackgroundColor(color: string | null) {
  const [error] = safeWrap(() => {
    if (!color) {
      localStorage.removeItem(backgroundStorageKey);
      return;
    }
    localStorage.setItem(backgroundStorageKey, color);
  });
  if (error) {
    return new Error("Could not save the desktop background.", { cause: error });
  }
  if (!color) {
    delete document.documentElement.dataset.backgroundColor;
  }
  if (color) {
    document.documentElement.dataset.backgroundColor = color;
  }
  document.dispatchEvent(new Event("desktop:background-change"));
  return null;
}
