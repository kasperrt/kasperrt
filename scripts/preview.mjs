import { spawn } from "node:child_process";
import { resolve } from "node:path";

const command = process.env.CADDY_BIN ?? "caddy";
const server = spawn(command, ["run", "--config", "Caddyfile", "--adapter", "caddyfile"], {
  stdio: "inherit",
  env: {
    ...process.env,
    SITE_ADDRESS: "http://127.0.0.1:4174",
    SITE_ROOT: resolve("build"),
  },
});
server.on("error", (error) => {
  console.error(
    new Error("Install Caddy or set CADDY_BIN to its executable to run the production preview", { cause: error }),
  );
  process.exitCode = 1;
});
server.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}
