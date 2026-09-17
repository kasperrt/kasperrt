import { nextMenuIndex } from "./events";

export function initDesktopMenus(signal: AbortSignal) {
  const menus = Array.from(document.querySelectorAll<HTMLDetailsElement>(".desktop-menu"));
  for (const menu of menus) {
    const summary = menu.querySelector("summary");
    const items = menu.querySelector<HTMLElement>(".desktop-menu-items");
    const submenu = menu.querySelector<HTMLDetailsElement>(".desktop-submenu");
    const submenuItems = submenu?.querySelector<HTMLElement>(".desktop-submenu-items");
    const submenuSummary = submenu?.querySelector("summary");
    function openSubmenu() {
      if (!submenu || !submenuItems || !items) {
        return;
      }
      submenu.open = true;
      const parent = items.getBoundingClientRect();
      const row = submenu.getBoundingClientRect();
      const width = submenuItems.offsetWidth;
      let preferred = parent.left - width + 1;
      if (parent.right + width <= window.innerWidth - 4) {
        preferred = parent.right - 1;
      }
      submenuItems.style.left = `${Math.max(4, Math.min(preferred, window.innerWidth - width - 4))}px`;
      submenuItems.style.top = `${Math.max(28, Math.min(row.top - 4, window.innerHeight - submenuItems.offsetHeight - 4))}px`;
    }
    menu.addEventListener(
      "pointerenter",
      () => {
        if (!menu.open && menus.some((other) => other.open)) {
          for (const other of menus) {
            other.open = other === menu;
          }
        }
      },
      { signal },
    );
    menu.addEventListener(
      "toggle",
      (event) => {
        if (event.target !== menu) {
          return;
        }
        if (!menu.open) {
          if (submenu) {
            submenu.open = false;
          }
          return;
        }
        for (const other of menus) {
          if (other !== menu) {
            other.open = false;
          }
        }
        if (items) {
          items.style.marginLeft = "0px";
          const rect = items.getBoundingClientRect();
          items.style.marginLeft = `${Math.max(4 - rect.left, Math.min(0, window.innerWidth - rect.right - 4))}px`;
        }
      },
      { signal },
    );
    submenu?.addEventListener("pointerenter", openSubmenu, { signal });
    submenuSummary?.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        openSubmenu();
      },
      { signal },
    );
    items?.addEventListener(
      "pointerover",
      (event) => {
        if (submenu && event.target instanceof Element && !event.target.closest(".desktop-submenu")) {
          submenu.open = false;
        }
      },
      { signal },
    );
    menu.addEventListener(
      "keydown",
      (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }
        if (target === summary && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
          event.preventDefault();
          const next = menus[nextMenuIndex(menus.indexOf(menu), menus.length, event.key)];
          if (!next) {
            return;
          }
          menu.open = false;
          next.open = true;
          next.querySelector("summary")?.focus();
          return;
        }
        if (target === submenuSummary && event.key === "ArrowRight") {
          event.preventDefault();
          openSubmenu();
          submenuItems?.querySelector<HTMLButtonElement>("button")?.focus();
          return;
        }
        if (submenu?.open && target.closest(".desktop-submenu") && ["ArrowLeft", "Escape"].includes(event.key)) {
          event.preventDefault();
          event.stopPropagation();
          submenu.open = false;
          submenuSummary?.focus();
          return;
        }
        if (!["ArrowDown", "ArrowUp"].includes(event.key)) {
          return;
        }
        event.preventDefault();
        menu.open = true;
        const withinSubmenu = target.closest(".desktop-submenu-items");
        const choices = Array.from(
          (withinSubmenu ?? items)?.querySelectorAll<HTMLElement>("a, button, summary") ?? [],
        ).filter((item) => withinSubmenu || !item.closest(".desktop-submenu-items"));
        const index = choices.indexOf(target);
        const nextIndex = nextMenuIndex(index, choices.length, event.key);
        choices[nextIndex]?.focus();
      },
      { signal },
    );
  }
}
