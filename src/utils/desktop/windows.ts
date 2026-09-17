import { initDesktopInteractions } from "./interactions";
import { chooseWindowPosition } from "./placement";
import { desktopApps } from "../../data/desktop-apps";
import { initDesktopMenus } from "./menus";
import { poofWindow, type PoofOrigin } from "./poof";
import { createShakeDetector } from "./shake";
import { printCv } from "./print";

type Position = { x: number; y: number };
type WindowState = Position & {
  width: number;
  height: number;
  closed: boolean;
  shaded: boolean;
  zoomed: boolean;
  z: number;
  placed?: boolean;
  sizeVersion?: number;
};
type DesktopState = { windows: Record<string, WindowState>; icons: Record<string, Position>; path?: string };
const storageKey = "kasperrt-desktop-v1";
const legacyStorageKey = "kasperrt-mac-desktop-v1";
const defaults: DesktopState = { windows: {}, icons: {} };
let state: DesktopState = defaults;
let topZ = 10;

function readState(): DesktopState {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) ?? localStorage.getItem(legacyStorageKey) ?? "null");
    if (!parsed || typeof parsed !== "object") return { windows: {}, icons: {} };
    const windows: Record<string, WindowState> = {};
    const icons: Record<string, Position> = {};
    for (const element of document.querySelectorAll<HTMLElement>("[data-window]")) {
      const id = element.dataset.window ?? "main";
      const entry = parsed.windows?.[id];
      if (entry && [entry.x, entry.y, entry.width, entry.height, entry.z].every(Number.isFinite)) windows[id] = entry;
    }
    for (const id of ["home", "projects", "writing", "cv", "terminal", "music"]) {
      const entry = parsed.icons?.[id];
      if (entry && [entry.x, entry.y].every(Number.isFinite)) icons[id] = entry;
    }
    return { windows, icons, path: typeof parsed.path === "string" ? parsed.path : undefined };
  } catch {
    return { windows: {}, icons: {} };
  }
}
function saveState() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
    localStorage.removeItem(legacyStorageKey);
  } catch {
    /* The desktop also works without storage. */
  }
}
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

export function initDesktop(signal: AbortSignal) {
  state = readState();
  const compact = () => window.innerWidth < 600;
  const windows = Array.from(document.querySelectorAll<HTMLElement>("[data-window]"));
  const icons = Array.from(document.querySelectorAll<HTMLElement>("[data-desktop-icon]"));
  let initial = document.body.dataset.initialWindow ?? "main";
  let restoring = window.location.pathname === "/" && Object.keys(state.windows).length > 0;
  const routes: Record<string, string> = { main: "/", projects: "/projects", writing: "/blog", cv: "/more" };
  for (const element of windows)
    if (element.dataset.articleSrc && element.dataset.window)
      routes[element.dataset.window] = element.dataset.articleSrc;
  topZ = Math.max(10, ...Object.values(state.windows).map((entry) => entry.z));
  let suppressedClick = 0;
  let activeDrag: (() => void) | undefined;
  let resizeTimer = 0;

  function defaultWindow(id: string): WindowState {
    const presets: Record<string, { width: number; height: number; x: number; y: number }> = {
      main: { width: 690, height: 630, x: 45, y: 65 },
      projects: { width: 800, height: 650, x: 95, y: 110 },
      writing: { width: 740, height: 600, x: 130, y: 150 },
      cv: { width: 780, height: 680, x: 80, y: 90 },
      article: { width: 820, height: 710, x: 110, y: 100 },
      terminal: { width: 620, height: 350, x: 185, y: 180 },
      music: { width: 600, height: 560, x: 130, y: 110 },
      brick: { width: 960, height: 710, x: 70, y: 60 },
      idle: { width: 900, height: 710, x: 100, y: 95 },
      shot: { width: 760, height: 660, x: 145, y: 130 },
      unhinged: { width: 820, height: 680, x: 180, y: 165 },
      "runtime-lab": { width: 1100, height: 760, x: 50, y: 55 },
      about: { width: 420, height: 330, x: 170, y: 130 },
      help: { width: 440, height: 350, x: 190, y: 145 },
      info: { width: 370, height: 235, x: 220, y: 165 },
    };
    const preset = presets[id] ?? (id.startsWith("article-") ? presets.article : presets.main);
    const width = Math.min(preset.width, window.innerWidth - (compact() ? 20 : 135));
    const height = Math.min(preset.height, window.innerHeight - (compact() ? 135 : 100));
    return {
      x: compact() ? 10 : Math.min(preset.x, window.innerWidth - width - 110),
      y: compact() ? 116 : preset.y,
      width,
      height,
      closed: restoring || (id !== "main" && id !== initial),
      placed: id === "main" || id === initial,
      shaded: false,
      zoomed: id === "cv" && initial === "cv",
      z: id === initial ? 12 : 10,
      sizeVersion: 3,
    };
  }
  for (const id of ["music", ...desktopApps.map((app) => app.id)]) {
    const entry = state.windows[id];
    if (entry && (entry.sizeVersion ?? 1) < 3) {
      const preset = defaultWindow(id);
      entry.width = preset.width;
      entry.height = preset.height;
      entry.x = clamp(entry.x, 3, window.innerWidth - entry.width - 12);
      entry.y = clamp(entry.y, 30, window.innerHeight - entry.height - 12);
      entry.sizeVersion = 3;
    }
  }
  if (state.windows[initial] && !restoring) {
    state.windows[initial].closed = false;
    state.windows[initial].shaded = false;
    state.windows[initial].z = ++topZ;
    if (initial === "cv") {
      state.windows[initial].zoomed = true;
    }
  }
  function resolveId(id: string) {
    if (id !== "active") return id;
    return (
      windows.filter((element) => !element.hidden).sort((a, b) => Number(b.style.zIndex) - Number(a.style.zIndex))[0]
        ?.dataset.window ?? "main"
    );
  }
  function applyWindow(element: HTMLElement) {
    const id = element.dataset.window ?? "main";
    if (!state.windows[id]) state.windows[id] = defaultWindow(id);
    const entry = state.windows[id];
    element.hidden = entry.closed;
    element.classList.toggle("is-shaded", entry.shaded);
    element.classList.toggle("is-zoomed", entry.zoomed);
    const width = entry.zoomed
      ? window.innerWidth - 8
      : clamp(entry.width, Math.min(320, window.innerWidth - 12), window.innerWidth - 12);
    const height = entry.zoomed ? window.innerHeight - 36 : clamp(entry.height, 170, window.innerHeight - 36);
    const x = entry.zoomed ? 4 : clamp(entry.x, 3, window.innerWidth - width - 3);
    const y = entry.zoomed ? 30 : clamp(entry.y, 30, window.innerHeight - (entry.shaded ? 27 : height) - 3);
    Object.assign(element.style, {
      left: `${x}px`,
      top: `${y}px`,
      width: `${width}px`,
      height: entry.shaded ? "27px" : `${height}px`,
      zIndex: String(entry.z),
    });
    element
      .querySelector("[data-shade]")
      ?.setAttribute("aria-label", entry.shaded ? "Expand window" : "Collapse window");
    element
      .querySelector("[data-zoom]")
      ?.setAttribute("aria-label", entry.zoomed ? "Restore window size" : "Zoom window");
  }
  function updateLocation(path: string, title?: string | null) {
    if (window.location.pathname !== path || window.location.hash)
      window.history.replaceState(window.history.state, "", path);
    state.path = path;
    document.title =
      title && title !== "kasperrt.me" ? `${title} | kasper rynning-tønnesen` : "kasper rynning-tønnesen";
  }
  function bringForward(element: HTMLElement, updatePath = true) {
    const id = element.dataset.window ?? "main";
    const entry = state.windows[id];
    if (!entry) return;
    entry.z = ++topZ;
    element.style.zIndex = String(entry.z);
    for (const other of windows) other.classList.toggle("inactive", other !== element);
    if (updatePath && routes[id])
      updateLocation(routes[id], element.querySelector(".window-title")?.textContent?.replace(/\.txt$/, ""));
    saveState();
  }
  function find(id: string) {
    return windows.find((element) => element.dataset.window === id);
  }
  function loadFrame(element: HTMLElement) {
    const frame = element.querySelector<HTMLIFrameElement>("[data-app-frame]");
    if (frame && !frame.getAttribute("src") && frame.dataset.src) frame.src = frame.dataset.src;
    void loadArticle(element);
  }
  async function loadArticle(element: HTMLElement) {
    const source = element.dataset.articleSrc;
    const content = element.querySelector<HTMLElement>(".workspace-content");
    if (!source || !content || content.querySelector(".article-page") || element.dataset.articleLoading) return;
    element.dataset.articleLoading = "true";
    try {
      const response = await fetch(source, { signal });
      if (!response.ok) throw new Error(`Could not load post: ${response.status}`);
      const document = new DOMParser().parseFromString(await response.text(), "text/html");
      const article = document.querySelector(
        `[data-window="${CSS.escape(element.dataset.window ?? "")}"] .article-page`,
      );
      if (!article) throw new Error("The post content was missing");
      content.replaceChildren(article);
    } catch {
      if (signal.aborted) return;
      const message = document.createElement("p");
      message.className = "article-loading";
      message.textContent = "This post could not be loaded. ";
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "desktop-button";
      retry.dataset.open = element.dataset.window;
      retry.textContent = "Try again";
      message.append(retry);
      content.replaceChildren(message);
    } finally {
      delete element.dataset.articleLoading;
    }
  }
  function open(id: string) {
    const element = find(id);
    const entry = state.windows[id];
    if (!element || !entry) return;
    if (entry.closed && !entry.placed) {
      const visible = windows
        .filter((item) => item !== element && !item.hidden)
        .map((item) => {
          const rect = item.getBoundingClientRect();
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        });
      const position = chooseWindowPosition(
        Math.min(entry.width, window.innerWidth - 12),
        Math.min(entry.height, window.innerHeight - 36),
        { width: window.innerWidth, height: window.innerHeight },
        visible,
      );
      entry.x = position.x;
      entry.y = position.y;
    }
    entry.placed = true;
    entry.closed = false;
    entry.shaded = false;
    applyWindow(element);
    bringForward(element);
    saveState();
    if (id === "terminal") element.querySelector<HTMLInputElement>("input")?.focus();
    loadFrame(element);
  }
  function close(id: string, origin?: PoofOrigin) {
    id = resolveId(id);
    const element = find(id);
    if (!element || !state.windows[id] || state.windows[id].closed) return;
    poofWindow(element, origin);
    state.windows[id].closed = true;
    element.querySelector<HTMLIFrameElement>("[data-app-frame]")?.removeAttribute("src");
    applyWindow(element);
    if (routes[id] === window.location.pathname) updateLocation("/");
    saveState();
    const next = windows
      .filter((item) => !item.hidden)
      .sort((a, b) => Number(b.style.zIndex) - Number(a.style.zIndex))[0];
    if (next) bringForward(next, false);
  }
  function shade(id: string) {
    id = resolveId(id);
    const element = find(id);
    const entry = state.windows[id];
    if (!element || !entry) return;
    entry.shaded = !entry.shaded;
    entry.closed = false;
    applyWindow(element);
    bringForward(element);
    saveState();
  }
  function zoom(id: string) {
    id = resolveId(id);
    const element = find(id);
    const entry = state.windows[id];
    if (!element || !entry) return;
    entry.zoomed = !entry.zoomed;
    entry.shaded = false;
    entry.closed = false;
    applyWindow(element);
    bringForward(element);
    saveState();
  }
  function iconPosition(element: HTMLElement, index: number) {
    const id = element.dataset.desktopIcon ?? "home";
    const fallback = compact()
      ? { x: 4 + index * ((window.innerWidth - 10) / icons.length), y: 39 }
      : { x: window.innerWidth - 99, y: 60 + index * 91 };
    const position = state.icons[id] ?? fallback;
    element.style.left = `${clamp(position.x, 0, window.innerWidth - 72)}px`;
    element.style.top = `${clamp(position.y, 30, window.innerHeight - 70)}px`;
  }
  function setupDrag(handle: HTMLElement, element: HTMLElement, kind: "window" | "icon") {
    handle.addEventListener(
      "pointerdown",
      (event) => {
        if (
          event.button !== 0 ||
          (event.target instanceof Element && event.target.closest("button") && kind === "window")
        )
          return;
        const id = (kind === "window" ? element.dataset.window : element.dataset.desktopIcon) ?? "main";
        if (kind === "window") {
          bringForward(element);
          if (state.windows[id].zoomed) return;
        }
        if (kind === "icon" && !element.classList.contains("is-selected")) {
          if (!event.shiftKey)
            icons.forEach((icon) => {
              icon.classList.remove("is-selected");
            });
          element.classList.add("is-selected");
        }
        const group =
          kind === "icon"
            ? icons
                .filter((icon) => icon.classList.contains("is-selected"))
                .map((icon) => ({ icon, rect: icon.getBoundingClientRect() }))
            : [];
        const rect = element.getBoundingClientRect();
        handle.setPointerCapture(event.pointerId);
        const origin = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
        const detectShake = createShakeDetector(event.clientX, event.clientY);
        let moved = false;
        const onMove = (move: PointerEvent) => {
          const dx = move.clientX - origin.x;
          const dy = move.clientY - origin.y;
          if (!moved && Math.abs(dx) + Math.abs(dy) < 5) return;
          moved = true;
          handle.setPointerCapture(event.pointerId);
          document.body.classList.add("dragging");
          const x = clamp(origin.left + dx, 0, window.innerWidth - rect.width);
          const y = clamp(origin.top + dy, 28, window.innerHeight - rect.height);
          element.style.left = `${x}px`;
          element.style.top = `${y}px`;
          if (kind === "window") {
            state.windows[id].placed = true;
            state.windows[id].x = x;
            state.windows[id].y = y;
            if (detectShake(move.clientX, move.clientY, move.timeStamp)) {
              finish();
              close(id, { x: move.clientX, y: move.clientY });
              return;
            }
          } else {
            for (const item of group) {
              const groupX = clamp(item.rect.left + x - origin.left, 0, window.innerWidth - item.rect.width);
              const groupY = clamp(item.rect.top + y - origin.top, 28, window.innerHeight - item.rect.height);
              item.icon.style.left = `${groupX}px`;
              item.icon.style.top = `${groupY}px`;
              state.icons[item.icon.dataset.desktopIcon ?? "home"] = { x: groupX, y: groupY };
            }
          }
        };
        const finish = () => {
          handle.removeEventListener("pointermove", onMove);
          handle.removeEventListener("pointerup", finish);
          handle.removeEventListener("pointercancel", finish);
          if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
          document.body.classList.remove("dragging");
          if (moved) {
            suppressedClick = Date.now() + 150;
            saveState();
          }
          activeDrag = undefined;
        };
        activeDrag?.();
        activeDrag = finish;
        handle.addEventListener("pointermove", onMove);
        handle.addEventListener("pointerup", finish);
        handle.addEventListener("pointercancel", finish);
      },
      { signal },
    );
    handle.addEventListener("dragstart", (event) => event.preventDefault(), { signal });
  }
  for (const element of windows) {
    applyWindow(element);
    element.addEventListener("pointerdown", () => bringForward(element), { signal });
    const titlebar = element.querySelector<HTMLElement>("[data-window-drag]");
    if (!titlebar) continue;
    setupDrag(titlebar, element, "window");
    titlebar.addEventListener(
      "dblclick",
      (event) => {
        if (!(event.target instanceof Element && event.target.closest("button")))
          shade(element.dataset.window ?? "main");
      },
      { signal },
    );
    titlebar.addEventListener(
      "keydown",
      (event) => {
        if (event.target !== titlebar || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key))
          return;
        event.preventDefault();
        const entry = state.windows[element.dataset.window ?? "main"];
        if (entry.zoomed) return;
        entry.placed = true;
        const step = event.shiftKey ? 30 : 10;
        entry.x += event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0;
        entry.y += event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0;
        applyWindow(element);
        saveState();
      },
      { signal },
    );
  }
  const observer = new ResizeObserver((entries) => {
    for (const observed of entries) {
      const element = observed.target as HTMLElement;
      const id = element.dataset.window ?? "main";
      const entry = state.windows[id];
      if (!entry || entry.closed || entry.shaded || entry.zoomed || compact()) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 40) {
        entry.width = rect.width;
        entry.height = rect.height;
      }
    }
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(saveState, 150);
  });
  windows.forEach((element) => {
    observer.observe(element);
  });
  for (const element of windows) if (!element.hidden) loadFrame(element);
  icons.forEach((element, index) => {
    iconPosition(element, index);
    setupDrag(element, element, "icon");
  });

  function reset() {
    for (const element of windows) element.querySelector<HTMLIFrameElement>("[data-app-frame]")?.removeAttribute("src");
    state = { windows: {}, icons: {} };
    restoring = false;
    initial = "main";
    windows.forEach(applyWindow);
    icons.forEach((icon, index) => {
      icon.classList.remove("is-selected");
      iconPosition(icon, index);
    });
    updateLocation("/");
    saveState();
  }
  initDesktopInteractions(signal, { open, close, shade, zoom, reset });

  document.addEventListener(
    "click",
    (event) => {
      if (Date.now() < suppressedClick) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest<HTMLElement>("button");
      if (button) {
        if (button.dataset.close)
          close(button.dataset.close, event.detail > 0 ? { x: event.clientX, y: event.clientY } : undefined);
        if (button.dataset.open) open(button.dataset.open);
        if (button.dataset.zoom) zoom(button.dataset.zoom);
        if (button.dataset.shade) shade(button.dataset.shade);
        if (button.hasAttribute("data-terminal-toggle") || button.hasAttribute("data-uptime-open")) open("terminal");
        if (button.hasAttribute("data-music-toggle")) open("music");
        if (button.hasAttribute("data-about-toggle")) open("about");
        if (button.hasAttribute("data-help-toggle")) open("help");
        if (button.hasAttribute("data-print-cv")) printCv();
        if (button.hasAttribute("data-desktop-reset")) reset();
      }
      const anchor = target?.closest<HTMLAnchorElement>("a[href]");
      if (anchor && anchor.origin === window.location.origin && !anchor.hash && !event.metaKey && !event.ctrlKey) {
        const route = anchor.pathname.replace(/\/$/, "") || "/";
        const applicationRoutes: Record<string, string> = {
          "/": "main",
          "/projects": "projects",
          "/blog": "writing",
          "/more": "cv",
        };
        const application = applicationRoutes[route];
        if (application && find(application)) {
          event.preventDefault();
          open(application);
        } else if (route.startsWith("/blog/")) {
          const article = windows.find((element) => element.dataset.articleSrc === route);
          if (article?.dataset.window) {
            event.preventDefault();
            open(article.dataset.window);
          }
        }
      }
      if (!target?.closest("summary"))
        for (const menu of document.querySelectorAll<HTMLDetailsElement>(".desktop-menu[open]")) menu.open = false;
    },
    { signal, capture: true },
  );
  initDesktopMenus(signal);
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        const front = windows
          .filter((item) => !item.hidden)
          .sort((a, b) => Number(b.style.zIndex) - Number(a.style.zIndex))[0];
        const hasOpenMenu = document.querySelector(".desktop-menu[open]");
        if (!hasOpenMenu && front && ["about", "help", "info"].includes(front.dataset.window ?? ""))
          close(front.dataset.window ?? "info");
        for (const menu of document.querySelectorAll<HTMLDetailsElement>(".desktop-menu[open]")) menu.open = false;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        open("terminal");
      }
    },
    { signal },
  );
  window.addEventListener(
    "blur",
    () => {
      // Events inside a cross-origin iframe do not bubble to its window frame.
      queueMicrotask(() => {
        if (signal.aborted || !(document.activeElement instanceof HTMLIFrameElement)) return;
        const element = document.activeElement.closest<HTMLElement>("[data-window]");
        if (element && !element.hidden) bringForward(element);
      });
    },
    { signal },
  );
  window.addEventListener(
    "resize",
    () => {
      windows.forEach(applyWindow);
      icons.forEach(iconPosition);
    },
    { signal },
  );
  const front = windows
    .filter((element) => !element.hidden)
    .sort((a, b) => Number(b.style.zIndex) - Number(a.style.zIndex))[0];
  if (front) for (const element of windows) element.classList.toggle("inactive", element !== front);
  const initialElement = find(initial);
  if (initialElement && !restoring) bringForward(initialElement);
  else updateLocation("/");
  saveState();
  document.documentElement.classList.remove("desktop-starting");
  return {
    open,
    close,
    cleanup: () => {
      activeDrag?.();
      observer.disconnect();
      clearTimeout(resizeTimer);
      saveState();
    },
  };
}
