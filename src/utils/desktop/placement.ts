export interface ViewportSize {
  width: number;
  height: number;
}
export interface WindowRect extends ViewportSize {
  x: number;
  y: number;
}

function overlapArea(a: WindowRect, b: WindowRect) {
  return (
    Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))
  );
}

/** Prefer free desktop space, and heavily penalize hiding another window's title bar. */
export function chooseWindowPosition(width: number, height: number, viewport: ViewportSize, visible: WindowRect[]) {
  const maxX = Math.max(8, viewport.width - width - 12);
  const maxY = Math.max(36, viewport.height - height - 12);
  const xs = new Set([12, Math.round(maxX / 2), maxX]);
  const ys = new Set([48, maxY]);
  for (const window of visible) {
    xs.add(Math.min(maxX, window.x + 30));
    ys.add(Math.min(maxY, window.y + 55));
    ys.add(Math.min(maxY, window.y + window.height + 14));
  }
  let best = { x: 12, y: 48 };
  let bestScore = Number.POSITIVE_INFINITY;
  for (const xValue of xs) {
    for (const yValue of ys) {
      const x = Math.max(8, Math.min(xValue, maxX));
      const y = Math.max(36, Math.min(yValue, maxY));
      const candidate = { x, y, width, height };
      let score = y / 10000 + x / 100000;
      for (const window of visible) {
        score += overlapArea(candidate, window) / (width * height);
        score += (8 * overlapArea(candidate, { ...window, height: 26 })) / (window.width * 26);
        if (Math.abs(y - window.y) < 30) {
          score += 2;
        }
      }
      if (score < bestScore) {
        bestScore = score;
        best = { x, y };
      }
    }
  }
  return best;
}
