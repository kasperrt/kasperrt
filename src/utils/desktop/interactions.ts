import { desktopApps } from "../../data/desktop-apps";
import type { PoofOrigin } from "./poof";

type DesktopActions = {
  open: (id: string) => void;
  close: (id: string, origin?: PoofOrigin) => void;
  shade: (id: string) => void;
  zoom: (id: string) => void;
  reset: () => void;
};
type MenuItem = { label: string; action: (origin?: PoofOrigin) => void } | null;

export function initDesktopInteractions(signal: AbortSignal, actions: DesktopActions) {
  const menu = document.querySelector<HTMLElement>("[data-context-menu]");
  const box = document.querySelector<HTMLElement>("[data-selection-box]");
  const icons = Array.from(document.querySelectorAll<HTMLElement>("[data-desktop-icon]"));
  let finishSelection: (() => void) | undefined;
  let priorFocus: HTMLElement | null = null;
  const descriptions: Record<string, [string, string]> = {
    main: ["kasperrt.me", "Kasper Rynning-Tønnesen. Oslo, Norway."],
    projects: ["Projects", "Side projects: zoff, wiretyped, etys, swarm aid, and degen. Some more useful than others."],
    writing: ["Writing", "Notes about software. Occasionally opinionated."],
    cv: ["Curriculum Vitae", "The long version of 'I make software'."],
    terminal: [
      "Terminal",
      "A small browser shell, with a gnzh-inspired prompt. Try uptime. It has been running for a while.",
    ],
    music: ["Music Player", "The trip room on zoff.me. Shared music, shared questionable taste."],
    desktop: [
      "Desktop",
      "Pastel pink at midnight, lavender at noon. A slow daily loop on Oslo time.\n\nDrag to select. Drag the icons to rearrange them. Your layout is saved in this browser.",
    ],
  };
  for (const app of desktopApps) descriptions[app.id] = [app.title, app.description];
  function showInfo(title: string, text: string) {
    const heading = document.querySelector("#info-title");
    const content = document.querySelector("[data-info-content]");
    if (heading) heading.textContent = title;
    if (content) content.textContent = text;
    actions.open("info");
  }
  function hideMenu(restoreFocus = false) {
    if (menu) menu.hidden = true;
    if (restoreFocus) priorFocus?.focus();
  }
  function displayMenu(items: MenuItem[], x: number, y: number) {
    if (!menu) return;
    priorFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    menu.replaceChildren();
    for (const item of items) {
      if (!item) {
        const separator = document.createElement("hr");
        separator.setAttribute("role", "separator");
        menu.append(separator);
        continue;
      }
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("role", "menuitem");
      button.textContent = item.label;
      button.addEventListener(
        "click",
        (event) => {
          hideMenu();
          item.action(event.detail > 0 ? { x: event.clientX, y: event.clientY } : undefined);
        },
        { signal },
      );
      menu.append(button);
    }
    menu.hidden = false;
    const rect = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(0, Math.min(x, window.innerWidth - rect.width - 4))}px`;
    menu.style.top = `${Math.max(28, Math.min(y, window.innerHeight - rect.height - 4))}px`;
    menu.querySelector<HTMLButtonElement>("button")?.focus();
  }
  document.addEventListener(
    "contextmenu",
    (event) => {
      if (event.shiftKey || !menu) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target || target.closest("input, textarea, .desktop-menubar")) return;
      event.preventDefault();
      const icon = target.closest<HTMLElement>("[data-desktop-icon]");
      const windowElement = target.closest<HTMLElement>("[data-window]");
      const id = icon
        ? icon.dataset.desktopIcon === "home"
          ? "main"
          : (icon.dataset.desktopIcon ?? "main")
        : (windowElement?.dataset.window ?? "desktop");
      const description = descriptions[id] ?? [
        windowElement?.getAttribute("aria-label") ?? "Window",
        "A document on kasperrt.me.",
      ];
      const items: MenuItem[] = [];
      if (icon) {
        if (!icon.classList.contains("is-selected")) {
          icons.forEach((item) => {
            item.classList.toggle("is-selected", item === icon);
          });
        }
        items.push({ label: "Open", action: () => actions.open(id) });
      } else if (windowElement) {
        items.push(
          { label: "Bring to Front", action: () => actions.open(id) },
          { label: "Collapse / Expand", action: () => actions.shade(id) },
        );
        if (windowElement.classList.contains("document-window"))
          items.push({ label: "Zoom / Restore", action: () => actions.zoom(id) });
        items.push({ label: "Close Window", action: (origin) => actions.close(id, origin) });
      } else {
        items.push(
          { label: "Open Terminal", action: () => actions.open("terminal") },
          { label: "Play some music…", action: () => actions.open("music") },
          null,
          { label: "Clean Up Desktop", action: actions.reset },
        );
      }
      items.push(null, { label: "Get Info", action: () => showInfo(description[0], description[1]) });
      if (id === "desktop")
        items.push({
          label: "Eject reality…",
          action: () =>
            showInfo("Could not eject", "Reality is currently in use.\n\nTry listening to some music instead."),
        });
      displayMenu(items, event.clientX, event.clientY);
    },
    { signal },
  );
  document.addEventListener(
    "pointerdown",
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target?.closest("[data-context-menu]")) hideMenu();
      if (
        event.button !== 0 ||
        !box ||
        target?.closest("[data-window], [data-desktop-icon], .desktop-menubar, [data-context-menu], .skip-link")
      )
        return;
      event.preventDefault();
      const origin = { x: event.clientX, y: Math.max(28, event.clientY) };
      const previouslySelected = new Set(
        event.shiftKey ? icons.filter((icon) => icon.classList.contains("is-selected")) : [],
      );
      if (!event.shiftKey)
        icons.forEach((icon) => {
          icon.classList.remove("is-selected");
        });
      document.body.setPointerCapture(event.pointerId);
      const move = (pointer: PointerEvent) => {
        const left = Math.min(origin.x, pointer.clientX);
        const top = Math.max(28, Math.min(origin.y, pointer.clientY));
        const width = Math.abs(pointer.clientX - origin.x);
        const height = Math.abs(Math.max(28, pointer.clientY) - origin.y);
        box.hidden = false;
        Object.assign(box.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
        for (const icon of icons) {
          const rect = icon.getBoundingClientRect();
          const intersects =
            rect.right > left && rect.left < left + width && rect.bottom > top && rect.top < top + height;
          icon.classList.toggle("is-selected", intersects || previouslySelected.has(icon));
        }
      };
      const finish = () => {
        box.hidden = true;
        document.body.removeEventListener("pointermove", move);
        document.body.removeEventListener("pointerup", finish);
        document.body.removeEventListener("pointercancel", finish);
        if (document.body.hasPointerCapture(event.pointerId)) document.body.releasePointerCapture(event.pointerId);
        finishSelection = undefined;
      };
      finishSelection?.();
      finishSelection = finish;
      document.body.addEventListener("pointermove", move);
      document.body.addEventListener("pointerup", finish);
      document.body.addEventListener("pointercancel", finish);
    },
    { signal },
  );
  menu?.addEventListener(
    "pointerover",
    (event) => {
      const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button") : null;
      button?.focus({ preventScroll: true });
    },
    { signal },
  );
  menu?.addEventListener(
    "keydown",
    (event) => {
      const buttons = Array.from(menu.querySelectorAll<HTMLButtonElement>("button"));
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        buttons[(index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length]?.focus();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        hideMenu(true);
      }
      if (event.key === "Tab") hideMenu();
    },
    { signal },
  );
  signal.addEventListener(
    "abort",
    () => {
      finishSelection?.();
      hideMenu();
    },
    { once: true },
  );
}
