import type { ConsoleCommand, ConsoleLine } from "~/utils/console";

export type LinkRect = {
  href: string;
  external: boolean;
  rect: { x: number; y: number; w: number; h: number };
};

export type Console2dState = {
  title: string;
  asciiLines: string[];
  introLines: string[];
  commands: ConsoleLine[];
  input: string;
  loading: boolean;
  partial: boolean;
  scrollY: number;
};

type Console2dRenderResult = {
  linkRects: LinkRect[];
  contentHeight: number;
  viewportHeight: number;
};

type CreateProps = {
  canvas: HTMLCanvasElement;
};

const MONO_STACK = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

const COLORS = {
  screen: "#374151", // tailwind gray-700
  border: "#ffffff",
  text: "#ffffff",
  cyan: "#67e8f9", // close to cyan-300
  red: "#f87171", // close to red-400
  dim: "rgba(255,255,255,0.75)",
  // Opaque canvas: use a solid clear color to avoid darkening accumulation on redraw.
  backdrop: "#000000",
};

function isLink(value: ConsoleCommand): value is string {
  return (
    typeof value === "string" &&
    (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("mailto:"))
  );
}

function isExternalLink(value: string) {
  return value.startsWith("http://") || value.startsWith("https://");
}

function isUptime(value: ConsoleCommand): value is { type: "uptime" } {
  return typeof value === "object" && value !== null && value.type === "uptime";
}

const spinnerIcons: string[] = ["-", "\\", "|", "/"];

function getSpinnerChar(nowMs: number) {
  const idx = Math.floor(nowMs / 100) % spinnerIcons.length;
  return spinnerIcons[idx] ?? "-";
}

const birthDate = new Date(1993, 7, 29, 0, 0, 0);
function formatAliveDuration(now: Date) {
  const currentBirthday = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  const hasHadBirthday = now >= currentBirthday;
  let years = now.getFullYear() - birthDate.getFullYear();
  if (!hasHadBirthday) {
    years -= 1;
  }

  let lastBirthdayYear = now.getFullYear();
  if (!hasHadBirthday) {
    lastBirthdayYear -= 1;
  }
  const lastBirthday = new Date(lastBirthdayYear, birthDate.getMonth(), birthDate.getDate());
  const diffMs = Math.max(0, now.getTime() - lastBirthday.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const time = [hours, minutes, seconds].map((v) => String(v).padStart(2, "0")).join(":");

  return `${years}y ${days}d ${time}`;
}

function measureCharWidth(ctx: CanvasRenderingContext2D) {
  const m = ctx.measureText("M");
  return m.width || 10;
}

function splitGraphemes(s: string): string[] {
  // For our use (ASCII-ish console), splitting by code units is OK.
  return s.split("");
}

function wrapTextToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (!text) return [""];
  const out: string[] = [];
  const words = text.split(/(\s+)/);

  let line = "";
  for (const part of words) {
    const next = line + part;
    if (ctx.measureText(next).width <= maxWidth || line === "") {
      line = next;
      continue;
    }

    // If a single "word" is too wide, hard-break it.
    if (ctx.measureText(part).width > maxWidth) {
      if (line) out.push(line.replace(/\s+$/g, ""));
      line = "";

      let chunk = "";
      for (const ch of splitGraphemes(part)) {
        const cNext = chunk + ch;
        if (ctx.measureText(cNext).width <= maxWidth || chunk === "") {
          chunk = cNext;
        } else {
          out.push(chunk);
          chunk = ch;
        }
      }
      line = chunk;
      continue;
    }

    out.push(line.replace(/\s+$/g, ""));
    line = part.trimStart();
  }

  if (line) out.push(line.replace(/\s+$/g, ""));
  return out.length ? out : [""];
}

type Segment =
  | { kind: "text"; text: string; color: string; bold?: boolean; italic?: boolean }
  | { kind: "link"; text: string; href: string; external: boolean; color: string };

type RenderLine = {
  label: string;
  segments: Segment[];
};

function cleanString(s: string) {
  if ((s.startsWith("*") && s.endsWith("*")) || (s.startsWith("_") && s.endsWith("_"))) {
    return s.substring(1, s.length - 1);
  }
  return s;
}

function getCommandText(value: ConsoleCommand): string {
  if (typeof value === "string") return value;
  return "";
}

function isItalicCommand(value: ConsoleCommand): boolean {
  const t = getCommandText(value);
  return t.startsWith("*") && t.endsWith("*");
}

function isBoldCommand(value: ConsoleCommand): boolean {
  const t = getCommandText(value);
  return t.startsWith("_") && t.endsWith("_");
}

function getLinkValue(value: ConsoleCommand): string | null {
  if (!isLink(value)) return null;
  const parts = value.split(" ");
  if (parts.length <= 1) return null;
  return parts[0] ?? null;
}

function getLinkSummary(value: ConsoleCommand): string | null {
  if (!isLink(value)) return null;
  const text = getCommandText(value);
  const parts = text.split(" ");
  if (parts.length <= 1) return null;
  return text.substring((parts[0] ?? "").length);
}

function commandToSegments(command: ConsoleCommand): Segment[] {
  if (isUptime(command)) {
    return [{ kind: "text", text: formatAliveDuration(new Date()), color: COLORS.text }];
  }

  if (isLink(command)) {
    const href = getLinkValue(command);
    if (!href) {
      return [{ kind: "text", text: cleanString(getCommandText(command)), color: COLORS.text }];
    }
    const summary = getLinkSummary(command) ?? "";
    const external = isExternalLink(href);
    const segs: Segment[] = [{ kind: "link", text: href, href, external, color: COLORS.red }];
    if (summary.trim()) {
      segs.push({ kind: "text", text: summary, color: COLORS.text });
    }
    return segs;
  }

  const text = cleanString(getCommandText(command));
  return [
    {
      kind: "text",
      text,
      color: COLORS.text,
      italic: isItalicCommand(command),
      bold: isBoldCommand(command),
    },
  ];
}

export function createConsole2dRenderer({ canvas }: CreateProps) {
  const ctx0 = canvas.getContext("2d", { alpha: false });
  if (!ctx0) {
    throw new Error("2D canvas context unavailable");
  }
  const ctx: CanvasRenderingContext2D = ctx0;

  let width = 1;
  let height = 1;
  let dpr = 1;

  // Layout
  let pad = 32;
  let border = 2;
  let titleH = 34;
  let promptH = 44;
  let fontSize = 16;
  let lineH = 22;
  const labelCols = 12;
  let charW = 10;

  // Content metrics
  let lastContentHeight = 0;
  let lastViewportHeight = 0;
  let scrollY = 0;
  let lastLinkRects: LinkRect[] = [];

  function setCanvasSize(w: number, h: number, nextDpr: number) {
    width = Math.max(1, Math.floor(w));
    height = Math.max(1, Math.floor(h));
    dpr = Math.max(1, nextDpr);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    pad = width < 640 ? 18 : 32;
    border = 2;
    titleH = width < 640 ? 28 : 34;
    promptH = width < 640 ? 40 : 44;
    fontSize = width < 640 ? 11 : 16;
    lineH = Math.round(fontSize * 1.35);

    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.font = `${fontSize}px ${MONO_STACK}`;
    charW = measureCharWidth(ctx);
  }

  function setScrollY(next: number) {
    scrollY = next;
  }

  function getViewportRect() {
    const x = pad + border + 16;
    const y = pad + border + titleH;
    const w = width - (pad + border) * 2 - 32;
    const h = height - (pad + border) * 2 - titleH - promptH - 12;
    return { x, y, w: Math.max(1, w), h: Math.max(1, h) };
  }

  function getPromptRect() {
    const x = pad + border + 16;
    const y = height - (pad + border) - promptH + 8;
    const w = width - (pad + border) * 2 - 32;
    const h = promptH - 16;
    return { x, y, w: Math.max(1, w), h: Math.max(1, h) };
  }

  function buildRenderLines(state: Console2dState): RenderLine[] {
    const lines: RenderLine[] = [];

    // ASCII art at top, then intro, then command output.
    for (const t of state.asciiLines) {
      lines.push({ label: "", segments: [{ kind: "text", text: t, color: COLORS.text }] });
    }
    for (const t of state.introLines) {
      lines.push({ label: "", segments: [{ kind: "text", text: t, color: COLORS.text }] });
    }

    for (const [label, command] of state.commands) {
      lines.push({ label, segments: commandToSegments(command) });
    }

    return lines;
  }

  function drawBackgroundAndFrame(title: string) {
    // Backdrop (modal feel).
    ctx.fillStyle = COLORS.backdrop;
    ctx.fillRect(0, 0, width, height);

    // Screen background.
    ctx.fillStyle = COLORS.screen;
    ctx.fillRect(pad, pad, width - pad * 2, height - pad * 2);

    // Frame border.
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = border;
    ctx.strokeRect(pad + border / 2, pad + border / 2, width - pad * 2 - border, height - pad * 2 - border);

    // Title "chip" at top center.
    const titleText = title;
    ctx.font = `${fontSize}px ${MONO_STACK}`;
    const tw = ctx.measureText(titleText).width;
    const chipPadX = 14;
    const chipH = width < 640 ? 22 : 24;
    const chipW = tw + chipPadX * 2;
    const chipX = (width - chipW) / 2;
    const chipY = pad + 6;

    ctx.fillStyle = COLORS.screen;
    ctx.fillRect(chipX, chipY, chipW, chipH);

    ctx.fillStyle = COLORS.text;
    ctx.fillText(titleText, chipX + chipPadX, chipY + 3);
  }

  function drawPrompt(state: Console2dState) {
    const { x, y, w, h } = getPromptRect();

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    const now = Date.now();
    const caretOn = Math.floor(now / 500) % 2 === 0;

    const prompt = "$ > ";
    let tail = "";
    if (state.loading) {
      tail = ` ${getSpinnerChar(now)}`;
    } else if (state.partial) {
      tail = ` ${getSpinnerChar(now)} (...press enter for next paragraph...) ${getSpinnerChar(now)}`;
    } else {
      tail = caretOn ? "_" : " ";
    }

    ctx.fillStyle = COLORS.text;
    ctx.font = `${fontSize}px ${MONO_STACK}`;
    ctx.fillText(prompt + state.input + tail, x, y);

    ctx.restore();
  }

  function render(state: Console2dState): Console2dRenderResult {
    lastLinkRects = [];

    // Clear and redraw frame.
    drawBackgroundAndFrame(state.title);

    const viewport = getViewportRect();
    lastViewportHeight = viewport.h;

    // Compute label column width ("12ch") and available text width.
    const labelW = Math.round(charW * labelCols);
    const gap = 16;
    const textW = Math.max(1, viewport.w - labelW - gap);

    const renderLines = buildRenderLines(state);

    // Layout all lines first to get content height.
    type LaidOut = {
      y: number;
      label: string;
      // Each wrapped line contains segments laid out left-to-right.
      wraps: Array<{ segments: Segment[] }>;
    };
    const laidOut: LaidOut[] = [];

    let yCursor = 0;
    for (const line of renderLines) {
      // Convert segments into wrapped lines with simple greedy wrapping by segment text.
      // Links are treated as atomic for wrapping (URL breaks are acceptable).
      const wrappedSegments: Segment[][] = [];

      let current: Segment[] = [];
      let currentW = 0;
      for (const seg of line.segments) {
        const segText = seg.text ?? "";
        const parts = wrapTextToWidth(ctx, segText, textW);

        for (let pIdx = 0; pIdx < parts.length; pIdx++) {
          const part = parts[pIdx] ?? "";
          const sPart: Segment = seg.kind === "link" ? { ...seg, text: part } : { ...seg, text: part };

          const wPart = ctx.measureText(part).width;

          // If this is a continuation of a wrapped segment, it must start on a new line.
          const isContinuation = parts.length > 1 && pIdx > 0;
          if (isContinuation) {
            if (current.length) wrappedSegments.push(current);
            current = [sPart];
            currentW = wPart;
            continue;
          }

          if (currentW + wPart <= textW || current.length === 0) {
            current.push(sPart);
            currentW += wPart;
          } else {
            wrappedSegments.push(current);
            current = [sPart];
            currentW = wPart;
          }
        }
      }
      if (current.length) wrappedSegments.push(current);
      if (wrappedSegments.length === 0) wrappedSegments.push([]);

      const wraps = wrappedSegments.map((segments) => ({ segments }));
      laidOut.push({ y: yCursor, label: line.label, wraps });
      yCursor += wraps.length * lineH;
    }

    lastContentHeight = yCursor;

    // Clip to viewport and draw visible portion based on scrollY.
    ctx.save();
    ctx.beginPath();
    ctx.rect(viewport.x, viewport.y, viewport.w, viewport.h);
    ctx.clip();

    // Clear inside (in case of transparency or previous frame artifacts).
    ctx.fillStyle = COLORS.screen;
    ctx.fillRect(viewport.x, viewport.y, viewport.w, viewport.h);

    const baseY = viewport.y - scrollY;
    for (const item of laidOut) {
      const itemTop = baseY + item.y;
      const itemBottom = itemTop + item.wraps.length * lineH;
      if (itemBottom < viewport.y - lineH) continue;
      if (itemTop > viewport.y + viewport.h + lineH) continue;

      for (let i = 0; i < item.wraps.length; i++) {
        const y = itemTop + i * lineH;
        const label = i === 0 ? item.label : "";

        // Label col
        if (label) {
          ctx.fillStyle = COLORS.cyan;
          ctx.fillText(label, viewport.x, y);
        }

        // Segments col
        let x = viewport.x + labelW + gap;
        for (const seg of item.wraps[i]?.segments ?? []) {
          if (!seg.text) continue;
          if (seg.kind === "text") {
            const style: string[] = [];
            if (seg.italic) style.push("italic");
            if (seg.bold) style.push("bold");
            const prefix = style.length ? `${style.join(" ")} ` : "";
            ctx.font = `${prefix}${fontSize}px ${MONO_STACK}`;
          } else {
            ctx.font = `${fontSize}px ${MONO_STACK}`;
          }

          ctx.fillStyle = seg.color;
          ctx.fillText(seg.text, x, y);

          const wSeg = ctx.measureText(seg.text).width;
          if (seg.kind === "link") {
            lastLinkRects.push({
              href: seg.href,
              external: seg.external,
              rect: { x, y, w: wSeg, h: lineH },
            });
          }
          x += wSeg;
        }
      }
    }

    ctx.restore();

    drawPrompt(state);

    return {
      linkRects: lastLinkRects,
      contentHeight: lastContentHeight,
      viewportHeight: lastViewportHeight,
    };
  }

  // Init to a sane size. Caller will resize on mount.
  setCanvasSize(1, 1, 1);

  return {
    resize(w: number, h: number, nextDpr: number) {
      setCanvasSize(w, h, nextDpr);
    },
    render,
    setScrollY,
    getContentHeight() {
      return lastContentHeight;
    },
    getViewportHeight() {
      return lastViewportHeight;
    },
    getViewportRect,
  };
}
