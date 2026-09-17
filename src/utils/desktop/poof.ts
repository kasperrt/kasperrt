const svgNamespace = "http://www.w3.org/2000/svg";

export type PoofOrigin = { x: number; y: number };

export function poofWindow(element: HTMLElement, origin?: PoofOrigin) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const rect = (element.querySelector("[data-close]") ?? element).getBoundingClientRect();
  const cloud = document.createElement("div");
  cloud.className = "window-poof";
  cloud.setAttribute("aria-hidden", "true");
  Object.assign(cloud.style, {
    left: `${origin?.x ?? rect.left + rect.width / 2}px`,
    top: `${origin?.y ?? rect.top + rect.height / 2}px`,
    zIndex: "9999",
  });
  const pixels = [
    ["M7 0H14V2H17V4H20V6H22V12H20V14H16V16H5V14H2V12H0V6H2V4H5V2H7Z", "#171421"],
    ["M7 2H14V4H17V6H20V12H16V14H5V12H2V6H5V4H7Z", "#fff"],
    ["M5 5H7V7H5ZM15 8H17V10H15Z", "#171421"],
  ];
  for (const [index, [dx, dy, size]] of [
    [-12, -8, 22],
    [12, -8, 22],
    [0, 4, 33],
  ].entries()) {
    const puff = document.createElementNS(svgNamespace, "svg");
    puff.setAttribute("viewBox", "0 0 22 16");
    puff.setAttribute("shape-rendering", "crispEdges");
    puff.classList.add("poof-puff");
    puff.style.setProperty("--puff-x", `${dx}px`);
    puff.style.setProperty("--puff-y", `${dy}px`);
    puff.style.width = `${size}px`;
    puff.style.animationDelay = `${index * 20}ms`;
    for (const [outline, fill] of pixels) {
      const shape = document.createElementNS(svgNamespace, "path");
      shape.setAttribute("d", outline);
      shape.setAttribute("fill", fill);
      puff.append(shape);
    }
    cloud.append(puff);
  }
  document.body.append(cloud);
  window.setTimeout(() => cloud.remove(), 400);
}
