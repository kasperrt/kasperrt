interface ShellOutput {
  text: string;
  passwordCommand?: never;
}

interface ShellPasswordPrompt {
  text?: never;
  passwordCommand: string;
}

type ShellReply = ShellOutput | ShellPasswordPrompt;

const files: Record<string, string | undefined> = {
  "/etc/hosts":
    "127.0.0.1   localhost\n::1         localhost\n127.0.0.1   home-sweet-home\n0.0.0.0     unnecessary-meetings\n\n# Works on my machine. This is my machine.",
  "/etc/passwd":
    "root:x:0:0:Nice try:/root:/bin/nope\nkasper:x:1993:1993:Probably making something:/home/kasper:/bin/zsh\nguest:x:1000:1000:You are here:/home/guest:/bin/curiosity\n\n# The x is not a treasure map.",
  "/etc/motd": "Welcome to kasperrt.me.\nEverything here is made of pixels. Including your root privileges.",
  "readme.md": "Kasper Rynning-Tønnesen. CTO & cofounder at embroidery, Oslo.",
  "readme.txt": "Kasper Rynning-Tønnesen. CTO & cofounder at embroidery, Oslo.",
};

function sudoReply(name: string, args: string[], elevated: boolean): ShellReply {
  if (elevated) {
    return { text: "You are already root." };
  }
  const [option] = args;
  if (name === "sudo" && (!option || option === "--help" || option === "-h")) {
    return { text: "usage: sudo <command>\nFor when asking politely did not work." };
  }
  if (option === "-k") {
    return { text: "Credentials cleared." };
  }
  if (name === "su") {
    return { passwordCommand: "whoami" };
  }
  if (option && ["-s", "-i", "-v"].includes(option)) {
    return { passwordCommand: "whoami" };
  }
  return { passwordCommand: args.join(" ") };
}

function readFile(path: string, elevated: boolean) {
  if (path !== "/etc/shadow") {
    return files[path] ?? `cat: ${path}: No such file or directory`;
  }
  if (elevated) {
    return "root:********:not-today\n\nEven root has boundaries.";
  }
  return "cat: /etc/shadow: Permission denied\nA little mystery is healthy.";
}

export function getShellReply(command: string, elevated = false): ShellReply | undefined {
  const [inputName = "", ...args] = command.trim().split(/\s+/);
  const name = inputName.toLowerCase();
  switch (name) {
    case "sudo":
    case "su":
      return sudoReply(name, args, elevated);
    case "cat":
    case "less":
    case "more":
      if (!args.length) {
        return { text: "Read what? Try cat /etc/hosts." };
      }
      return { text: args.map((path) => readFile(path, elevated)).join("\n\n") };
    case "/etc/hosts":
    case "/etc/passwd":
    case "/etc/shadow":
    case "/etc/motd":
      return { text: readFile(name, elevated) };
    case "ls":
    case "dir":
      if (args.some((arg) => arg.replace(/\/$/, "") === "/etc")) {
        return { text: "hosts   passwd   shadow   motd" };
      }
      return;
    case "whoami":
      if (elevated) {
        return { text: "root" };
      }
      return;
    case "pwd":
      return { text: "/home/guest" };
    case "logout":
      return { text: "logout: not a login shell\nYou have successfully logged out of responsibility." };
    case "rm":
      if (elevated) {
        return { text: "Removing absolutely nothing...\nThe pixels have unionised. Operation cancelled." };
      }
      return { text: "Permission denied. These are load-bearing pixels." };
    case "uname":
      return { text: "KasperOS 0.0.1 (browser edition)\nKernel: mostly CSS." };
    case "fortune":
      return { text: "Your next bug is a timezone bug.\nUnless it is cache invalidation." };
    case "coffee":
      return { text: "418 I'm a teapot.\nYou knew this was coming." };
    case "sl":
      return {
        text: "     ====        ________\n _D _|  |_______/        |\n  |(_)---  |   H________|\n /     |   |   H________|\n|______|___|__/   |  |\n   O      O       O  O\n\nWrong platform. Your train is in another terminal.",
      };
    default:
      return;
  }
}
