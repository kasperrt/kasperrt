<script lang="ts">
/**
 * I know it is fun to poke around here to figure out easter eggs,
 * but it would of course be more fun to find them on your own.
 */

import { onMount, tick } from "svelte";
import { classNames } from "~/utils/classNames";
import {
  consumeQueue,
  getAsciiLines,
  getIntroLines,
  runCommand,
  type ConsoleCommand,
  type ConsoleLine,
} from "~/utils/console";
import { trackingClient } from "~/utils/http";
import { safeWrapAsync } from "~/utils/wrap";
import Spinner from "./Spinner.svelte";
import ConsoleUptime from "./ConsoleUptime.svelte";

let browseback = -1;
let prevCommands: string[] = [];
let commands: ConsoleLine[] = [];
let inputfield: HTMLInputElement;
let input = "";
let loading = false;
let partial = false;
let queue: ConsoleLine[] | null = null;

const intro = getIntroLines();
const asciiLines = getAsciiLines();

function getDate() {
  return new Date().toTimeString().split(" ")[0];
}

async function handleSubmit() {
  loading = true;
  browseback = -1;

  if (input === "" && (partial || queue !== null)) {
    partial = false;
    queue = null;
    loading = false;
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
    return;
  }

  if (result.type === "replace") {
    commands = result.lines;
    input = "";
    loading = false;
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
      window.location.reload();
      return;
  }

  input = "";
  loading = false;
}

async function focusEnd() {
  if (!inputfield) {
    return;
  }
  inputfield.focus();
  await tick();
  inputfield.focus();
  const len = inputfield.value.length;
  inputfield.setSelectionRange(len, len);
}

async function handleKeyPress(e: KeyboardEvent) {
  if (e.key === "c" && e.ctrlKey) {
    commands = [...commands, [getDate(), `^C${input}`]];
    input = "";
    return;
  }

  if (e.key !== "ArrowUp" && e.key !== "ArrowDown") {
    return;
  }

  e.preventDefault();

  switch (e.key) {
    case "ArrowUp": {
      if (prevCommands.length === 0) {
        return;
      }

      if (browseback === -1) {
        browseback = prevCommands.length - 1;
        break;
      }

      if (browseback !== -1) {
        browseback = Math.max(0, browseback - 1);
        break;
      }
      break;
    }
    case "ArrowDown": {
      if (browseback === -1) {
        return;
      }

      if (browseback >= prevCommands.length - 1) {
        browseback = -1;
        break;
      }

      if (browseback < prevCommands.length - 1) {
        browseback = browseback + 1;
        break;
      }

      break;
    }
  }

  let nextInput = "";
  if (browseback !== -1) {
    nextInput = prevCommands[browseback];
  }

  input = nextInput;

  await focusEnd();
}

function cleanString(s: string) {
  if ((s.startsWith("*") && s.endsWith("*")) || (s.startsWith("_") && s.endsWith("_"))) {
    return s.substring(1, s.length - 1);
  }

  return s;
}

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

function shouldShowUptime(value: ConsoleCommand): boolean {
  return isUptime(value);
}

function shouldShowLink(value: ConsoleCommand): boolean {
  if (isUptime(value)) {
    return false;
  }

  if (isLink(value)) {
    return true;
  }

  return false;
}

function shouldShowText(value: ConsoleCommand): boolean {
  if (isUptime(value)) {
    return false;
  }

  if (isLink(value)) {
    return false;
  }

  return true;
}

function getLinkValue(value: ConsoleCommand): string | null {
  if (isLink(value)) {
    return value;
  }

  return null;
}

function getCommandText(value: ConsoleCommand): string {
  if (typeof value === "string") {
    return value;
  }

  return "";
}

function isItalicCommand(value: ConsoleCommand): boolean {
  const text = getCommandText(value);
  return text.startsWith("*") && text.endsWith("*");
}

function isBoldCommand(value: ConsoleCommand): boolean {
  const text = getCommandText(value);
  return text.startsWith("_") && text.endsWith("_");
}

function isSpaceCommand(value: ConsoleCommand): boolean {
  return getCommandText(value) === " ";
}

function getLinkTarget(value: string) {
  if (isExternalLink(value)) {
    return "_blank";
  }

  return undefined;
}

function getLinkRel(value: string) {
  if (isExternalLink(value)) {
    return "noreferrer";
  }

  return undefined;
}

function partialContinue(e: KeyboardEvent) {
  if (!partial) {
    return;
  }

  if (e.key === "c" && e.ctrlKey) {
    partial = false;
    queue = null;
    commands = [...commands, [getDate(), `^C${input}`]];
    input = "";
    return;
  }

  if (e.key !== "Enter") {
    return;
  }

  const currentQueue = queue ?? [];
  const { lines, remaining, partial: stillPartial } = consumeQueue(currentQueue);

  if (lines.length) {
    commands = [...commands, ...lines];
  }

  let nextQueue: ConsoleLine[] | null = null;
  if (remaining.length) {
    nextQueue = remaining;
  }
  queue = nextQueue;
  partial = stillPartial;
}

onMount(() => {
  const html = document.documentElement;
  const body = document.body;
  const prevHtmlOverflow = html.style.overflow;
  const prevBodyOverflow = body.style.overflow;

  html.style.overflow = "hidden";
  body.style.overflow = "hidden";

  trackingClient.post("/api/event", null, {
    d: "kasperrt.me",
    n: "pageview",
    r: document.referrer,
    u: "https://analytics.kasperrt.me/console",
  });

  return () => {
    html.style.overflow = prevHtmlOverflow;
    body.style.overflow = prevBodyOverflow;
  };
});
</script>

<svelte:window on:click={focusEnd} on:keydown={partialContinue} />

<div
  class="fixed inset-0 z-10 flex items-center justify-center bg-black/50"
>
  <div class="bg-gray-700 flex w-full h-full flex-col-reverse p-8">
    <form
      class="font-mono flex flex-col-reverse px-4 pt-4 border-2 border-white h-full overflow-auto text-white"
      on:submit|preventDefault={handleSubmit}
    >
      <div class="sticky bottom-0 bg-gray-700 pb-4">
        <span>$ &gt;</span>
        <!-- svelte-ignore a11y_autofocus -->
        {#if !loading && !partial}
          <input
            autofocus
            class="outline-0 caret"
            autocapitalize="off"
            autocomplete="off"
            autocorrect="off"
            spellcheck={false}
            bind:value={input}
            on:keydown={handleKeyPress}
            bind:this={inputfield}
            on:input={focusEnd}
          />
        {/if}
        {#if loading}
          <Spinner />
        {/if}
        {#if partial}
          <Spinner />
            <span>(...press enter for next paragraph...)</span>
            <Spinner />
          {/if}
      </div>
      {#each [...commands].reverse() as [label, command]}
        <div class="grid grid-cols-[12ch_1fr] gap-x-4">
          <span class="text-cyan-300 whitespace-pre">
            {label}
          </span>
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
            {:else if shouldShowText(command)}
              <span
                class={classNames(
                  isItalicCommand(command) && "italic",
                  isBoldCommand(command) && "font-bold"
                )}
              >
                {cleanString(getCommandText(command))}
                {#if isSpaceCommand(command)}
                  &nbsp;
                {/if}
              </span>
            {/if}
          </span>
        </div>
      {/each}
      {#each [...intro].reverse() as text}
        <div>
          <pre class="text-wrap">{text}</pre>
        </div>
      {/each}

      {#each [...asciiLines].reverse() as text}
        <div>
          <pre class="text-wrap text-[8px] sm:text-base">{text}</pre>
        </div>
      {/each}
    </form>
  </div>
</div>
