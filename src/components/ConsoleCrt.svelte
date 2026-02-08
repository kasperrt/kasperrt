<script lang="ts">
import { onMount, onDestroy, tick, createEventDispatcher } from "svelte";
import { consumeQueue, getAsciiLines, getIntroLines, runCommand, type ConsoleLine } from "~/utils/console";
import { safeWrapAsync } from "~/utils/wrap";
import { getDefaultCrtConfig, type CrtConfig } from "~/utils/crt/types";
import { createConsole2dRenderer, type Console2dState } from "~/utils/crt/console2d";
import { createCrtRenderer, type CrtRenderer } from "~/utils/crt/renderer";

const dispatch = createEventDispatcher<{ fail: undefined }>();

let canvasEl: HTMLCanvasElement;
let inputEl: HTMLInputElement;

let browseback = -1;
let prevCommands: string[] = [];
let commands: ConsoleLine[] = [];
let input = "";
let loading = false;
let partial = false;
let queue: ConsoleLine[] | null = null;

let scrollY = 0;
let stickToBottom = true;

const intro = getIntroLines();
const asciiLines = getAsciiLines();

let crt: CrtRenderer | null = null;
let console2d: ReturnType<typeof createConsole2dRenderer> | null = null;

let redrawTimer: number | null = null;
let uptimeTimer: number | null = null;

const config: CrtConfig = getDefaultCrtConfig();

function getDate() {
  return new Date().toTimeString().split(" ")[0];
}

async function focusInput() {
  if (!inputEl) return;
  inputEl.focus();
  await tick();
  inputEl.focus();
  const len = inputEl.value.length;
  inputEl.setSelectionRange(len, len);
}

function clampScroll() {
  if (!console2d) return;
  const max = Math.max(0, console2d.getContentHeight() - console2d.getViewportHeight());
  scrollY = Math.min(Math.max(0, scrollY), max);
}

function scrollToBottom() {
  if (!console2d) return;
  scrollY = Math.max(0, console2d.getContentHeight() - console2d.getViewportHeight());
}

function request2dRedraw() {
  if (!console2d || !crt) return;

  // Ensure the renderer uses our current scroll position before layout.
  console2d.setScrollY(scrollY);

  const mkState = (): Console2dState => ({
    title: "kasperrt",
    asciiLines,
    introLines: intro,
    commands,
    input,
    loading,
    partial,
    scrollY,
  });

  let result = console2d.render(mkState());

  // Auto-stick behavior: if user is at bottom (or we consider ourselves sticky), keep it pinned.
  if (stickToBottom) {
    const next = Math.max(0, result.contentHeight - result.viewportHeight);
    if (next !== scrollY) {
      scrollY = next;
      console2d.setScrollY(scrollY);
      result = console2d.render(mkState());
    }
  } else {
    const prev = scrollY;
    clampScroll();
    if (scrollY !== prev) {
      console2d.setScrollY(scrollY);
      result = console2d.render(mkState());
    }
  }

  crt.setLinkRects(result.linkRects);
  crt.updateTexture();
}

function schedulePeriodicRedraw() {
  if (redrawTimer !== null) {
    window.clearInterval(redrawTimer);
    redrawTimer = null;
  }
  const interval = loading || partial ? 100 : 500;
  redrawTimer = window.setInterval(() => {
    request2dRedraw();
  }, interval);
}

function scheduleUptimeRedraw() {
  if (uptimeTimer !== null) {
    window.clearInterval(uptimeTimer);
    uptimeTimer = null;
  }
  uptimeTimer = window.setInterval(() => request2dRedraw(), 1000);
}

async function handleSubmit() {
  loading = true;
  browseback = -1;
  schedulePeriodicRedraw();
  request2dRedraw();

  if (input === "" && (partial || queue !== null)) {
    partial = false;
    queue = null;
    loading = false;
    schedulePeriodicRedraw();
    request2dRedraw();
    return;
  }

  if (input.trim() !== "") {
    prevCommands.push(input);
  }

  const [err, result] = await safeWrapAsync(() => runCommand({ input, getDate }));

  if (err || !result) {
    commands = [...commands, [getDate(), "something went wrong, try again."]];
    input = "";
    loading = false;
    stickToBottom = true;
    schedulePeriodicRedraw();
    request2dRedraw();
    return;
  }

  if (result.type === "replace") {
    commands = result.lines;
    input = "";
    loading = false;
    stickToBottom = true;
    schedulePeriodicRedraw();
    request2dRedraw();
    return;
  }

  if (result.echoInput) {
    commands = [...commands, [getDate(), input]];
  }

  switch (result.type) {
    case "append":
      commands = [...commands, ...result.lines];
      break;
    case "queue": {
      commands = [...commands, ...result.lines];
      let nextQueue: ConsoleLine[] | null = null;
      if (result.remaining.length) {
        nextQueue = result.remaining;
      }
      queue = nextQueue;
      partial = result.partial;
      break;
    }
    case "exit":
      window.location.href = "/";
      return;
  }

  input = "";
  loading = false;
  stickToBottom = true;
  schedulePeriodicRedraw();
  request2dRedraw();
}

async function handleKeyDown(e: KeyboardEvent) {
  // Partial paging has priority.
  if (partial) {
    if (e.key === "c" && e.ctrlKey) {
      partial = false;
      queue = null;
      commands = [...commands, [getDate(), `^C${input}`]];
      input = "";
      stickToBottom = true;
      request2dRedraw();
      return;
    }

    if (e.key === "Enter") {
      const currentQueue = queue ?? [];
      const { lines, remaining, partial: stillPartial } = consumeQueue(currentQueue);
      if (lines.length) {
        commands = [...commands, ...lines];
      }
      queue = remaining.length ? remaining : null;
      partial = stillPartial;
      stickToBottom = true;
      request2dRedraw();
      return;
    }
  }

  // Ctrl+C behavior (even while not focused).
  if (e.key === "c" && e.ctrlKey) {
    commands = [...commands, [getDate(), `^C${input}`]];
    input = "";
    stickToBottom = true;
    request2dRedraw();
    return;
  }

  if (loading) return;

  if (e.key === "Enter") {
    e.preventDefault();
    await handleSubmit();
    return;
  }

  if (e.key === "ArrowUp" || e.key === "ArrowDown") {
    e.preventDefault();

    switch (e.key) {
      case "ArrowUp": {
        if (prevCommands.length === 0) return;
        if (browseback === -1) {
          browseback = prevCommands.length - 1;
          break;
        }
        browseback = Math.max(0, browseback - 1);
        break;
      }
      case "ArrowDown": {
        if (browseback === -1) return;
        if (browseback >= prevCommands.length - 1) {
          browseback = -1;
          break;
        }
        browseback = browseback + 1;
        break;
      }
    }

    input = browseback !== -1 ? prevCommands[browseback] : "";
    await focusInput();
    request2dRedraw();
  }
}

function handleWheel(e: WheelEvent) {
  if (!console2d) return;
  if (console2d.getContentHeight() <= console2d.getViewportHeight()) return;

  // Canvas-style scrolling.
  stickToBottom = false;
  scrollY += e.deltaY;
  clampScroll();

  // If we're close enough to the bottom, re-enable stickiness.
  const max = Math.max(0, console2d.getContentHeight() - console2d.getViewportHeight());
  if (max - scrollY < 4) {
    stickToBottom = true;
    scrollToBottom();
  }

  console2d.setScrollY(scrollY);
  request2dRedraw();
}

function handleMouseMove(e: MouseEvent) {
  if (!crt) return;
  const link = crt.pickLinkAt(e.clientX, e.clientY);
  canvasEl.style.cursor = link ? "pointer" : "text";
}

function handleClick(e: MouseEvent) {
  if (!crt) return;
  const link = crt.pickLinkAt(e.clientX, e.clientY);
  if (link) {
    if (link.external) {
      window.open(link.href, "_blank", "noopener,noreferrer");
    } else {
      window.location.href = link.href;
    }
    return;
  }
  focusInput();
}

onMount(async () => {
  const html = document.documentElement;
  const body = document.body;
  const prevHtmlOverflow = html.style.overflow;
  const prevBodyOverflow = body.style.overflow;
  html.style.overflow = "hidden";
  body.style.overflow = "hidden";

  try {
    const THREE = await import("three");

    const sourceCanvas = document.createElement("canvas");
    console2d = createConsole2dRenderer({ canvas: sourceCanvas });

    crt = createCrtRenderer(THREE, {
      canvas: canvasEl,
      sourceCanvas,
      config,
    });

    crt.start();
    schedulePeriodicRedraw();
    scheduleUptimeRedraw();
    request2dRedraw();
    await focusInput();
  } catch (e) {
    console.error(e);
    dispatch("fail");
  }

  const onResize = () => {
    if (!crt || !console2d) return;
    const dpr = Math.min(window.devicePixelRatio || 1, config.dprMax);
    const w = window.innerWidth;
    const h = window.innerHeight;
    crt.resize(w, h, dpr);
    console2d.resize(w, h, dpr);
    if (stickToBottom) scrollToBottom();
    request2dRedraw();
  };
  window.addEventListener("resize", onResize);
  onResize();

  const onReducedMotion = () => {
    if (!crt) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    crt.setMotionScale(reduce ? 0 : 1);
  };
  const mm = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  mm?.addEventListener?.("change", onReducedMotion);
  onReducedMotion();

  const onKey = (ev: KeyboardEvent) => handleKeyDown(ev);
  window.addEventListener("keydown", onKey);

  return () => {
    window.removeEventListener("resize", onResize);
    window.removeEventListener("keydown", onKey);
    mm?.removeEventListener?.("change", onReducedMotion);

    if (redrawTimer !== null) window.clearInterval(redrawTimer);
    if (uptimeTimer !== null) window.clearInterval(uptimeTimer);
    redrawTimer = null;
    uptimeTimer = null;

    crt?.dispose();
    crt = null;
    console2d = null;

    html.style.overflow = prevHtmlOverflow;
    body.style.overflow = prevBodyOverflow;
  };
});

onDestroy(() => {
  // cleanup handled by onMount return
});
</script>

<div class="fixed inset-0 z-10 bg-black">
  <canvas
    bind:this={canvasEl}
    class="absolute inset-0 h-full w-full"
    on:mousemove={handleMouseMove}
    on:click={handleClick}
    on:wheel|passive={handleWheel}
  />

  <!-- Hidden input to keep the same keyboard + mobile keyboard behavior -->
  <input
    bind:this={inputEl}
    class="absolute left-0 top-0 h-px w-px opacity-0"
    autocapitalize="off"
    autocomplete="off"
    autocorrect="off"
    spellcheck={false}
    readonly={loading || partial}
    value={input}
    on:input={(e) => {
      if (loading || partial) {
        // Keep the DOM value in sync even if a browser emits input while readonly toggles.
        (e.currentTarget as HTMLInputElement).value = input;
        return;
      }
      input = (e.currentTarget as HTMLInputElement).value;
      request2dRedraw();
    }}
  />
</div>
