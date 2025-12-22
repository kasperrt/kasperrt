type RotateElement = {
  element: HTMLElement;
  multiplier: number;
  shadowMultiplier: number | null;
};

export function getRotateElements(): RotateElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-rotate]"))
    .map((element) => {
      const multiplier = Number(element.getAttribute("data-rotate")) || 1;
      const shadowMultiplier = element.getAttribute("data-shadow-multiplier");
      return {
        element,
        multiplier,
        shadowMultiplier: shadowMultiplier ? Number(shadowMultiplier) : null,
      };
    })
    .filter(({ element }) => element instanceof HTMLElement);
}

export function rotateElement(
  el: HTMLElement,
  left: number,
  top: number,
  shadowMultiplier: number | null
) {
  el.style.transform = `translate(${left}px, ${top}px)`;

  if (!shadowMultiplier) {
    return;
  }

  el.style.boxShadow = `${left * shadowMultiplier}px ${
    top * shadowMultiplier
  }px var(--image-shadow-color)`;
}
