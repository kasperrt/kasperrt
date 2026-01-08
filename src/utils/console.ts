import { safeWrapAsync } from "~/utils/wrap";
import type { CvEntry } from "~/schemas/more";
import { httpClient, trackingClient } from "~/utils/http";

export type ConsoleCommand = string | { type: "uptime" };
export type ConsoleLine = [string, ConsoleCommand];

/**
 * I know it is fun to poke around here to figure out easter eggs,
 * but it would of course be more fun to find them on your own.
 */

let mounted = false;

export async function openConsole() {
  if (mounted) {
    return;
  }

  mounted = true;

  const [err, res] = await safeWrapAsync(() =>
    Promise.all([import("svelte"), import("../components/Console.svelte")])
  );

  if (err) {
    mounted = false;
    return;
  }

  const [{ mount }, { default: Console }] = res;
  mount(Console, { target: document.body });
}

export type CommandResult =
  | { type: "append"; lines: ConsoleLine[]; echoInput?: boolean }
  | { type: "replace"; lines: ConsoleLine[] }
  | {
      type: "queue";
      lines: ConsoleLine[];
      remaining: ConsoleLine[];
      partial: boolean;
      echoInput?: boolean;
    }
  | { type: "exit"; echoInput?: boolean };

type CommandProps = {
  input: string;
  getDate: () => string;
};

const asciiLines = [
  "██╗  ██╗ █████╗ ███████╗██████╗ ███████╗██████╗",
  "██║ ██╔╝██╔══██╗██╔════╝██╔══██╗██╔════╝██╔══██╗",
  "█████╔╝ ███████║███████╗██████╔╝█████╗  ██████╔╝",
  "██╔═██╗ ██╔══██║╚════██║██╔═══╝ ██╔══╝  ██╔══██╗",
  "██║  ██╗██║  ██║███████║██║     ███████╗██║  ██║",
  "╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝",
  "\n",
];

const helpEntries = [
  "help",
  "about",
  "whoami",
  "uptime",
  "cv",
  "links",
  "clear",
  "exit",
];

const allowedCommands = new Set(
  helpEntries.map((entry) => entry.split(" ")[0])
);

export function getAsciiLines() {
  return asciiLines;
}

export function getIntroLines() {
  return [
    "Hey, I'm Kasper and this is my website terminal.",
    "\n",
    "I tried to add some easter eggs here (such as this),",
    "but seeing everything is publicly available on GitHub, checking there is kinda boring.",
    "\n",
  ];
}

export function consumeQueue(queue: ConsoleLine[]) {
  const lines: ConsoleLine[] = [];
  let stopIndex = -1;
  let partial = false;

  for (let i = 0; i < queue.length; i++) {
    const line = queue[i];
    lines.push(line);

    if (typeof line[1] === "string" && line[1] === " ") {
      partial = true;
      stopIndex = i;
      break;
    }

    stopIndex = i;
  }

  let remaining: ConsoleLine[] = [];
  if (stopIndex !== -1) {
    remaining = queue.slice(stopIndex + 1);
  }

  return { lines, remaining, partial };
}

export async function runCommand({
  input,
  getDate,
}: CommandProps): Promise<CommandResult> {
  const trimmed = input.trim();
  const [command = ""] = trimmed.split(" ");

  if (input.includes("/etc/passwd")) {
    trackCommand("passwd");
    return {
      type: "append",
      lines: [[getDate(), "no, but good try"]],
    };
  }

  if (input.startsWith("ssh")) {
    trackCommand("ssh");
    return {
      type: "append",
      lines: [
        [getDate(), `command not found: ${input}`],
        ["", "You really think this would have ssh?"],
      ],
    };
  }

  if (input.startsWith("sudo") || input.startsWith("su ")) {
    if (input.startsWith("su ")) {
      trackCommand("su");
    }
    if (input.startsWith("sudo")) {
      trackCommand("sudo");
    }
    return {
      type: "append",
      lines: [[getDate(), "not granted (obviously)"]],
    };
  }

  if (!allowedCommands.has(command)) {
    return {
      type: "append",
      lines: [[getDate(), `command not found: ${input}`]],
    };
  }

  trackCommand(command);

  switch (command) {
    case "help":
      return {
        type: "append",
        echoInput: true,
        lines: formatHelpLines(),
      };
    case "about":
      return {
        type: "append",
        echoInput: true,
        lines: toOutputLines([
          "Kasper Rynning-Tonnesen - developer and engineer.",
          "This terminal is a tiny playground on kasperrt.me.",
          "Type help to see what it can do.",
        ]),
      };
    case "whoami":
      return {
        type: "append",
        echoInput: true,
        lines: toOutputLines(["guest@kasperrt.me", "access: read-only"]),
      };
    case "uptime":
      return {
        type: "append",
        echoInput: true,
        lines: [["", { type: "uptime" }]],
      };
    case "links":
      return {
        type: "append",
        echoInput: true,
        lines: [
          ["GitHub", "https://github.com/kasperrt"],
          ["LinkedIn", "https://www.linkedin.com/in/kasperrt/"],
          ["Blog", "https://kasperrt.me/blog"],
          ["Email", "mailto:kasper@rynning-toennesen.email"],
        ],
      };
    case "clear":
      return {
        type: "replace",
        lines: [[getDate(), input]],
      };
    case "exit":
      return {
        type: "exit",
        echoInput: true,
      };
    case "cv": {
      const cvEntries = await getCvEntries();
      if (!cvEntries.length) {
        return {
          type: "append",
          echoInput: true,
          lines: toOutputLines([
            "cv doesn't seem to be available at this time...",
          ]),
        };
      }

      const queued = cvEntries.map(
        ({ label, text }) => [label, text] as ConsoleLine
      );
      const { lines, remaining, partial } = consumeQueue(queued);

      return {
        type: "queue",
        echoInput: true,
        lines,
        remaining,
        partial,
      };
    }
  }

  return {
    type: "append",
    lines: [[getDate(), `command not found: ${input}`]],
  };
}

function toOutputLines(lines: string[]): ConsoleLine[] {
  return lines.map((line) => ["", line]);
}

function formatHelpLines(): ConsoleLine[] {
  const lines = ["available commands:", ...helpEntries];
  return toOutputLines(lines);
}

function trackCommand(command: string) {
  trackingClient.post("/api/event", null, {
    d: "kasperrt.me",
    n: "pageview",
    r: null,
    u: `https://analytics.kasperrt.me/console.${command}`,
  });
}

async function getCvEntries(): Promise<CvEntry[]> {
  const [err, data] = await httpClient.get("/cv.json", null, {
    cacheRequest: true,
    cacheTimeToLive: 864000,
  });
  if (err) {
    return getCvEntries();
  }

  return data
    .filter((entry) => typeof entry === "object" && entry !== null)
    .map((entry) => {
      let label = "";
      let text = "";

      if (typeof entry.label === "string") {
        label = entry.label;
      }

      if (typeof entry.text === "string") {
        text = entry.text;
      }

      return { label, text };
    });
}
