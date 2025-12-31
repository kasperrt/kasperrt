<script lang="ts">
/**
 * I know it is fun to poke around here to figure out easter eggs,
 * but it would of course be more fun to find them on your own.
 */

import { tick } from "svelte";
import type { CvEntry } from "~/schemas/more";
import { classNames } from "~/utils/classNames";
import { httpClient } from "~/utils/http";
import Spinner from "./Spinner.svelte";

const largeAscii = [
  "██╗  ██╗ █████╗ ███████╗██████╗ ███████╗██████╗",
  "██║ ██╔╝██╔══██╗██╔════╝██╔══██╗██╔════╝██╔══██╗",
  "█████╔╝ ███████║███████╗██████╔╝█████╗  ██████╔╝",
  "██╔═██╗ ██╔══██║╚════██║██╔═══╝ ██╔══╝  ██╔══██╗",
  "██║  ██╗██║  ██║███████║██║     ███████╗██║  ██║",
  "╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝",
  "\n",
];

let browseback = -1;
let prevCommands: string[] = [];
let commands: string[][] = [];
let allowedCommands = ["help", "cv", "clear", "exit"];
let inputfield: HTMLInputElement;
let input = "";
let innerWidth = window.innerWidth;
let loading = false;
let partial = false;
let queue: string[][] | null = null;

$: screensize = innerWidth > 568 ? "large" : "small";
$: intro = [
  ...(screensize === "large" ? largeAscii : []),
  "Hey, I'm Kasper and this is my (shitty) website terminal.",
  "\n",
  "I tried to add some easter eggs here (such as this),",
  "but seeing everything is publicly available on GitHub, checking there is kinda boring.",
  "\n",
];

async function getCvEntries(): Promise<CvEntry[]> {
  const [err, data] = await httpClient.get("/cv.json", null, {
    cacheRequest: true,
    cacheTimeToLive: 864000,
  });
  if (err) {
    // Shouldn't happen, so, well, let's try again
    return getCvEntries();
  }

  return data
    .filter((entry) => typeof entry === "object" && entry !== null)
    .map((entry) => ({
      label: typeof entry.label === "string" ? entry.label : "",
      text: typeof entry.text === "string" ? entry.text : "",
    }));
}

function getDate() {
  return new Date().toTimeString().split(" ")[0];
}

async function handleSubmit() {
  loading = true;
  browseback = -1;
  prevCommands.push(input);

  if (input === "" && (partial || queue !== null)) {
    partial = false;
    queue = null;
    loading = false;
    return;
  }

  if (input.startsWith("ssh")) {
    commands = [...commands, [getDate(), `command not found: ${input}`]];
    commands = [...commands, ["", `You really think this would have ssh?`]];
    input = "";
    loading = false;
    return;
  }

  if (!allowedCommands.includes(input)) {
    commands = [...commands, [getDate(), `command not found: ${input}`]];
    input = "";
    loading = false;
    return;
  }

  commands = [...commands, [getDate(), input]];
  switch (input) {
    case "help":
      commands = [
        ...commands,
        ["", `available commands: ${allowedCommands.join(", ")}.`],
        ["", "more might come at a later time."],
      ];
      break;
    case "clear":
      commands = [[getDate(), input]];
      break;
    case "exit":
      window.location.reload();
      return;
    case "cv": {
      const cvEntries = await getCvEntries();
      if (!cvEntries.length) {
        commands = [...commands, ["", "cv doesn't seem to be available at this time..."]];
        break;
      }

      queue = [...cvEntries.map(({ label, text }) => [label, text])];
      let pop = null;
      for (let i = 0; i < queue.length; i++) {
        const q = queue[i];
        const [, text] = q;
        if (text === " ") {
          commands = [...commands, q];
          partial = true;
          pop = i;
          break;
        }

        commands = [...commands, q];
        pop = i;
      }

      if (pop !== null) {
        queue = queue.slice(pop + 1);
      }

      break;
    }
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
    case "ArrowUp":
      browseback = Math.min(browseback + 1, prevCommands.length - 1);
      break;
    case "ArrowDown":
      browseback = Math.max(browseback - 1, -1);
      break;
  }

  input = browseback === -1 ? "" : prevCommands[browseback];

  await focusEnd();
}

function cleanString(s: string) {
  if ((s.startsWith("*") && s.endsWith("*")) || (s.startsWith("_") && s.endsWith("_"))) {
    return s.substring(1, s.length - 1);
  }

  return s;
}

function partialContinue(e: KeyboardEvent) {
  if (!partial) {
    return;
  }

  if (e.key === "c" && e.ctrlKey) {
    partial = false;
    queue = [];
    commands = [...commands, [getDate(), `^C${input}`]];
    input = "";
    return;
  }

  if (e.key !== "Enter") {
    return;
  }

  let currentQueue = queue ?? [];
  let pop = null;
  for (let i = 0; i < currentQueue.length; i++) {
    const q = currentQueue[i];
    const [, text] = q;
    if (text === " ") {
      commands = [...commands, q];
      partial = true;
      pop = i;
      break;
    }

    commands = [...commands, q];
    pop = i;
  }

  if (pop !== null) {
    queue = currentQueue.slice(pop + 1);
    return;
  }

  partial = false;
}
</script>

<svelte:window on:click={focusEnd} bind:innerWidth on:keydown={partialContinue} />

<div
  class="absolute flex justify-center items-center inset-0 m-auto bg-black/50 z-10"
>
  <div class="bg-gray-700 flex w-full h-full flex-col-reverse p-8">
    <form
      class="font-mono flex flex-col-reverse px-4 pt-4 border-2 border-white h-full overflow-auto"
      on:submit|preventDefault={handleSubmit}
    >
      <div class="sticky bottom-0 bg-gray-700 pb-4">
        <span>$ &gt;</span>
        <!-- svelte-ignore a11y_autofocus -->
        {#if !loading && !partial}
          <input
            autofocus
            class="outline-0 caret"
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
            <span
              class={classNames(
                command.startsWith("*") && command.endsWith("*") && "italic",
                command.startsWith("_") && command.endsWith("_") && "font-bold"
              )}
            >
              {cleanString(command)}
              {#if command === " "}
                &nbsp;
              {/if}
            </span>
          </span>
        </div>
      {/each}
      {#each [...intro].reverse() as text}
        <div>
          <pre class="text-wrap">{text}</pre>
        </div>
      {/each}
    </form>
  </div>
</div>
