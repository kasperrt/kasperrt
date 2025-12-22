type RotateElement = {
  element: HTMLElement;
  multiplier: number;
  shadowMultiplier: number | null;
  tiltMultiplier: number | null;
};

export function getRotateElements(): RotateElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-rotate]"))
    .map((element) => {
      const multiplier = Number(element.getAttribute("data-rotate")) || 1;
      const shadowMultiplier = element.getAttribute("data-shadow-multiplier");
      const tiltMultiplier = element.getAttribute("data-tilt-multiplier");

      return {
        element,
        multiplier,
        shadowMultiplier: shadowMultiplier ? Number(shadowMultiplier) : null,
        tiltMultiplier: tiltMultiplier ? Number(tiltMultiplier) : null,
      };
    })
    .filter(({ element }) => element instanceof HTMLElement);
}

export function rotateElement(
  el: HTMLElement,
  left: number,
  top: number,
  shadowMultiplier: number | null,
  tiltMultiplier: number | null
) {
  const maxTilt = 12;
  const tiltX = tiltMultiplier
    ? Math.max(-maxTilt, Math.min(maxTilt, -top * tiltMultiplier))
    : 0;
  const tiltY = tiltMultiplier
    ? Math.max(-maxTilt, Math.min(maxTilt, left * tiltMultiplier))
    : 0;

  el.style.transform = `perspective(1000px) translate3d(${left}px, ${top}px, 0) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;

  if (!shadowMultiplier) {
    return;
  }

  el.style.boxShadow = `${left * shadowMultiplier}px ${
    top * shadowMultiplier
  }px var(--image-shadow-color)`;
}
