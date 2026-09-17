import { getPageProjects } from "../data/projects";
import { formatAliveDuration } from "./uptime";
import { initDesktop } from "./desktop/windows";
import { getShellReply } from "./desktop/shell";

let cleanup: (() => void) | undefined;
const history: string[] = [];
type Line = { text: string; href?: string; command?: boolean; uptime?: boolean };
const lines: Line[] = [{ text: "kasperrt.me" }, { text: "Type help for available commands." }];

function initDesktopApplication() {
  cleanup?.();
  if (!document.querySelector("[data-window]")) return;
  const controller = new AbortController();
  const { signal } = controller;
  const desktop = initDesktop(signal);
  const input = document.querySelector<HTMLInputElement>("#shell-input");
  const output = document.querySelector<HTMLElement>(".terminal-output");
  const terminal = document.querySelector<HTMLElement>('[data-window="terminal"]');
  const promptLabel = document.querySelector<HTMLLabelElement>(".terminal-input-row label");
  let passwordCommand: string | undefined;
  let historyIndex = history.length;
  function renderLine(line: Line) {
    const row = document.createElement("p");
    if (line.command) {
      row.className = "command-echo";
      const context = document.querySelector(".gnzh-context")?.cloneNode(true);
      if (context) row.append(context);
      const command = document.createElement("span");
      command.textContent = `╰─➤ ${line.text}`;
      row.append(command);
      output?.append(row);
      return;
    }
    if (line.uptime) {
      row.dataset.uptime = "";
      row.textContent = `Uptime: ${formatAliveDuration(new Date())}`;
    } else if (line.href) {
      const link = document.createElement("a");
      link.textContent = line.text;
      link.href = line.href;
      if (line.href.startsWith("https://")) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
      row.append(link);
    } else row.textContent = line.text;
    output?.append(row);
  }
  output?.replaceChildren();
  lines.forEach(renderLine);
  function append(line: Line) {
    lines.push(line);
    renderLine(line);
    if (lines.length > 250) {
      lines.shift();
      output?.firstElementChild?.remove();
    }
  }
  function updateTime() {
    const now = new Date();
    for (const clock of document.querySelectorAll("[data-clock]"))
      clock.textContent = now.toLocaleTimeString("en-GB", {
        timeZone: "Europe/Oslo",
        hour: "2-digit",
        minute: "2-digit",
      });
    for (const uptime of document.querySelectorAll("[data-uptime]"))
      uptime.textContent = `Uptime: ${formatAliveDuration(now)}`;
  }
  updateTime();
  const interval = window.setInterval(updateTime, 1000);
  const commands = [
    "help",
    "about",
    "whoami",
    "ls",
    "projects",
    "writing",
    "cv",
    "contact",
    "github",
    "uptime",
    "date",
    "cat",
    "pwd",
    "sudo",
    "su",
    "logout",
    "uname",
    "fortune",
    "coffee",
    "clear",
    "exit",
  ];
  function passwordPrompt(command?: string) {
    passwordCommand = command;
    if (!input || !promptLabel) return;
    input.value = "";
    input.type = command ? "password" : "text";
    input.autocomplete = command ? "new-password" : "off";
    input.setAttribute("aria-label", command ? "Imaginary sudo password" : "Terminal command");
    if (command) input.removeAttribute("name");
    else input.name = "command";
    promptLabel.textContent = command ? "[sudo] password for guest: " : "╰─➤ ";
  }
  function execute(command: string, elevated = false) {
    const reply = getShellReply(command, elevated);
    if (reply) {
      append({ text: reply.text });
      if (reply.passwordCommand) passwordPrompt(reply.passwordCommand);
      return;
    }
    const [name] = command.toLowerCase().split(/\s+/);
    switch (name) {
      case "help":
        append({
          text: "about      About Kasper\nwhoami     Current user\nls         List files\ncat        Read a file (try /etc/hosts)\npwd        Working directory\nprojects   Side projects\nwriting    Blog\ncv         Curriculum vitae\ncontact    Email\ngithub     GitHub profile\nuptime     Time since 29 August 1993\ndate       Current time in Oslo\nclear      Clear the screen\nexit       Close terminal\n\n↑ / ↓: command history. Tab: complete a command.\nCtrl+C: cancel. Ctrl+D: close an empty prompt.\nA few familiar Unix commands also work. Sort of.",
        });
        break;
      case "about":
        append({
          text: "Kasper Rynning-Tønnesen\nCTO & cofounder at embroidery.\nOslo, Norway.\nGo, TypeScript, PostgreSQL.",
        });
        break;
      case "whoami":
        append({ text: "guest" });
        break;
      case "ls":
      case "dir":
        append({ text: "Home", href: "/" });
        append({ text: "Projects/", href: "/projects" });
        append({ text: "Writing/", href: "/blog" });
        append({ text: "CV", href: "/more" });
        break;
      case "projects":
        for (const project of getPageProjects())
          append({ text: `${project.name}: ${project.tagline}`, href: project.url });
        break;
      case "writing":
        append({ text: "Read the blog", href: "/blog" });
        break;
      case "cv":
        append({ text: "Curriculum vitae", href: "/more" });
        break;
      case "contact":
        append({ text: "kasper@rynning-toennesen.email", href: "mailto:kasper@rynning-toennesen.email" });
        break;
      case "github":
        append({ text: "github.com/kasperrt", href: "https://github.com/kasperrt" });
        break;
      case "uptime":
        append({ text: "", uptime: true });
        break;
      case "date":
        append({ text: new Date().toLocaleString("en-GB", { timeZone: "Europe/Oslo", timeZoneName: "short" }) });
        break;
      case "clear":
        lines.length = 0;
        output?.replaceChildren();
        break;
      case "exit":
        desktop.close("terminal");
        break;
      default:
        append({ text: `${name}: command not found. Type help for available commands.` });
    }
  }
  function scrollToPrompt() {
    if (output) output.scrollTop = output.scrollHeight;
  }
  function run(raw: string) {
    const command = raw.trim();
    if (!command) return;
    if (passwordCommand !== undefined) passwordPrompt();
    history.push(command);
    historyIndex = history.length;
    append({ text: command, command: true });
    execute(command);
    scrollToPrompt();
  }
  document.querySelector(".terminal-input-row")?.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      if (!input) return;
      if (passwordCommand !== undefined) {
        const command = passwordCommand;
        passwordPrompt();
        append({ text: "Password accepted. Suspiciously easy, wasn't it?" });
        execute(command, true);
      } else {
        const command = input.value;
        input.value = "";
        run(command);
      }
      scrollToPrompt();
      input.focus();
    },
    { signal },
  );
  document.querySelector(".terminal-body")?.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element) || target.closest("a, button, input")) return;
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) return;
      input?.focus({ preventScroll: true });
    },
    { signal },
  );
  const terminalObserver = new MutationObserver(() => {
    if (terminal?.hidden && passwordCommand !== undefined) passwordPrompt();
  });
  if (terminal) terminalObserver.observe(terminal, { attributes: true, attributeFilter: ["hidden"] });
  document.querySelector("[data-uptime-open]")?.addEventListener("click", () => run("uptime"), { signal });
  input?.addEventListener(
    "keydown",
    (event) => {
      if (
        (event.ctrlKey && event.key.toLowerCase() === "c") ||
        (passwordCommand !== undefined && event.key === "Escape")
      ) {
        const selection = window.getSelection();
        if (passwordCommand === undefined && selection && !selection.isCollapsed) return;
        event.preventDefault();
        passwordPrompt();
        append({ text: "^C" });
        scrollToPrompt();
        return;
      }
      if (event.ctrlKey && event.key.toLowerCase() === "d" && !input.value) {
        event.preventDefault();
        if (passwordCommand !== undefined) passwordPrompt();
        else desktop.close("terminal");
        return;
      }
      if (passwordCommand !== undefined) {
        if (event.key === "ArrowUp" || event.key === "ArrowDown") event.preventDefault();
        return;
      }
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        historyIndex = Math.max(0, Math.min(history.length, historyIndex + (event.key === "ArrowUp" ? -1 : 1)));
        input.value = history[historyIndex] ?? "";
        input.setSelectionRange(input.value.length, input.value.length);
      }
      if (event.key === "Tab" && input.value.trim()) {
        const matches = commands.filter((command) => command.startsWith(input.value.trim().toLowerCase()));
        if (matches.length === 1) {
          event.preventDefault();
          input.value = matches[0];
        }
      }
    },
    { signal },
  );
  const search = document.querySelector<HTMLInputElement>("[data-project-search]");
  search?.addEventListener(
    "input",
    () => {
      let count = 0;
      for (const record of document.querySelectorAll<HTMLElement>("[data-project-record]")) {
        record.hidden = !record.dataset.projectRecord?.includes(search.value.trim().toLowerCase());
        if (!record.hidden) count++;
      }
      const label = document.querySelector("[data-project-count]");
      if (label) label.textContent = `${count} project${count === 1 ? "" : "s"}`;
      const empty = document.querySelector<HTMLElement>("[data-project-empty]");
      if (empty) empty.hidden = count > 0;
    },
    { signal },
  );
  cleanup = () => {
    passwordPrompt();
    terminalObserver.disconnect();
    controller.abort();
    clearInterval(interval);
    desktop.cleanup();
  };
}
document.addEventListener("astro:page-load", initDesktopApplication);
document.addEventListener("astro:before-swap", () => cleanup?.());
initDesktopApplication();
