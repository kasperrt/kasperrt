import { getPageProjects } from "../data/projects";
import { formatAliveDuration } from "./uptime";
import { initDesktop } from "./desktop/windows";

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
    "clear",
    "exit",
  ];
  function run(raw: string) {
    const command = raw.trim();
    if (!command) return;
    history.push(command);
    historyIndex = history.length;
    append({ text: command, command: true });
    const [name, ...args] = command.toLowerCase().split(/\s+/);
    switch (name) {
      case "help":
        append({
          text: "about      About Kasper\nwhoami     Current user\nls         List files\nprojects   Side projects\nwriting    Blog\ncv         Curriculum vitae\ncontact    Email\ngithub     GitHub profile\nuptime     Time since 29 August 1993\ndate       Current time in Oslo\nclear      Clear the screen\nexit       Close terminal\n\n↑ / ↓: command history. Tab: complete a command.",
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
      case "cat":
        if (args[0] === "readme.md" || args[0] === "readme.txt")
          append({ text: "Kasper Rynning-Tønnesen. CTO & cofounder at embroidery, Oslo." });
        else append({ text: `No such file: ${args.join(" ") || "(missing filename)"}` });
        break;
      default:
        append({ text: `${name}: command not found. Type help for available commands.` });
    }
    if (output) output.scrollTop = output.scrollHeight;
  }
  document.querySelector(".terminal-input-row")?.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      if (!input) return;
      run(input.value);
      input.value = "";
      input.focus();
    },
    { signal },
  );
  document.querySelector("[data-uptime-open]")?.addEventListener("click", () => run("uptime"), { signal });
  input?.addEventListener(
    "keydown",
    (event) => {
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
    controller.abort();
    clearInterval(interval);
    desktop.cleanup();
  };
}
document.addEventListener("astro:page-load", initDesktopApplication);
document.addEventListener("astro:before-swap", () => cleanup?.());
initDesktopApplication();
