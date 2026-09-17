import { eventElement } from "./events";

type RestoreItem = (id: string) => void;

function containsPoint(rect: DOMRect, event: PointerEvent) {
  return (
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom
  );
}

export function initTrash(signal: AbortSignal, restoreItem: RestoreItem) {
  const list = document.querySelector<HTMLElement>("[data-trash-list]");
  const windowElement = list?.closest<HTMLElement>("[data-window]");
  const trashCan = document.querySelector<HTMLElement>("[data-trash-can]");
  let cancelDrag: (() => void) | undefined;

  list?.addEventListener(
    "pointerdown",
    (event) => {
      const item = eventElement(event)?.closest<HTMLButtonElement>("[data-trash-item]");
      const id = item?.dataset.trashItem;
      if (event.button !== 0 || !item || !id || !windowElement) {
        return;
      }
      event.preventDefault();
      cancelDrag?.();
      item.focus({ preventScroll: true });
      item.setPointerCapture(event.pointerId);
      let ghost: HTMLElement | undefined;
      const start = { x: event.clientX, y: event.clientY };
      const move = (pointer: PointerEvent) => {
        if (!ghost && Math.hypot(pointer.clientX - start.x, pointer.clientY - start.y) < 5) {
          return;
        }
        if (!ghost) {
          ghost = item.cloneNode(true) as HTMLElement;
          ghost.classList.add("fixed", "pointer-events-none", "z-20000", "w-24", "opacity-75");
          ghost.setAttribute("aria-hidden", "true");
          ghost.tabIndex = -1;
          document.body.append(ghost);
          document.body.classList.add("dragging");
        }
        ghost.style.left = `${pointer.clientX - ghost.offsetWidth / 2}px`;
        ghost.style.top = `${pointer.clientY - 20}px`;
      };
      const finish = (pointer?: PointerEvent) => {
        const moved = Boolean(ghost);
        ghost?.remove();
        document.body.classList.remove("dragging");
        item.removeEventListener("pointermove", move);
        item.removeEventListener("pointerup", finish);
        item.removeEventListener("pointercancel", finish);
        if (item.hasPointerCapture(event.pointerId)) {
          item.releasePointerCapture(event.pointerId);
        }
        cancelDrag = undefined;
        if (!moved || pointer?.type !== "pointerup" || containsPoint(windowElement.getBoundingClientRect(), pointer)) {
          return;
        }
        if (trashCan && containsPoint(trashCan.getBoundingClientRect(), pointer)) {
          return;
        }
        restoreItem(id);
      };
      cancelDrag = finish;
      item.addEventListener("pointermove", move);
      item.addEventListener("pointerup", finish);
      item.addEventListener("pointercancel", finish);
    },
    { signal },
  );
  list?.addEventListener("dragstart", (event) => event.preventDefault(), { signal });
  signal.addEventListener("abort", () => cancelDrag?.(), { once: true });

  return (icons: HTMLElement[], ids: string[]) => {
    if (!list) {
      return;
    }
    list.replaceChildren();
    if (ids.length === 0) {
      const empty = document.createElement("p");
      empty.className = "col-span-full";
      empty.textContent = "The trash is empty.";
      list.append(empty);
      return;
    }
    for (const id of ids) {
      const item = document.createElement("button");
      item.type = "button";
      item.dataset.trashItem = id;
      item.className =
        "flex min-w-0 touch-none cursor-grab flex-col items-center gap-2 text-center select-none focus-visible:outline-dotted";
      const icon = icons.find((candidate) => candidate.dataset.desktopIcon === id);
      const picture = icon?.querySelector("svg, .music-desktop-icon");
      if (picture) {
        item.append(picture.cloneNode(true));
      }
      const label = document.createElement("span");
      label.className = "max-w-full wrap-anywhere font-desktop text-xs";
      label.textContent = icon?.lastElementChild?.textContent ?? id;
      item.title = `Drag ${label.textContent} out of Trash to restore it.`;
      item.append(label);
      list.append(item);
    }
  };
}
