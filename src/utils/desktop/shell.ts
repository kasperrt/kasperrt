type ShellReply = { text: string; passwordCommand?: string };

const files: Record<string, string> = {
  "/etc/hosts":
    "127.0.0.1   localhost\n::1         localhost\n127.0.0.1   home-sweet-home\n0.0.0.0     unnecessary-meetings\n\n# Works on my machine. This is my machine.",
  "/etc/passwd":
    "root:x:0:0:Nice try:/root:/bin/nope\nkasper:x:1993:1993:Probably making something:/home/kasper:/bin/zsh\nguest:x:1000:1000:You are here:/home/guest:/bin/curiosity\n\n# The x is not a treasure map.",
  "/etc/motd": "Welcome to kasperrt.me.\nEverything here is made of pixels. Including your root privileges.",
  "readme.md": "Kasper Rynning-Tønnesen. CTO & cofounder at embroidery, Oslo.",
  "readme.txt": "Kasper Rynning-Tønnesen. CTO & cofounder at embroidery, Oslo.",
};

export function getShellReply(command: string, elevated = false): ShellReply | undefined {
  const [inputName, ...args] = command.trim().split(/\s+/);
  const name = inputName.toLowerCase();
  function readFile(path: string) {
    if (path === "/etc/shadow")
      return elevated
        ? "root:********:not-today\n\nEven imaginary root has boundaries."
        : "cat: /etc/shadow: Permission denied\nA little mystery is healthy.";
    return files[path] ?? `cat: ${path}: No such file or directory`;
  }
  switch (name) {
    case "sudo":
    case "su": {
      if (elevated) return { text: "You are already as root as a website will let you be." };
      if (name === "sudo" && (!args.length || args[0] === "--help" || args[0] === "-h"))
        return { text: "usage: sudo <command>\nFor when asking politely did not work." };
      if (args[0] === "-k") return { text: "Forgot the imaginary password. Very secure." };
      const passwordCommand = name === "su" || ["-s", "-i", "-v"].includes(args[0]) ? "whoami" : args.join(" ");
      return {
        text: "This is pretend sudo. Make up a password; it will not be kept.\nEsc or Ctrl+C cancels.",
        passwordCommand,
      };
    }
    case "cat":
    case "less":
    case "more":
      return { text: args.length ? args.map(readFile).join("\n\n") : "Read what? Try cat /etc/hosts." };
    case "/etc/hosts":
    case "/etc/passwd":
    case "/etc/shadow":
    case "/etc/motd":
      return { text: readFile(name) };
    case "ls":
    case "dir":
      if (args.some((arg) => arg.replace(/\/$/, "") === "/etc")) return { text: "hosts   passwd   shadow   motd" };
      return;
    case "whoami":
      if (elevated) return { text: "root\n(Decorative privileges only.)" };
      return;
    case "pwd":
      return { text: "/home/guest" };
    case "logout":
      return { text: "logout: not a login shell\nYou have successfully logged out of responsibility." };
    case "rm":
      return {
        text: elevated
          ? "Removing absolutely nothing...\nThe pixels have unionised. Operation cancelled."
          : "Permission denied. These are load-bearing pixels.",
      };
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
