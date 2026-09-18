import { safeWrap } from "../wrap";
import { isRecord } from "./state";

export function readWindowTitles() {
  const [error, value] = safeWrap<Error, unknown>(() => JSON.parse(document.body.dataset.windowTitles ?? "{}"));
  if (error) {
    return new Error("Could not read the window titles", { cause: error });
  }
  if (!isRecord(value)) {
    return new Error("The window titles have an invalid format");
  }
  const titles = new Map<string, string>();
  for (const [id, title] of Object.entries(value)) {
    if (typeof title !== "string") {
      return new Error(`The title for ${id} has an invalid format`);
    }
    titles.set(id, title);
  }
  return titles;
}

export function createWindow(id: string, title: string): HTMLElement | Error {
  const template = document.querySelector<HTMLTemplateElement>("[data-window-template]");
  const element = template?.content.firstElementChild?.cloneNode(true);
  if (!(element instanceof HTMLElement)) {
    return new Error("The window template is missing");
  }
  element.id = `${id}-window`;
  element.dataset.window = id;
  element.setAttribute("aria-label", title);
  element.querySelector("[data-window-drag]")?.setAttribute("aria-label", `Move ${title} window with arrow keys`);
  element.querySelector("[data-close]")?.setAttribute("aria-label", `Close ${title}`);
  for (const control of ["close", "zoom", "shade", "window-retry"]) {
    element.querySelector(`[data-${control}]`)?.setAttribute(`data-${control}`, id);
  }
  for (const label of element.querySelectorAll(".window-title, .window-status > span:first-child")) {
    label.textContent = title;
  }
  return element;
}

// Keep the frame and drag handle mounted so loading cannot interrupt a drag or resize.
export function installWindowContent(element: HTMLElement, content: HTMLElement) {
  const header = element.querySelector<HTMLElement>("[data-window-drag]");
  const nextHeader = content.querySelector<HTMLElement>("[data-window-drag]");
  if (!header || !nextHeader) {
    return new Error("The window content is missing its title bar");
  }
  const inactive = element.classList.contains("inactive");
  const preserved = new Set(["style", "hidden", "data-load-state", "aria-busy"]);
  for (const attribute of Array.from(element.attributes)) {
    if (!preserved.has(attribute.name)) {
      element.removeAttribute(attribute.name);
    }
  }
  for (const attribute of Array.from(content.attributes)) {
    if (!preserved.has(attribute.name)) {
      element.setAttribute(attribute.name, attribute.value);
    }
  }
  element.classList.toggle("inactive", inactive);
  for (const attribute of Array.from(header.attributes)) {
    header.removeAttribute(attribute.name);
  }
  for (const attribute of Array.from(nextHeader.attributes)) {
    header.setAttribute(attribute.name, attribute.value);
  }
  header.replaceChildren(...nextHeader.childNodes);
  nextHeader.remove();
  for (const child of Array.from(element.childNodes)) {
    if (child !== header) {
      child.remove();
    }
  }
  element.append(...content.childNodes);
}

export function showWindowStatus(element: HTMLElement, failed = false) {
  const id = element.dataset.window;
  const title = element.querySelector(".window-title")?.textContent;
  if (!id || !title) {
    return new Error("The window is missing its identity");
  }
  const content = createWindow(id, title);
  if (content instanceof Error) {
    return new Error("Could not create the window status", { cause: content });
  }
  if (failed) {
    content.querySelector("[data-loading-spinner]")?.remove();
    const message = content.querySelector("[data-loading-message]");
    const retry = content.querySelector<HTMLButtonElement>("[data-window-retry]");
    if (message) {
      message.textContent = "Couldn't load this window.";
    }
    if (retry) {
      retry.hidden = false;
    }
  }
  element.setAttribute("aria-busy", String(!failed));
  return installWindowContent(element, content);
}
