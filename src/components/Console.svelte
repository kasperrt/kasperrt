<script lang="ts">
import { onMount, tick, onDestroy } from "svelte";
import { safeWrap, safeWrapAsync } from "~/utils/wrap";
import { classNames } from "~/utils/classNames";
import Spinner from "./Spinner.svelte";
import ConsoleUptime from "./ConsoleUptime.svelte";
import { ConsoleController } from "~/utils/console/controller";
import { get } from "svelte/store";
import { CrtManager } from "~/utils/crt/manager";
import { Console2dRenderer } from "~/utils/crt/console2d";
import { CrtRenderer } from "~/utils/crt/renderer";
import { getDefaultCrtConfig } from "~/utils/crt/types";
import {
  cleanString,
  getCommandText,
  getLinkRel,
  getLinkSummary,
  getLinkTarget,
  getLinkValue,
  isBoldCommand,
  isItalicCommand,
  isSpaceCommand,
  shouldShowLink,
  shouldShowText,
  shouldShowUptime,
} from "~/utils/console/ui";

// -- Shared Logic --
const controller = new ConsoleController();

const { commands, input, loading, partial, introLines, asciiLines, submit, handleKeyDown, setInput, reset } =
  controller;

let useCrt = true;

// -- DOM Mode helpers --
let inputfield: HTMLInputElement;

async function handleDomSubmit() {
  await submit();
}

async function focusEnd() {
  if (!inputfield) {
    return;
  }
  inputfield.focus();
}

async function handleDomKeyPress(e: KeyboardEvent) {
  await handleKeyDown(e, async () => {
    await handleDomSubmit();
  });

  await tick();
  if (inputfield) {
    inputfield.focus();
    const len = inputfield.value.length;
    inputfield.setSelectionRange(len, len);
  }
}

function onDomInput(e: Event) {
  const target = e.target as HTMLInputElement;
  setInput(target.value);
  focusEnd();
}

// -- CRT Mode state --
let canvasEl: HTMLCanvasElement;
let inputElCrt: HTMLInputElement;
let crtManager: CrtManager | null = null;

// -- Window Event Handlers --
async function handleWindowKey(e: KeyboardEvent) {
  if (!useCrt) {
    await handleDomKeyPress(e);
    return;
  }
  if (!crtManager) {
    return;
  }

  // Only run logic if manager is active
  await handleCrtKey(e);
}

function handleWindowClick(_e: MouseEvent) {
  if (useCrt) {
    return;
  }
  focusEnd();
}

function canUseWebgl(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const [error, canvas] = safeWrap(() => document.createElement("canvas"));
  if (error) {
    return false;
  }
  const [glError, ctx] = safeWrap(() => canvas.getContext("webgl2") || canvas.getContext("webgl"));
  return !glError && Boolean(ctx);
}

async function focusInputCrt() {
  if (!inputElCrt) {
    return;
  }

  inputElCrt.focus();
  await tick();
  inputElCrt.focus();
  const len = inputElCrt.value.length;
  inputElCrt.setSelectionRange(len, len);
}

async function handleCrtKey(e: KeyboardEvent) {
  if (get(loading)) {
    return;
  }
  await handleKeyDown(e, async () => {
    if (!crtManager) {
      return;
    }

    await crtManager.submitAndAnimate(async () => {
      window.location.href = "/";
    });
  });
  crtManager?.requestRedraw();
  await focusInputCrt();
}

function handleCrtInput(e: Event) {
  const target = e.currentTarget as HTMLInputElement;
  if (get(loading) || get(partial)) {
    target.value = get(input);
    return;
  }
  setInput(target.value);
  crtManager?.requestRedraw();
}

let windowWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
$: useCrt = canUseWebgl() && windowWidth >= 768;

let crtCleanup: (() => void) | null = null;
let unmounted = false;

async function initCrt() {
  if (unmounted || !useCrt || !canvasEl || crtManager) {
    return;
  }

  const config = getDefaultCrtConfig();
  const [threeErr, THREE] = await safeWrapAsync(() => import("three"));
  if (threeErr) {
    console.error("Failed to load Three.js", threeErr);
    // Fallback is implicit because useCrt remains false or we could force it here
    return;
  }

  const sourceCanvas = document.createElement("canvas");
  const console2d = new Console2dRenderer({ canvas: sourceCanvas });
  const crt = new CrtRenderer(THREE, canvasEl, sourceCanvas, config);
  const manager = new CrtManager(canvasEl, controller, config, crt, console2d);

  crtManager = manager;
  await focusInputCrt();

  if (unmounted) {
    disposeCrt();
  }
}

function disposeCrt() {
  if (crtManager) {
    crtManager.dispose();
    crtManager = null;
  }
}

$: {
  if (useCrt) {
    tick().then(initCrt);
  } else {
    disposeCrt();
  }
}

onMount(() => {
  // Common setup
  const html = document.documentElement;
  const body = document.body;
  const prevHtmlOverflow = html.style.overflow;
  const prevBodyOverflow = body.style.overflow;
  html.style.overflow = "hidden";
  body.style.overflow = "hidden";

  return () => {
    unmounted = true;
    disposeCrt();
    reset();
    html.style.overflow = prevHtmlOverflow;
    body.style.overflow = prevBodyOverflow;
  };
});

onDestroy(() => {});
</script>

<svelte:window
  on:click={handleWindowClick}
  on:keydown={handleWindowKey}
  bind:innerWidth={windowWidth}
/>

{#if useCrt}
  <!-- CRT TEMPLATE -->
  <div class="fixed inset-0 z-10 bg-black">
    <canvas
      bind:this={canvasEl}
      class="absolute inset-0 h-full w-full touch-none"
      on:mousemove={(e) => crtManager?.handleMouseMove(e)}
      on:pointerdown={(e) => crtManager?.handlePointerDown(e)}
      on:pointermove={(e) => crtManager?.handlePointerMove(e)}
      on:pointerup={(e) => crtManager?.handlePointerUp(e, focusInputCrt)}
      on:pointercancel={(e) => crtManager?.handlePointerCancel(e)}
      on:wheel|passive={(e) => crtManager?.handleWheel(e)}
    />
    <!-- Hidden input -->
    <input
      bind:this={inputElCrt}
      class="absolute left-0 top-0 h-px w-px opacity-0"
      autocapitalize="off"
      autocomplete="off"
      autocorrect="off"
      spellcheck={false}
      inputmode="text"
      enterkeyhint="send"
      readonly={$loading || $partial}
      value={$input}
      on:input={handleCrtInput}
    />
  </div>
{:else}
  <!-- DOM TEMPLATE -->
  <div class="fixed inset-0 z-10 flex items-center justify-center bg-black/50">
    <div
      class="bg-gray-700 flex w-full h-full flex-col-reverse p-4 sm:p-8 relative"
    >
      <span
        class="bg-gray-700 px-4 top-5 left-0 right-0 m-auto absolute text-white font-mono w-fit"
        >kasperrt</span
      >
      <form
        class="font-mono flex flex-col-reverse px-4 pt-4 border-2 border-white h-full overflow-auto text-white"
        on:submit|preventDefault={handleDomSubmit}
      >
        <div class="sticky bottom-0 bg-gray-700 pb-4">
          <span>$ &gt;</span>
          <!-- svelte-ignore a11y_autofocus -->
          {#if !$loading && !$partial}
            <input
              autofocus
              class="outline-0 caret"
              autocapitalize="off"
              autocomplete="off"
              autocorrect="off"
              spellcheck={false}
              bind:value={$input}
              bind:this={inputfield}
              on:input={onDomInput}
            />
          {/if}
          {#if $loading} <Spinner /> {/if}
          {#if $partial}
            <Spinner /> <span>(...press enter for next paragraph...)</span>
            <Spinner />
          {/if}
        </div>
        {#each [...$commands].reverse() as [label, command]}
          <div
            class="grid grid-cols-[8ch_1fr] sm:grid-cols-[12ch_1fr] gap-x-2 sm:gap-x-4"
          >
            <span class="text-cyan-300 whitespace-pre">{label}</span>
            <span class="flex min-w-0 gap-x-2">
              {#if shouldShowUptime(command)}
                <ConsoleUptime />
              {:else if shouldShowLink(command)}
                <a
                  class="text-red-400 hover:text-red-300 underline underline-offset-2 break-all"
                  href={getLinkValue(command)}
                  target={getLinkTarget(getCommandText(command))}
                  rel={getLinkRel(getCommandText(command))}
                >
                  {getLinkValue(command)}
                </a>
                {#if getLinkSummary(command)}<span
                    >{getLinkSummary(command)}</span
                  >{/if}
              {:else if shouldShowText(command)}
                <span
                  class={classNames(
                    isItalicCommand(command) && "italic",
                    isBoldCommand(command) && "font-bold"
                  )}
                >
                  {cleanString(getCommandText(command)) ||
                    ""}{#if isSpaceCommand(command)}&nbsp;{/if}
                </span>
              {/if}
            </span>
          </div>
        {/each}
        {#each [...introLines].reverse() as text}<div>
            <pre class="text-wrap">{text}</pre>
          </div>{/each}
        {#each [...asciiLines].reverse() as text}<div>
            <pre class="text-wrap text-[8px] sm:text-base">{text}</pre>
          </div>{/each}
      </form>
    </div>
  </div>
{/if}
