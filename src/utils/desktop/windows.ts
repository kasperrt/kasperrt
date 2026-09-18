import { initDesktopInteractions } from "./interactions";
import { chooseWindowPosition } from "./placement";
import { desktopApps } from "../../data/desktop-apps";
import { initDesktopMenus } from "./menus";
import { poofOrigin, poofWindow, type PoofOrigin } from "./poof";
import { createShakeDetector } from "./shake";
import { printCv } from "./print";
import { emptyDesktopState, readDesktopState, saveDesktopState } from "./state";
import { createWindowState } from "./presets";
import { fetchWindow } from "./content";
import { getRouteWindow } from "./routes";
import { arrowOffset, eventElement } from "./events";
import { saveBackgroundColor } from "./background";
import { safeWrap, safeWrapAsync } from "../wrap";
import type { initTrash } from "./trash";
import { createWindow, installWindowContent, readWindowTitles, showWindowStatus } from "./window-content";

interface WindowLoad {
  controller: AbortController;
  result: Promise<void>;
}

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

type PrepareWindow = (element: HTMLElement, signal: AbortSignal) => Promise<Error | undefined>;

export function initDesktop(signal: AbortSignal, prepareWindow: PrepareWindow) {
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
  const compact = () => window.innerWidth < 640;
  const titles = readWindowTitles();
  let windowTitles = new Map<string, string>();
  if (titles instanceof Error) {
    console.warn(titles);
  }
  if (!(titles instanceof Error)) {
    windowTitles = titles;
  }
  const availableWindows = new Set(windowTitles.keys());
  const loadingWindows = new Map<string, WindowLoad>();
  const windows = Array.from(document.querySelectorAll<HTMLElement>("[data-window]"));
  const icons = Array.from(document.querySelectorAll<HTMLElement>("[data-desktop-icon]"));
  const regularIcons = icons.filter((icon) => !icon.hasAttribute("data-hidden-icon"));
  const hiddenIcons = icons.filter((icon) => icon.hasAttribute("data-hidden-icon"));
  const trashCan = document.querySelector<HTMLElement>("[data-trash-can]");
  const crashScreen = document.querySelector<HTMLDialogElement>("[data-crash-screen]");
  let showHidden = state.showHidden;
  let initial = document.body.dataset.initialWindow ?? "main";
  const routes: Record<string, string> = { main: "/", projects: "/projects", writing: "/blog", cv: "/more" };
  for (const id of availableWindows) {
    if (id.startsWith("article-")) {
      routes[id] = `/blog/${id.slice("article-".length)}`;
    }
  }
  let topZ = Math.max(10, ...Object.values(state.windows).map((entry) => entry.z));
  let suppressedClick = 0;
  let activeDrag: (() => void) | undefined;
  let resizeTimer = 0;
  function isTrashed(id: string) {
    if (id === "main") {
      return state.trash.includes("home");
    }
    return state.trash.includes(id);
  }
  function syncAppEntries() {
    for (const entry of document.querySelectorAll<HTMLElement>("[data-app-entry]")) {
      entry.hidden = isTrashed(entry.dataset.appEntry ?? "");
    }
  }
  function showCrashScreen() {
    if (!isTrashed("main") || !crashScreen || crashScreen.open) {
      return;
    }
    for (const element of windows) {
      element.querySelector<HTMLIFrameElement>("[data-app-frame]")?.removeAttribute("src");
    }
    for (const menu of document.querySelectorAll<HTMLDetailsElement>(".desktop-menu[open]")) {
      menu.open = false;
    }
    const [error] = safeWrap(() => crashScreen.showModal());
    if (error) {
      console.warn(new Error("Could not open the crash screen", { cause: error }));
    }
    updateLocation("/");
  }
  crashScreen?.addEventListener("cancel", (event) => event.preventDefault(), { signal });
  let renderTrash: ReturnType<typeof initTrash> | undefined;
  function showTrash() {
    renderTrash?.(icons, state.trash);
  }
  function restoreTrashItem(id: string) {
    const icon = icons.find((candidate) => candidate.dataset.desktopIcon === id);
    if (!icon || !state.trash.includes(id)) {
      return;
    }
    state.trash = state.trash.filter((item) => item !== id);
    delete state.icons[id];
    if (icon.hasAttribute("data-hidden-icon")) {
      showHidden = true;
      state.showHidden = true;
      hiddenIcons.forEach(applyIconVisibility);
    }
    let windowId = id;
    if (id === "home") {
      windowId = "main";
    }
    state.windows[windowId] = { ...createWindowState(windowId, initial), closed: true, zoomed: false, placed: false };
    const element = find(windowId);
    if (element) {
      applyWindow(element);
    }
    if (id === "env") {
      const error = saveBackgroundColor(null);
      if (error) {
        console.warn(error);
      }
      document.dispatchEvent(new Event("desktop:environment-reset"));
    }
    applyIconVisibility(icon);
    iconPosition(icon);
    syncAppEntries();
    showTrash();
    saveState();
    icon.focus({ preventScroll: true });
  }
  function applyIconVisibility(icon: HTMLElement) {
    icon.hidden =
      state.trash.includes(icon.dataset.desktopIcon ?? "") || (icon.hasAttribute("data-hidden-icon") && !showHidden);
  }
  function trashIcon(icon: HTMLElement) {
    const id = icon.dataset.desktopIcon;
    if (!id || state.trash.includes(id)) {
      return;
    }
    let windowId = id;
    if (id === "home") {
      windowId = "main";
    }
    close(windowId);
    state.trash.push(id);
    icon.hidden = true;
    icon.classList.remove("is-selected");
    if (id === "env") {
      const error = saveBackgroundColor("#000000");
      if (error) {
        console.warn(error);
      }
    }
    showTrash();
    syncAppEntries();
    showCrashScreen();
  }

  function frontWindow() {
    return windows
      .filter((element) => !element.hidden)
      .sort((a, b) => Number(b.style.zIndex) - Number(a.style.zIndex))
      .at(0);
  }
  function updateSaveMenu(element?: HTMLElement) {
    const saveButton = document.querySelector<HTMLButtonElement>("[data-save-file]");
    if (saveButton) {
      saveButton.disabled = !element?.hasAttribute("data-saveable");
    }
  }
  function saveFile() {
    const element = frontWindow();
    if (element?.hasAttribute("data-saveable")) {
      element.dispatchEvent(new Event("desktop:save-file"));
    }
  }

  for (const id of ["main", "music", ...desktopApps.map((app) => app.id)]) {
    const entry = state.windows[id];
    const preset = createWindowState(id, initial);
    if (entry && (entry.sizeVersion ?? 1) < (preset.sizeVersion ?? 1)) {
      entry.width = preset.width;
      entry.height = preset.height;
      entry.x = clamp(entry.x, 3, window.innerWidth - entry.width - 12);
      entry.y = clamp(entry.y, 30, window.innerHeight - entry.height - 12);
      entry.sizeVersion = preset.sizeVersion;
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
    if (isTrashed(id)) {
      entry.closed = true;
    }
    element.hidden = entry.closed;
    element.classList.toggle("is-shaded", entry.shaded);
    element.classList.toggle("is-zoomed", entry.zoomed);
    let width = clamp(entry.width, Math.min(320, window.innerWidth - 12), window.innerWidth - 12);
    let height = clamp(entry.height, 170, window.innerHeight - 36);
    if (entry.shaded) {
      height = 32;
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
      height = 32;
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
    updateSaveMenu(element);
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
    if (isTrashed("main")) {
      return;
    }
    const frame = element.querySelector<HTMLIFrameElement>("[data-app-frame]");
    if (frame && !frame.getAttribute("src") && frame.dataset.src) {
      frame.src = frame.dataset.src;
    }
  }
  function registerWindow(element: HTMLElement) {
    if (windows.includes(element)) {
      return;
    }
    windows.push(element);
    setupWindow(element);
    element.classList.add("inactive");
    observer.observe(element);
  }
  function ensureWindow(id: string): HTMLElement | Error {
    const existing = find(id);
    if (existing) {
      return existing;
    }
    const title = windowTitles.get(id);
    if (!title) {
      return new Error(`Unknown desktop window: ${id}`);
    }
    const element = createWindow(id, title);
    if (element instanceof Error) {
      return new Error(`Could not create ${id}`, { cause: element });
    }
    element.dataset.loadState = "idle";
    document.body.append(element);
    registerWindow(element);
    return element;
  }
  function cancelWindowLoad(id: string) {
    const pending = loadingWindows.get(id);
    if (!pending) {
      return;
    }
    pending.controller.abort();
    loadingWindows.delete(id);
    const element = find(id);
    if (element) {
      element.dataset.loadState = "idle";
      element.removeAttribute("aria-busy");
    }
  }
  async function loadWindow(element: HTMLElement) {
    const id = element.dataset.window;
    if (!id || !element.dataset.loadState) {
      return;
    }
    const pending = loadingWindows.get(id);
    if (pending) {
      return pending.result;
    }
    const statusError = showWindowStatus(element);
    if (statusError) {
      console.warn(statusError);
      return;
    }
    applyWindow(element);
    element.dataset.loadState = "loading";
    const controller = new AbortController();
    const loadSignal = controller.signal;
    signal.addEventListener("abort", () => controller.abort(), { once: true, signal: loadSignal });
    const load = async () => {
      const content = await fetchWindow(id, loadSignal);
      if (loadSignal.aborted) {
        return;
      }
      if (content instanceof Error) {
        return new Error(`Could not load ${id}`, { cause: content });
      }
      const contentError = installWindowContent(element, content);
      if (contentError) {
        return new Error(`Could not display ${id}`, { cause: contentError });
      }
      applyWindow(element);
      if (id === "trash") {
        const [error, module] = await safeWrapAsync(() => import("./trash"));
        if (error) {
          return new Error("Could not load Trash", { cause: error });
        }
        if (loadSignal.aborted) {
          return;
        }
        renderTrash = module.initTrash(loadSignal, restoreTrashItem);
        showTrash();
      }
      const error = await prepareWindow(element, loadSignal);
      if (error) {
        return new Error(`Could not initialize ${id}`, { cause: error });
      }
    };
    const finish = async () => {
      const error = await load();
      if (loadSignal.aborted) {
        return;
      }
      loadingWindows.delete(id);
      element.removeAttribute("aria-busy");
      if (error) {
        controller.abort();
        console.warn(error);
        element.dataset.loadState = "error";
        const statusError = showWindowStatus(element, true);
        if (statusError) {
          console.warn(statusError);
        }
        applyWindow(element);
        return;
      }
      delete element.dataset.loadState;
      syncAppEntries();
      if (!element.hidden && !isTrashed(id)) {
        loadFrame(element);
        if (frontWindow() === element) {
          updateSaveMenu(element);
          if (id === "terminal") {
            element.querySelector<HTMLInputElement>("input")?.focus();
          }
        }
      }
    };
    const result = finish();
    loadingWindows.set(id, { controller, result });
    return result;
  }
  async function open(id: string) {
    if (isTrashed("main") || isTrashed(id)) {
      return;
    }
    const element = ensureWindow(id);
    if (element instanceof Error) {
      console.warn(element);
      return;
    }
    const entry = state.windows[id];
    if (!entry) {
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
    if (id === "new-file") {
      element.querySelector<HTMLInputElement>("input")?.select();
    }
    if (element.dataset.loadState) {
      await loadWindow(element);
      return;
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
    cancelWindowLoad(id);
    poofWindow(element, origin);
    state.windows[id] = {
      ...createWindowState(id, initial),
      closed: true,
      placed: false,
      zoomed: false,
    };
    element.querySelector<HTMLIFrameElement>("[data-app-frame]")?.removeAttribute("src");
    applyWindow(element);
    if (routes[id] === window.location.pathname) {
      updateLocation("/");
    }
    saveState();
    const next = frontWindow();
    updateSaveMenu(next);
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
  function iconPosition(element: HTMLElement) {
    const id = element.dataset.desktopIcon ?? "home";
    const gridIndex = Math.max(0, regularIcons.indexOf(element));
    const rows = Math.max(1, Math.floor((window.innerHeight - 100) / 91));
    let fallback = { x: window.innerWidth - 99 - Math.floor(gridIndex / rows) * 91, y: 60 + (gridIndex % rows) * 91 };
    if (compact()) {
      const columns = Math.max(1, Math.min(6, regularIcons.length));
      fallback = {
        x: 4 + (gridIndex % columns) * ((window.innerWidth - 10) / columns),
        y: 39 + Math.floor(gridIndex / columns) * 74,
      };
    }
    if (element.hasAttribute("data-hidden-icon")) {
      const offset = hiddenIcons.indexOf(element) * 91;
      fallback = { x: 16, y: window.innerHeight - 88 - offset };
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
        let overTrash = false;
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
            item.icon.style.zIndex = "20000";
            state.icons[item.icon.dataset.desktopIcon ?? "home"] = { x: groupX, y: groupY };
          }
          const target = document
            .elementsFromPoint(move.clientX, move.clientY)
            .find((candidate) => !candidate.closest("[data-desktop-icon]"));
          overTrash = Boolean(target?.closest('[data-trash-can], [data-window="trash"]'));
          trashCan?.classList.toggle("is-trash-target", overTrash);
          find("trash")?.classList.toggle("is-trash-target", overTrash);
        };
        const finish = (endEvent?: PointerEvent) => {
          handle.removeEventListener("pointermove", onMove);
          handle.removeEventListener("pointerup", finish);
          handle.removeEventListener("pointercancel", finish);
          if (handle.hasPointerCapture(event.pointerId)) {
            handle.releasePointerCapture(event.pointerId);
          }
          document.body.classList.remove("dragging");
          trashCan?.classList.remove("is-trash-target");
          find("trash")?.classList.remove("is-trash-target");
          for (const item of group) {
            item.icon.style.removeProperty("z-index");
            if (moved && overTrash && endEvent?.type === "pointerup") {
              trashIcon(item.icon);
            }
          }
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
  function setupWindow(element: HTMLElement) {
    applyWindow(element);
    element.addEventListener("pointerdown", () => bringForward(element), { signal });
    const titlebar = element.querySelector<HTMLElement>("[data-window-drag]");
    if (!titlebar) {
      return;
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
  windows.forEach(setupWindow);
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
  icons.forEach((element) => {
    applyIconVisibility(element);
    iconPosition(element);
    setupDrag(element, element, "icon");
  });

  function reset() {
    for (const id of loadingWindows.keys()) {
      cancelWindowLoad(id);
    }
    crashScreen?.close();
    const backgroundError = saveBackgroundColor(null);
    if (backgroundError) {
      console.warn(backgroundError);
    }
    document.dispatchEvent(new Event("desktop:cleanup"));
    for (const element of windows) {
      element.querySelector<HTMLIFrameElement>("[data-app-frame]")?.removeAttribute("src");
    }
    state = emptyDesktopState();
    state.showHidden = showHidden;
    initial = "main";
    windows.forEach(applyWindow);
    icons.forEach((icon) => {
      icon.classList.remove("is-selected");
      applyIconVisibility(icon);
      iconPosition(icon);
    });
    showTrash();
    syncAppEntries();
    updateLocation("/");
    const home = find("main");
    if (home) {
      bringForward(home);
      return;
    }
    saveState();
  }
  initDesktopInteractions(signal, { open, close, shade, zoom, reset, isAvailable: (id) => !isTrashed(id) }, icons);

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
        if (button.hasAttribute("data-save-file")) {
          saveFile();
        }
        if (button.dataset.close) {
          close(button.dataset.close, poofOrigin(event));
        }
        if (button.dataset.windowRetry) {
          open(button.dataset.windowRetry);
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
        if (button.hasAttribute("data-desktop-exit")) {
          window.close();
          const heading = document.querySelector("#info-title");
          const content = document.querySelector("[data-info-content]");
          if (heading && content) {
            heading.textContent = "Close tab";
            content.textContent = "This browser requires you to close this tab yourself. Use its Close Tab command.";
            open("info");
          }
        }
      }
      const anchor = target?.closest<HTMLAnchorElement>("a[href]");
      if (anchor && anchor.origin === window.location.origin && !anchor.hash && !event.metaKey && !event.ctrlKey) {
        const route = anchor.pathname.replace(/\/$/, "") || "/";
        const application = getRouteWindow(route);
        if (application && (availableWindows.has(application) || find(application))) {
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
      if (isTrashed("main")) {
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "p") {
        event.preventDefault();
        printCv();
        return;
      }
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "s" &&
        frontWindow()?.hasAttribute("data-saveable")
      ) {
        event.preventDefault();
        saveFile();
        return;
      }
      if (event.metaKey && event.shiftKey && !event.altKey && !event.ctrlKey && event.code === "Period") {
        event.preventDefault();
        if (event.repeat) {
          return;
        }
        showHidden = !showHidden;
        state.showHidden = showHidden;
        for (const icon of hiddenIcons) {
          applyIconVisibility(icon);
          icon.classList.remove("is-selected");
        }
        saveState();
        return;
      }
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
    if (!initialElement || initialElement.hidden) {
      updateLocation("/");
      return;
    }
    bringForward(initialElement);
  }
  function restoreWindow(id: string) {
    const element = ensureWindow(id);
    if (element instanceof Error) {
      console.warn(element);
      return;
    }
    void loadWindow(element);
  }
  for (const [id, entry] of Object.entries(state.windows)) {
    if (!entry.closed && !find(id) && availableWindows.has(id) && !isTrashed("main") && !isTrashed(id)) {
      void restoreWindow(id);
    }
  }
  focusInitialWindow();
  showTrash();
  syncAppEntries();
  showCrashScreen();
  saveState();
  document.documentElement.classList.remove("desktop-starting");
  return {
    open,
    close,
    removeTextFiles: () => {
      for (const element of [...windows]) {
        const id = element.dataset.window ?? "";
        if (!id.startsWith("file-")) {
          continue;
        }
        observer.unobserve(element);
        windows.splice(windows.indexOf(element), 1);
        delete state.windows[id];
        element.remove();
      }
      for (const icon of [...icons]) {
        const id = icon.dataset.desktopIcon ?? "";
        if (!id.startsWith("file-")) {
          continue;
        }
        icons.splice(icons.indexOf(icon), 1);
        const index = regularIcons.indexOf(icon);
        if (index >= 0) {
          regularIcons.splice(index, 1);
        }
        delete state.icons[id];
        icon.remove();
      }
    },
    registerWindow,
    registerIcon: (element: HTMLElement) => {
      if (icons.includes(element)) {
        return;
      }
      icons.push(element);
      regularIcons.push(element);
      applyIconVisibility(element);
      iconPosition(element);
      setupDrag(element, element, "icon");
      showTrash();
    },
    cleanup: () => {
      activeDrag?.();
      observer.disconnect();
      clearTimeout(resizeTimer);
      saveState();
    },
  };
}
