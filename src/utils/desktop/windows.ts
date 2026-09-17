import { initDesktopInteractions } from "./interactions";
import { chooseWindowPosition } from "./placement";
import { desktopApps } from "../../data/desktop-apps";
import { initDesktopMenus } from "./menus";
import { poofOrigin, poofWindow, type PoofOrigin } from "./poof";
import { createShakeDetector } from "./shake";
import { printCv } from "./print";
import { emptyDesktopState, readDesktopState, saveDesktopState } from "./state";
import { createWindowState } from "./presets";
import { loadArticle } from "./articles";
import { getRouteWindow } from "./routes";
import { arrowOffset, eventElement } from "./events";

type DragKind = "window" | "icon";
interface DraggedIcon {
  icon: HTMLElement;
  rect: DOMRect;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

function restoreDesktopState() {
  const savedState = readDesktopState();
  if (savedState instanceof Error) {
    console.warn(savedState);
    return emptyDesktopState();
  }
  return savedState;
}

export function initDesktop(signal: AbortSignal) {
  let state = restoreDesktopState();
  let storageWarningShown = false;
  function saveState() {
    const error = saveDesktopState(state);
    if (!error || storageWarningShown) {
      return;
    }
    storageWarningShown = true;
    console.warn(error);
  }
  const compact = () => window.innerWidth < 600;
  const windows = Array.from(document.querySelectorAll<HTMLElement>("[data-window]"));
  const icons = Array.from(document.querySelectorAll<HTMLElement>("[data-desktop-icon]"));
  let initial = document.body.dataset.initialWindow ?? "main";
  const routes: Record<string, string> = { main: "/", projects: "/projects", writing: "/blog", cv: "/more" };
  for (const element of windows) {
    if (element.dataset.articleSrc && element.dataset.window) {
      routes[element.dataset.window] = element.dataset.articleSrc;
    }
  }
  let topZ = Math.max(10, ...Object.values(state.windows).map((entry) => entry.z));
  let suppressedClick = 0;
  let activeDrag: (() => void) | undefined;
  let resizeTimer = 0;

  function frontWindow() {
    return windows
      .filter((element) => !element.hidden)
      .sort((a, b) => Number(b.style.zIndex) - Number(a.style.zIndex))
      .at(0);
  }

  for (const id of ["music", ...desktopApps.map((app) => app.id)]) {
    const entry = state.windows[id];
    if (entry && (entry.sizeVersion ?? 1) < 3) {
      const preset = createWindowState(id, initial);
      entry.width = preset.width;
      entry.height = preset.height;
      entry.x = clamp(entry.x, 3, window.innerWidth - entry.width - 12);
      entry.y = clamp(entry.y, 30, window.innerHeight - entry.height - 12);
      entry.sizeVersion = 3;
    }
  }
  const initialState = state.windows[initial];
  if (initialState) {
    initialState.closed = false;
    initialState.shaded = false;
    initialState.z = ++topZ;
    if (initial === "cv") {
      initialState.zoomed = true;
    }
  }
  function resolveId(id: string) {
    if (id !== "active") {
      return id;
    }
    return frontWindow()?.dataset.window ?? "main";
  }
  function applyWindow(element: HTMLElement) {
    const id = element.dataset.window ?? "main";
    if (!state.windows[id]) {
      state.windows[id] = createWindowState(id, initial);
    }
    const entry = state.windows[id];
    element.hidden = entry.closed;
    element.classList.toggle("is-shaded", entry.shaded);
    element.classList.toggle("is-zoomed", entry.zoomed);
    let width = clamp(entry.width, Math.min(320, window.innerWidth - 12), window.innerWidth - 12);
    let height = clamp(entry.height, 170, window.innerHeight - 36);
    if (entry.shaded) {
      height = 27;
    }
    let x = clamp(entry.x, 3, window.innerWidth - width - 3);
    let y = clamp(entry.y, 30, window.innerHeight - height - 3);
    if (entry.zoomed) {
      width = window.innerWidth - 8;
      height = window.innerHeight - 36;
      x = 4;
      y = 30;
    }
    let shadeLabel = "Collapse window";
    let zoomLabel = "Zoom window";
    if (entry.shaded) {
      height = 27;
      shadeLabel = "Expand window";
    }
    if (entry.zoomed) {
      zoomLabel = "Restore window size";
    }
    Object.assign(element.style, {
      left: `${x}px`,
      top: `${y}px`,
      width: `${width}px`,
      height: `${height}px`,
      zIndex: String(entry.z),
    });
    element.querySelector("[data-shade]")?.setAttribute("aria-label", shadeLabel);
    element.querySelector("[data-zoom]")?.setAttribute("aria-label", zoomLabel);
  }
  function updateLocation(path: string, title?: string | null) {
    if (window.location.pathname !== path || window.location.hash) {
      window.history.replaceState(window.history.state, "", path);
    }
    state.path = path;
    document.title = "kasper rynning-tønnesen";
    if (title && title !== "kasperrt.me") {
      document.title = `${title} | kasper rynning-tønnesen`;
    }
  }
  function bringForward(element: HTMLElement, updatePath = true) {
    const id = element.dataset.window ?? "main";
    const entry = state.windows[id];
    if (!entry) {
      return;
    }
    entry.z = ++topZ;
    element.style.zIndex = String(entry.z);
    for (const other of windows) {
      other.classList.toggle("inactive", other !== element);
    }
    if (updatePath && routes[id]) {
      updateLocation(routes[id], element.querySelector(".window-title")?.textContent?.replace(/\.txt$/, ""));
    }
    saveState();
  }
  function find(id: string) {
    return windows.find((element) => element.dataset.window === id);
  }
  function loadFrame(element: HTMLElement) {
    const frame = element.querySelector<HTMLIFrameElement>("[data-app-frame]");
    if (frame && !frame.getAttribute("src") && frame.dataset.src) {
      frame.src = frame.dataset.src;
    }
    void loadArticle(element, signal);
  }
  function open(id: string) {
    const element = find(id);
    const entry = state.windows[id];
    if (!element || !entry) {
      return;
    }
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
    if (id === "terminal") {
      element.querySelector<HTMLInputElement>("input")?.focus();
    }
    loadFrame(element);
  }
  function close(id: string, origin?: PoofOrigin) {
    id = resolveId(id);
    const element = find(id);
    const entry = state.windows[id];
    if (!element || !entry || entry.closed) {
      return;
    }
    poofWindow(element, origin);
    entry.closed = true;
    element.querySelector<HTMLIFrameElement>("[data-app-frame]")?.removeAttribute("src");
    applyWindow(element);
    if (routes[id] === window.location.pathname) {
      updateLocation("/");
    }
    saveState();
    const next = frontWindow();
    if (next) {
      bringForward(next, false);
    }
  }
  function shade(id: string) {
    id = resolveId(id);
    const element = find(id);
    const entry = state.windows[id];
    if (!element || !entry) {
      return;
    }
    entry.shaded = !entry.shaded;
    entry.closed = false;
    applyWindow(element);
    bringForward(element);
  }
  function zoom(id: string) {
    id = resolveId(id);
    const element = find(id);
    const entry = state.windows[id];
    if (!element || !entry) {
      return;
    }
    entry.zoomed = !entry.zoomed;
    entry.shaded = false;
    entry.closed = false;
    applyWindow(element);
    bringForward(element);
  }
  function iconPosition(element: HTMLElement, index: number) {
    const id = element.dataset.desktopIcon ?? "home";
    let fallback = { x: window.innerWidth - 99, y: 60 + index * 91 };
    if (compact()) {
      fallback = { x: 4 + index * ((window.innerWidth - 10) / icons.length), y: 39 };
    }
    const position = state.icons[id] ?? fallback;
    element.style.left = `${clamp(position.x, 0, window.innerWidth - 72)}px`;
    element.style.top = `${clamp(position.y, 30, window.innerHeight - 70)}px`;
  }
  function setupDrag(handle: HTMLElement, element: HTMLElement, kind: DragKind) {
    handle.addEventListener(
      "pointerdown",
      (event) => {
        if (
          event.button !== 0 ||
          (event.target instanceof Element && event.target.closest("button") && kind === "window")
        ) {
          return;
        }
        let id = element.dataset.desktopIcon ?? "home";
        if (kind === "window") {
          id = element.dataset.window ?? "main";
        }
        if (kind === "window") {
          bringForward(element);
          const entry = state.windows[id];
          if (!entry || entry.zoomed) {
            return;
          }
        }
        if (kind === "icon" && !element.classList.contains("is-selected")) {
          if (!event.shiftKey) {
            icons.forEach((icon) => {
              icon.classList.remove("is-selected");
            });
          }
          element.classList.add("is-selected");
        }
        let group: DraggedIcon[] = [];
        if (kind === "icon") {
          group = icons
            .filter((icon) => icon.classList.contains("is-selected"))
            .map((icon) => ({ icon, rect: icon.getBoundingClientRect() }));
        }
        const rect = element.getBoundingClientRect();
        handle.setPointerCapture(event.pointerId);
        const origin = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
        const detectShake = createShakeDetector(event.clientX, event.clientY);
        let moved = false;
        const onMove = (move: PointerEvent) => {
          const dx = move.clientX - origin.x;
          const dy = move.clientY - origin.y;
          if (!moved && Math.abs(dx) + Math.abs(dy) < 5) {
            return;
          }
          moved = true;
          handle.setPointerCapture(event.pointerId);
          document.body.classList.add("dragging");
          const x = clamp(origin.left + dx, 0, window.innerWidth - rect.width);
          const y = clamp(origin.top + dy, 28, window.innerHeight - rect.height);
          element.style.left = `${x}px`;
          element.style.top = `${y}px`;
          if (kind === "window") {
            const entry = state.windows[id];
            if (!entry) {
              finish();
              return;
            }
            entry.placed = true;
            entry.x = x;
            entry.y = y;
            if (detectShake(move.clientX, move.clientY, move.timeStamp)) {
              finish();
              close(id, { x: move.clientX, y: move.clientY });
              return;
            }
            return;
          }
          for (const item of group) {
            const groupX = clamp(item.rect.left + x - origin.left, 0, window.innerWidth - item.rect.width);
            const groupY = clamp(item.rect.top + y - origin.top, 28, window.innerHeight - item.rect.height);
            item.icon.style.left = `${groupX}px`;
            item.icon.style.top = `${groupY}px`;
            state.icons[item.icon.dataset.desktopIcon ?? "home"] = { x: groupX, y: groupY };
          }
        };
        const finish = () => {
          handle.removeEventListener("pointermove", onMove);
          handle.removeEventListener("pointerup", finish);
          handle.removeEventListener("pointercancel", finish);
          if (handle.hasPointerCapture(event.pointerId)) {
            handle.releasePointerCapture(event.pointerId);
          }
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
    if (!titlebar) {
      continue;
    }
    setupDrag(titlebar, element, "window");
    titlebar.addEventListener(
      "dblclick",
      (event) => {
        if (!(event.target instanceof Element && event.target.closest("button"))) {
          shade(element.dataset.window ?? "main");
        }
      },
      { signal },
    );
    titlebar.addEventListener(
      "keydown",
      (event) => {
        if (event.target !== titlebar || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
          return;
        }
        event.preventDefault();
        const entry = state.windows[element.dataset.window ?? "main"];
        if (!entry || entry.zoomed) {
          return;
        }
        entry.placed = true;
        let step = 10;
        if (event.shiftKey) {
          step = 30;
        }
        const offset = arrowOffset(event.key, step);
        entry.x += offset.x;
        entry.y += offset.y;
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
      if (!entry || entry.closed || entry.shaded || entry.zoomed || compact()) {
        continue;
      }
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
  for (const element of windows) {
    if (!element.hidden) {
      loadFrame(element);
    }
  }
  icons.forEach((element, index) => {
    iconPosition(element, index);
    setupDrag(element, element, "icon");
  });

  function reset() {
    for (const element of windows) {
      element.querySelector<HTMLIFrameElement>("[data-app-frame]")?.removeAttribute("src");
    }
    state = emptyDesktopState();
    initial = "main";
    windows.forEach(applyWindow);
    icons.forEach((icon, index) => {
      icon.classList.remove("is-selected");
      iconPosition(icon, index);
    });
    updateLocation("/");
    const home = find("main");
    if (home) {
      bringForward(home);
      return;
    }
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
      const target = eventElement(event);
      const button = target?.closest<HTMLElement>("button");
      if (button) {
        if (button.dataset.close) {
          close(button.dataset.close, poofOrigin(event));
        }
        if (button.dataset.open) {
          open(button.dataset.open);
        }
        if (button.dataset.zoom) {
          zoom(button.dataset.zoom);
        }
        if (button.dataset.shade) {
          shade(button.dataset.shade);
        }
        if (button.hasAttribute("data-terminal-toggle") || button.hasAttribute("data-uptime-open")) {
          open("terminal");
        }
        if (button.hasAttribute("data-music-toggle")) {
          open("music");
        }
        if (button.hasAttribute("data-about-toggle")) {
          open("about");
        }
        if (button.hasAttribute("data-help-toggle")) {
          open("help");
        }
        if (button.hasAttribute("data-print-cv")) {
          printCv();
        }
        if (button.hasAttribute("data-desktop-reset")) {
          reset();
        }
      }
      const anchor = target?.closest<HTMLAnchorElement>("a[href]");
      if (anchor && anchor.origin === window.location.origin && !anchor.hash && !event.metaKey && !event.ctrlKey) {
        const route = anchor.pathname.replace(/\/$/, "") || "/";
        const application = getRouteWindow(route);
        if (application && find(application)) {
          event.preventDefault();
          open(application);
        }
      }
      if (!target?.closest("summary")) {
        for (const menu of document.querySelectorAll<HTMLDetailsElement>(".desktop-menu[open]")) {
          menu.open = false;
        }
      }
    },
    { signal, capture: true },
  );
  initDesktopMenus(signal);
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        const front = frontWindow();
        const hasOpenMenu = document.querySelector(".desktop-menu[open]");
        if (!hasOpenMenu && front && ["about", "help", "info"].includes(front.dataset.window ?? "")) {
          close(front.dataset.window ?? "info");
        }
        for (const menu of document.querySelectorAll<HTMLDetailsElement>(".desktop-menu[open]")) {
          menu.open = false;
        }
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
        if (signal.aborted || !(document.activeElement instanceof HTMLIFrameElement)) {
          return;
        }
        const element = document.activeElement.closest<HTMLElement>("[data-window]");
        if (element && !element.hidden) {
          bringForward(element);
        }
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
  const front = frontWindow();
  if (front) {
    for (const element of windows) {
      element.classList.toggle("inactive", element !== front);
    }
  }
  function focusInitialWindow() {
    const initialElement = find(initial);
    if (!initialElement) {
      updateLocation("/");
      return;
    }
    bringForward(initialElement);
  }
  focusInitialWindow();
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
