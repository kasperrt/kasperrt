import type { Position } from "./state";

export function eventElement(event: Event) {
  if (event.target instanceof Element) {
    return event.target;
  }
  return null;
}

export function arrowOffset(key: string, step: number): Position {
  switch (key) {
    case "ArrowLeft":
      return { x: -step, y: 0 };
    case "ArrowRight":
      return { x: step, y: 0 };
    case "ArrowUp":
      return { x: 0, y: -step };
    case "ArrowDown":
      return { x: 0, y: step };
    default:
      return { x: 0, y: 0 };
  }
}

export function nextMenuIndex(current: number, count: number, key: string) {
  if (count === 0) {
    return -1;
  }
  if (key === "ArrowUp" || key === "ArrowLeft") {
    if (current < 0) {
      return count - 1;
    }
    return (current - 1 + count) % count;
  }
  return (current + 1) % count;
}
