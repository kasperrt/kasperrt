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
  // Dark, phosphor-y green background.
  screen: "#5f8770",
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
  if (!text) {
    return [""];
  }
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
      if (line) {
        out.push(line.replace(/\s+$/g, ""));
      }
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

  if (line) {
    out.push(line.replace(/\s+$/g, ""));
  }
  return out.length ? out : [""];
}

type Segment =
  | { kind: "text"; text: string; color: string; bold?: boolean; italic?: boolean }
  | { kind: "link"; text: string; href: string; external: boolean; color: string }
  | { kind: "pre"; text: string; color: string };

type RenderLine = {
  label: string;
  segments: Segment[];
  reserveLabelCol: boolean;
};

function cleanString(s: string) {
  if ((s.startsWith("*") && s.endsWith("*")) || (s.startsWith("_") && s.endsWith("_"))) {
    return s.substring(1, s.length - 1);
  }
  return s;
}

function getCommandText(value: ConsoleCommand): string {
  if (typeof value === "string") {
    return value;
  }
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
  if (!isLink(value)) {
    return null;
  }
  const parts = value.split(" ");
  if (parts.length <= 1) {
    return null;
  }
  return parts[0] ?? null;
}

function getLinkSummary(value: ConsoleCommand): string | null {
  if (!isLink(value)) {
    return null;
  }
  const text = getCommandText(value);
  const parts = text.split(" ");
  if (parts.length <= 1) {
    return null;
  }
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

type LaidOut = {
  y: number;
  label: string;
  wraps: Array<{ segments: Segment[] }>;
  lineH: number;
  reserveLabelCol: boolean;
};

export class Console2dRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private width = 1;
  private height = 1;
  private dpr = 1;

  // Layout
  private pad = 32;
  private border = 2;
  private titleH = 34;
  private promptH = 44;
  private fontSize = 16;
  private lineH = 22;
  private asciiFontSize = 16;
  private preLineH = 22;
  private readonly labelCols = 12;
  private charW = 10;

  // Content metrics
  private lastContentHeight = 0;
  private lastViewportHeight = 0;
  private scrollY = 0;
  private lastLinkRects: LinkRect[] = [];

  public constructor({ canvas }: CreateProps) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      throw new Error("2D canvas context unavailable");
    }
    this.ctx = ctx;
    this.setCanvasSize(1, 1, 1);
  }

  private setCanvasSize(w: number, h: number, nextDpr: number): void {
    this.width = Math.max(1, Math.floor(w));
    this.height = Math.max(1, Math.floor(h));
    this.dpr = Math.max(1, nextDpr);

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // Layout and font sizing
    if (this.width < 480) {
      this.fontSize = 13;
      this.pad = 12;
    } else if (this.width < 640) {
      this.fontSize = 16;
      this.pad = 18;
    } else if (this.width < 1024) {
      this.fontSize = 20;
      this.pad = 24;
    } else {
      this.fontSize = 24;
      this.pad = 32;
    }

    this.border = 2;
    this.titleH = Math.round(this.fontSize * 2.2);
    this.promptH = Math.round(this.fontSize * 2.8);
    this.lineH = Math.round(this.fontSize * 1.5);

    // Keep ASCII header small on mobile
    this.asciiFontSize = this.width < 640 ? 10 : this.fontSize;
    this.preLineH = Math.round(this.asciiFontSize * 1.25);

    this.ctx.textBaseline = "top";
    this.ctx.textAlign = "left";
    this.ctx.font = `${this.fontSize}px ${MONO_STACK}`;
    this.charW = measureCharWidth(this.ctx);
  }

  resize(w: number, h: number, nextDpr: number): void {
    this.setCanvasSize(w, h, nextDpr);
  }

  setScrollY(next: number): void {
    this.scrollY = next;
  }

  getContentHeight(): number {
    return this.lastContentHeight;
  }

  getViewportHeight(): number {
    return this.lastViewportHeight;
  }

  getViewportRect(): { x: number; y: number; w: number; h: number } {
    const x = this.pad + this.border + 16;
    const y = this.pad + this.border + this.titleH;
    const w = this.width - (this.pad + this.border) * 2 - 32;
    const h = this.height - (this.pad + this.border) * 2 - this.titleH - this.promptH - 12;
    return { x, y, w: Math.max(1, w), h: Math.max(1, h) };
  }

  private getPromptRect(): { x: number; y: number; w: number; h: number } {
    const x = this.pad + this.border + 16;
    const y = this.height - (this.pad + this.border) - this.promptH + 8;
    const w = this.width - (this.pad + this.border) * 2 - 32;
    const h = this.promptH - 16;
    return { x, y, w: Math.max(1, w), h: Math.max(1, h) };
  }

  private buildRenderLines(state: Console2dState): RenderLine[] {
    const lines: RenderLine[] = [];

    for (const t of state.asciiLines) {
      lines.push({ label: "", segments: [{ kind: "pre", text: t, color: COLORS.text }], reserveLabelCol: false });
    }
    for (const t of state.introLines) {
      lines.push({ label: "", segments: [{ kind: "text", text: t, color: COLORS.text }], reserveLabelCol: false });
    }

    for (const [label, command] of state.commands) {
      lines.push({ label, segments: commandToSegments(command), reserveLabelCol: true });
    }

    return lines;
  }

  private drawBackgroundAndFrame(title: string): void {
    // Backdrop
    this.ctx.fillStyle = COLORS.backdrop;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Screen background
    this.ctx.fillStyle = COLORS.screen;
    this.ctx.fillRect(this.pad, this.pad, this.width - this.pad * 2, this.height - this.pad * 2);

    // Frame border
    this.ctx.strokeStyle = COLORS.border;
    this.ctx.lineWidth = this.border;
    this.ctx.strokeRect(
      this.pad + this.border / 2,
      this.pad + this.border / 2,
      this.width - this.pad * 2 - this.border,
      this.height - this.pad * 2 - this.border,
    );

    // Title chip at top center
    const titleText = title;
    this.ctx.font = `${this.fontSize}px ${MONO_STACK}`;
    const tw = this.ctx.measureText(titleText).width;
    const chipPadX = 14;
    const chipH = this.width < 640 ? 22 : 24;
    const chipW = tw + chipPadX * 2;
    const chipX = (this.width - chipW) / 2;
    const chipY = this.pad + 6;

    this.ctx.fillStyle = COLORS.screen;
    this.ctx.fillRect(chipX, chipY, chipW, chipH);

    this.ctx.fillStyle = COLORS.text;
    this.ctx.fillText(titleText, chipX + chipPadX, chipY + 3);
  }

  private drawPrompt(state: Console2dState): void {
    const { x, y, w, h } = this.getPromptRect();

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(x, y, w, h);
    this.ctx.clip();

    const now = Date.now();
    const caretOn = Math.floor(now / 500) % 2 === 0;

    const prompt = "$ > ";
    let tail = "";
    if (state.loading) {
      tail = ` ${getSpinnerChar(now)}`;
    } else if (state.partial) {
      tail = ` ${getSpinnerChar(now)} (...press enter for next paragraph...) ${getSpinnerChar(now)}`;
    }

    this.ctx.fillStyle = COLORS.text;
    this.ctx.font = `${this.fontSize}px ${MONO_STACK}`;
    this.ctx.fillText(prompt + state.input + tail, x, y);

    // Block cursor when idle
    if (!state.loading && !state.partial && caretOn) {
      const promptW = this.ctx.measureText(prompt).width;
      const caretX = Math.round(x + promptW + state.input.length * this.charW);
      const caretW = Math.max(6, Math.round(this.charW));
      const caretH = Math.max(10, Math.round(this.lineH * 0.92));

      const visualShift = Math.round(this.fontSize * 0.35);
      const caretOffset = (caretH - this.fontSize) / 2 + visualShift;

      this.ctx.save();
      this.ctx.globalAlpha = 0.95;
      this.ctx.fillStyle = COLORS.text;
      this.ctx.fillRect(caretX, y - caretOffset, caretW, caretH);
      this.ctx.restore();
    }

    this.ctx.restore();
  }

  render(state: Console2dState): Console2dRenderResult {
    this.lastLinkRects = [];

    this.drawBackgroundAndFrame(state.title);

    const viewport = this.getViewportRect();
    this.lastViewportHeight = viewport.h;

    const labelW = Math.round(this.charW * this.labelCols);
    const gap = 16;
    const labeledTextW = Math.max(1, viewport.w - labelW - gap);
    const plainTextW = viewport.w;

    const renderLines = this.buildRenderLines(state);

    const laidOut: LaidOut[] = [];

    let yCursor = 0;
    for (const line of renderLines) {
      const textW = line.reserveLabelCol ? labeledTextW : plainTextW;
      const itemLineH = line.segments.length === 1 && line.segments[0]?.kind === "pre" ? this.preLineH : this.lineH;
      const wrappedSegments: Segment[][] = [];

      let current: Segment[] = [];
      let currentW = 0;
      for (const seg of line.segments) {
        const segText = seg.text ?? "";
        const parts = seg.kind === "pre" ? [segText] : wrapTextToWidth(this.ctx, segText, textW);

        for (let pIdx = 0; pIdx < parts.length; pIdx++) {
          const part = parts[pIdx] ?? "";
          const sPart: Segment = seg.kind === "link" ? { ...seg, text: part } : { ...seg, text: part };

          const wPart = this.ctx.measureText(part).width;

          const isContinuation = parts.length > 1 && pIdx > 0;
          if (isContinuation) {
            if (current.length) {
              wrappedSegments.push(current);
            }
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
      if (current.length) {
        wrappedSegments.push(current);
      }
      if (wrappedSegments.length === 0) {
        wrappedSegments.push([]);
      }

      const wraps = wrappedSegments.map((segments) => ({ segments }));
      laidOut.push({ y: yCursor, label: line.label, wraps, lineH: itemLineH, reserveLabelCol: line.reserveLabelCol });
      yCursor += wraps.length * itemLineH;
    }

    this.lastContentHeight = yCursor;

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(viewport.x, viewport.y, viewport.w, viewport.h);
    this.ctx.clip();

    this.ctx.fillStyle = COLORS.screen;
    this.ctx.fillRect(viewport.x, viewport.y, viewport.w, viewport.h);

    const baseY = viewport.y - this.scrollY;
    for (const item of laidOut) {
      const itemTop = baseY + item.y;
      const itemBottom = itemTop + item.wraps.length * item.lineH;
      if (itemBottom < viewport.y - item.lineH) {
        continue;
      }
      if (itemTop > viewport.y + viewport.h + item.lineH) {
        continue;
      }

      for (let i = 0; i < item.wraps.length; i++) {
        const y = itemTop + i * item.lineH;
        const label = i === 0 ? item.label : "";
        const labeled = item.reserveLabelCol;

        if (label) {
          this.ctx.fillStyle = COLORS.cyan;
          this.ctx.fillText(label, viewport.x, y);
        }

        let x = labeled ? viewport.x + labelW + gap : viewport.x;
        for (const seg of item.wraps[i]?.segments ?? []) {
          if (!seg.text) {
            continue;
          }
          if (seg.kind === "pre") {
            this.ctx.font = `${this.asciiFontSize}px ${MONO_STACK}`;
          } else if (seg.kind === "text") {
            const style: string[] = [];
            if (seg.italic) {
              style.push("italic");
            }
            if (seg.bold) {
              style.push("bold");
            }
            const prefix = style.length ? `${style.join(" ")} ` : "";
            this.ctx.font = `${prefix}${this.fontSize}px ${MONO_STACK}`;
          } else {
            this.ctx.font = `${this.fontSize}px ${MONO_STACK}`;
          }

          this.ctx.fillStyle = seg.color;
          this.ctx.fillText(seg.text, x, y);

          const wSeg = this.ctx.measureText(seg.text).width;
          if (seg.kind === "link") {
            this.lastLinkRects.push({
              href: seg.href,
              external: seg.external,
              rect: { x, y, w: wSeg, h: item.lineH },
            });
          }
          x += wSeg;
        }
      }
    }

    this.ctx.restore();

    this.drawPrompt(state);

    return {
      linkRects: this.lastLinkRects,
      contentHeight: this.lastContentHeight,
      viewportHeight: this.lastViewportHeight,
    };
  }
}
