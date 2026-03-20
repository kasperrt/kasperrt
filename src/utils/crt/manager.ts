import { get } from "svelte/store";
import type { ConsoleController } from "~/utils/console/controller";
import { safeWrap } from "~/utils/wrap";
import type { Console2dRenderer, Console2dState } from "~/utils/crt/console2d";
import type { CrtRenderer } from "~/utils/crt/renderer";
import type { CrtConfig } from "~/utils/crt/types";
import { Tween } from "svelte/motion";
import { cubicOut, cubicIn } from "svelte/easing";

export class CrtManager {
  private canvasEl: HTMLCanvasElement;
  private controller: ConsoleController;
  private config: CrtConfig;
  private crt: CrtRenderer;
  private console2d: Console2dRenderer;

  private scrollY = 0;
  private stickToBottom = true;

  private dragPointerId: number | null = null;
  private dragStartY = 0;
  private dragStartScrollY = 0;
  private dragMoved = false;

  private open: Tween<number>;
  private animationFrameId = 0;
  private mm: MediaQueryList | null = null;
  private lastRedrawTime = 0;
  private needsRedraw = true;

  public constructor(
    canvasEl: HTMLCanvasElement,
    controller: ConsoleController,
    config: CrtConfig,
    crt: CrtRenderer,
    console2d: Console2dRenderer,
  ) {
    this.canvasEl = canvasEl;
    this.controller = controller;
    this.config = config;
    this.crt = crt;
    this.console2d = console2d;

    this.open = new Tween(0, {
      duration: 1000,
      easing: cubicOut,
    });

    this.start();
  }

  private start(): void {
    this.open.target = 1;
    this.crt.start();

    window.addEventListener("resize", this.onResize);
    this.mm = window.matchMedia?.("(prefers-reduced-motion: reduce)") ?? null;
    this.mm?.addEventListener?.("change", this.onReducedMotion);
    this.onResize();
    this.onReducedMotion();

    this.animationFrameId = requestAnimationFrame(this.animationLoop);
  }

  private getRedrawInterval(): number {
    const { loading, partial } = this.controller;
    if (get(loading) || get(partial)) {
      return 100;
    }
    return 500;
  }

  private animationLoop = (timestamp: number): void => {
    this.crt.setOpen(this.open.current);

    const elapsed = timestamp - this.lastRedrawTime;
    const interval = this.getRedrawInterval();

    if (this.needsRedraw || elapsed >= interval) {
      this.performRedraw();
      this.lastRedrawTime = timestamp;
      this.needsRedraw = false;
    }

    this.animationFrameId = requestAnimationFrame(this.animationLoop);
  };

  private clampScroll(): void {
    const max = Math.max(0, this.console2d.getContentHeight() - this.console2d.getViewportHeight());
    this.scrollY = Math.min(Math.max(0, this.scrollY), max);
  }

  private scrollToBottom(): void {
    this.scrollY = Math.max(0, this.console2d.getContentHeight() - this.console2d.getViewportHeight());
  }

  private performRedraw(): void {
    const { commands, input, loading, partial, introLines, asciiLines } = this.controller;

    this.console2d.setScrollY(this.scrollY);

    const mkState = (): Console2dState => ({
      title: "kasperrt",
      asciiLines,
      introLines,
      commands: get(commands),
      input: get(input),
      loading: get(loading),
      partial: get(partial),
      scrollY: this.scrollY,
    });

    let result = this.console2d.render(mkState());

    if (this.stickToBottom) {
      const next = Math.max(0, result.contentHeight - result.viewportHeight);
      if (next !== this.scrollY) {
        this.scrollY = next;
        this.console2d.setScrollY(this.scrollY);
        result = this.console2d.render(mkState());
      }
      this.crt.setLinkRects(result.linkRects);
      this.crt.updateTexture();
      return;
    }

    const prev = this.scrollY;
    this.clampScroll();
    if (this.scrollY !== prev) {
      this.console2d.setScrollY(this.scrollY);
      result = this.console2d.render(mkState());
    }

    this.crt.setLinkRects(result.linkRects);
    this.crt.updateTexture();
  }

  requestRedraw = (): void => {
    this.needsRedraw = true;
  };

  handleWheel = (e: WheelEvent): void => {
    if (this.console2d.getContentHeight() <= this.console2d.getViewportHeight()) {
      return;
    }

    this.stickToBottom = false;
    this.scrollY += e.deltaY;
    this.clampScroll();

    const max = Math.max(0, this.console2d.getContentHeight() - this.console2d.getViewportHeight());
    if (max - this.scrollY < 4) {
      this.stickToBottom = true;
      this.scrollToBottom();
    }

    this.console2d.setScrollY(this.scrollY);
    this.requestRedraw();
  };

  handleMouseMove = (e: MouseEvent): void => {
    if (this.dragPointerId !== null) {
      return;
    }
    const link = this.crt.pickLinkAt(e.clientX, e.clientY);
    this.canvasEl.style.cursor = link ? "pointer" : "text";
  };

  handleClick = (e: MouseEvent, focusInput: () => void): void => {
    const link = this.crt.pickLinkAt(e.clientX, e.clientY);
    if (!link) {
      focusInput();
      return;
    }

    if (link.external) {
      window.open(link.href, "_blank", "noopener,noreferrer");
      return;
    }

    window.location.href = link.href;
  };

  handlePointerDown = (e: PointerEvent): void => {
    this.dragPointerId = e.pointerId;
    this.dragStartY = e.clientY;
    this.dragStartScrollY = this.scrollY;
    this.dragMoved = false;
    this.canvasEl.setPointerCapture(e.pointerId);
  };

  handlePointerMove = (e: PointerEvent): void => {
    if (this.dragPointerId === null || e.pointerId !== this.dragPointerId) {
      return;
    }

    const dy = e.clientY - this.dragStartY;
    if (Math.abs(dy) > 2) {
      this.dragMoved = true;
    }

    if (this.console2d.getContentHeight() <= this.console2d.getViewportHeight()) {
      return;
    }

    this.stickToBottom = false;
    this.scrollY = this.dragStartScrollY - dy;
    this.clampScroll();
    this.console2d.setScrollY(this.scrollY);
    this.requestRedraw();
  };

  handlePointerUp = (e: PointerEvent, focusInput: () => void): void => {
    if (this.dragPointerId === null || e.pointerId !== this.dragPointerId) {
      return;
    }
    this.dragPointerId = null;

    safeWrap(() => this.canvasEl.releasePointerCapture(e.pointerId));

    if (!this.dragMoved) {
      this.handleClick(e as unknown as MouseEvent, focusInput);
    }
  };

  handlePointerCancel = (e: PointerEvent): void => {
    if (this.dragPointerId === null || e.pointerId !== this.dragPointerId) {
      return;
    }
    this.dragPointerId = null;
  };

  private onResize = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, this.config.dprMax);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.console2d.resize(w, h, dpr);
    this.crt.resize(w, h, dpr);
    if (this.stickToBottom) {
      this.scrollToBottom();
    }
    this.requestRedraw();
  };

  private onReducedMotion = (): void => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    this.crt.setMotionScale(reduce ? 0 : 1);
  };

  async submitAndAnimate(onExit: () => Promise<void>): Promise<void> {
    this.requestRedraw();

    const { submit } = this.controller;
    const redrawNeeded = await submit(async () => {
      await this.open.set(0, { duration: 600, easing: cubicIn });
      await onExit();
    });

    if (!redrawNeeded) {
      return;
    }

    this.stickToBottom = true;
    this.requestRedraw();
  }

  dispose = (): void => {
    window.removeEventListener("resize", this.onResize);
    this.mm?.removeEventListener?.("change", this.onReducedMotion);
    cancelAnimationFrame(this.animationFrameId);
    this.crt.dispose();
  };
}
