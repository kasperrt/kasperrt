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
  { element, tiltMultiplier, shadowMultiplier }: Pick<RotateElement, "element" | "shadowMultiplier" | "tiltMultiplier">,
  left: number,
  top: number,
) {
  const maxTilt = 12;
  const tiltX = tiltMultiplier ? Math.max(-maxTilt, Math.min(maxTilt, -top * tiltMultiplier)) : 0;
  const tiltY = tiltMultiplier ? Math.max(-maxTilt, Math.min(maxTilt, left * tiltMultiplier)) : 0;

  element.style.transform = `perspective(1000px) translate(${left}px, ${top}px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;

  if (!shadowMultiplier) {
    return;
  }

  element.style.boxShadow = `${left * shadowMultiplier}px ${top * shadowMultiplier}px var(--image-shadow-color)`;
}
