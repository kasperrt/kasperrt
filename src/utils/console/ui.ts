import type { ConsoleCommand } from "~/utils/console";

export function cleanString(s: string) {
  if ((s.startsWith("*") && s.endsWith("*")) || (s.startsWith("_") && s.endsWith("_"))) {
    return s.substring(1, s.length - 1);
  }
  return s;
}

export function isLink(value: ConsoleCommand): value is string {
  return (
    typeof value === "string" &&
    (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("mailto:"))
  );
}

export function isExternalLink(value: string) {
  return value.startsWith("http://") || value.startsWith("https://");
}

export function isUptime(value: ConsoleCommand): value is { type: "uptime" } {
  return typeof value === "object" && value !== null && value.type === "uptime";
}

export function shouldShowUptime(value: ConsoleCommand): boolean {
  return isUptime(value);
}

export function shouldShowLink(value: ConsoleCommand): boolean {
  if (isUptime(value)) {
    return false;
  }
  return isLink(value);
}

export function shouldShowText(value: ConsoleCommand): boolean {
  if (isUptime(value)) {
    return false;
  }
  if (isLink(value)) {
    return false;
  }
  return true;
}

export function getLinkValue(value: ConsoleCommand): string | null {
  if (!isLink(value)) {
    return null;
  }
  const parts = value.split(" ");
  if (parts.length <= 1) {
    return null;
  }
  return parts[0];
}

export function getCommandText(value: ConsoleCommand): string {
  if (typeof value === "string") {
    return value;
  }
  return "";
}

export function getLinkSummary(value: ConsoleCommand): string | null {
  const text = getCommandText(value);
  if (!isLink(value)) {
    return null;
  }
  const parts = text.split(" ");
  if (parts.length <= 1) {
    return null;
  }
  return text.substring(parts[0].length);
}

export function isItalicCommand(value: ConsoleCommand): boolean {
  const text = getCommandText(value);
  return text.startsWith("*") && text.endsWith("*");
}

export function isBoldCommand(value: ConsoleCommand): boolean {
  const text = getCommandText(value);
  return text.startsWith("_") && text.endsWith("_");
}

export function isSpaceCommand(value: ConsoleCommand): boolean {
  return getCommandText(value) === " ";
}

export function getLinkTarget(value: string) {
  if (!isExternalLink(value)) {
    return undefined;
  }
  return "_blank";
}

export function getLinkRel(value: string) {
  if (!isExternalLink(value)) {
    return undefined;
  }
  return "noreferrer";
}
