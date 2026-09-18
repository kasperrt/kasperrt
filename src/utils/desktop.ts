import { initDesktop } from "./desktop/windows";
import { initDocuments } from "./desktop/documents";
import { safeWrapAsync } from "./wrap";

let cleanup: (() => void) | undefined;

function initDesktopApplication() {
  cleanup?.();
  if (!document.querySelector("[data-window]")) {
    return;
  }
  const controller = new AbortController();
  const { signal } = controller;
  let pendingUptime = false;
  let terminalRun: ((command: string) => void) | undefined;
  const desktop = initDesktop(signal, async (element, windowSignal) => {
    const id = element.dataset.window;
    if (id === "terminal") {
      const [error, module] = await safeWrapAsync(() => import("./desktop/terminal"));
      if (error) {
        return new Error("Could not load the terminal", { cause: error });
      }
      if (windowSignal.aborted) {
        return;
      }
      terminalRun = module.initTerminal(windowSignal, desktop);
      windowSignal.addEventListener(
        "abort",
        () => {
          terminalRun = undefined;
          pendingUptime = false;
        },
        { once: true },
      );
      if (pendingUptime) {
        terminalRun("uptime");
        pendingUptime = false;
      }
    }
    if (id === "music") {
      const [error, module] = await safeWrapAsync(() => import("./desktop/music"));
      if (error) {
        return new Error("Could not load the music player", { cause: error });
      }
      if (windowSignal.aborted) {
        return;
      }
      module.initMusicPlayer(windowSignal);
    }
    if (id === "env") {
      const [error, module] = await safeWrapAsync(() => import("./desktop/environment"));
      if (error) {
        return new Error("Could not load the environment editor", { cause: error });
      }
      if (windowSignal.aborted) {
        return;
      }
      module.initEnvironmentFile(windowSignal);
    }
  });
  initDocuments(signal, desktop);
  document.querySelector("[data-uptime-open]")?.addEventListener(
    "click",
    () => {
      if (terminalRun) {
        terminalRun("uptime");
        return;
      }
      pendingUptime = true;
    },
    { signal },
  );
  const clockFormat = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Oslo",
    hour: "2-digit",
    minute: "2-digit",
  });
  const clocks = document.querySelectorAll("[data-clock]");
  let clockTimer = 0;
  function updateClock() {
    const now = new Date();
    for (const clock of clocks) {
      clock.textContent = clockFormat.format(now);
    }
    clearTimeout(clockTimer);
    if (!document.hidden) {
      clockTimer = window.setTimeout(updateClock, 60000 - (now.getSeconds() * 1000 + now.getMilliseconds()));
    }
  }
  document.addEventListener("visibilitychange", updateClock, { signal });
  updateClock();
  document.addEventListener(
    "input",
    (event) => {
      const search = event.target;
      if (!(search instanceof HTMLInputElement) || !search.hasAttribute("data-project-search")) {
        return;
      }
      let count = 0;
      for (const record of document.querySelectorAll<HTMLElement>("[data-project-record]")) {
        record.hidden = !record.dataset.projectRecord?.includes(search.value.trim().toLowerCase());
        if (!record.hidden) {
          count++;
        }
      }
      const label = document.querySelector("[data-project-count]");
      let projectLabel = "projects";
      if (count === 1) {
        projectLabel = "project";
      }
      if (label) {
        label.textContent = `${count} ${projectLabel}`;
      }
      const empty = document.querySelector<HTMLElement>("[data-project-empty]");
      if (empty) {
        empty.hidden = count > 0;
      }
    },
    { signal },
  );
  cleanup = () => {
    controller.abort();
    clearTimeout(clockTimer);
    desktop.cleanup();
  };
}
initDesktopApplication();
