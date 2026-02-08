import { writable, get } from "svelte/store";
import { type ConsoleLine, consumeQueue, runCommand, getIntroLines, getAsciiLines } from "~/utils/console";
import { safeWrapAsync } from "~/utils/wrap";

export type ConsoleControllerState = {
  commands: ConsoleLine[];
  input: string;
  loading: boolean;
  partial: boolean;
  historyIndex: number;
};

export class ConsoleController {
  // Stores
  public readonly commands = writable<ConsoleLine[]>([]);
  public readonly input = writable<string>("");
  public readonly loading = writable<boolean>(false);
  public readonly partial = writable<boolean>(false);
  public readonly queue = writable<ConsoleLine[] | null>(null);
  public readonly historyIndex = writable<number>(-1);

  // Derived / helpers
  public readonly introLines: string[];
  public readonly asciiLines: string[];

  // Private history state
  private history: string[] = [];

  public constructor() {
    this.introLines = getIntroLines();
    this.asciiLines = getAsciiLines();
  }

  private getDate = () => {
    return new Date().toTimeString().split(" ")[0];
  };

  public setInput = (val: string) => {
    this.input.set(val);
  };

  public reset = () => {
    this.commands.set([]);
    this.input.set("");
    this.loading.set(false);
    this.partial.set(false);
    this.queue.set(null);
    this.historyIndex.set(-1);
    this.history = [];
  };

  public consumeQueue = () => {
    const currentQueue = get(this.queue) ?? [];
    const { lines, remaining, partial: stillPartial } = consumeQueue(currentQueue);

    if (lines.length) {
      this.commands.update((cmds) => [...cmds, ...lines]);
    }

    const nextQueue = remaining.length ? remaining : null;
    this.queue.set(nextQueue);
    this.partial.set(stillPartial);
  };

  public submit = async (onExit?: () => void): Promise<boolean> => {
    if (get(this.loading)) {
      return false;
    }

    const inputValue = get(this.input);
    const isPartial = get(this.partial);
    const isQueue = get(this.queue) !== null;

    this.loading.set(true);
    this.historyIndex.set(-1);

    // If waiting for partial output (e.g. "press enter..."), empty input continues queue
    if (inputValue === "" && (isPartial || isQueue)) {
      this.partial.set(false);
      this.queue.set(null);
      this.loading.set(false);
      return true; // redraw needed
    }

    if (inputValue.trim() !== "") {
      this.history.push(inputValue);
    }

    const [err, result] = await safeWrapAsync(() => runCommand({ input: inputValue, getDate: this.getDate }));

    if (err || !result) {
      this.commands.update((cmds) => [...cmds, [this.getDate(), "something went wrong, try again."]]);
      this.input.set("");
      this.loading.set(false);
      return true;
    }

    if (result.type === "replace") {
      this.commands.set(result.lines);
      this.input.set("");
      this.loading.set(false);
      return true;
    }

    if (result.echoInput) {
      this.commands.update((cmds) => [...cmds, [this.getDate(), inputValue]]);
    }

    switch (result.type) {
      case "append": {
        this.commands.update((cmds) => [...cmds, ...result.lines]);
        break;
      }
      case "queue": {
        this.commands.update((cmds) => [...cmds, ...result.lines]);
        const nextQueue = result.remaining.length ? result.remaining : null;
        this.queue.set(nextQueue);
        this.partial.set(result.partial);
        break;
      }
      case "exit": {
        if (onExit) {
          onExit();
        } else {
          window.location.href = "/";
        }
        return false; // Exit handles navigation
      }
    }

    this.input.set("");
    this.loading.set(false);
    return true;
  };

  public handleKeyDown = async (e: KeyboardEvent, onEnter?: () => void | Promise<void>) => {
    const isPartial = get(this.partial);
    const inputValue = get(this.input);

    // Partial / Queue interruption
    if (isPartial) {
      if (e.key === "c" && e.ctrlKey) {
        this.partial.set(false);
        this.queue.set(null);
        this.commands.update((cmds) => [...cmds, [this.getDate(), `^C${inputValue}`]]);
        this.input.set("");
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        this.consumeQueue();
        return;
      }
    }

    // Ctrl+C
    if (e.key === "c" && e.ctrlKey) {
      this.commands.update((cmds) => [...cmds, [this.getDate(), `^C${inputValue}`]]);
      this.input.set("");
      return;
    }

    // Regular navigation
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (this.history.length === 0) {
        return;
      }

      const idx = get(this.historyIndex);
      const newIdx = idx === -1 ? this.history.length - 1 : Math.max(0, idx - 1);
      this.historyIndex.set(newIdx);
      this.input.set(this.history[newIdx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const idx = get(this.historyIndex);
      if (idx === -1) {
        return;
      }

      if (idx >= this.history.length - 1) {
        this.historyIndex.set(-1);
        this.input.set("");
        return;
      }

      const newIdx = idx + 1;
      this.historyIndex.set(newIdx);
      this.input.set(this.history[newIdx]);
    } else if (e.key === "Enter" && !get(this.loading)) {
      e.preventDefault();
      if (onEnter) {
        await onEnter();
      } else {
        await this.submit();
      }
    }
  };
}
