import { readFile, readdir, writeFile } from "node:fs/promises";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";
import { safeWrapAsync } from "../src/utils/wrap.ts";

async function compressBuild() {
  const files = await readdir("build", { recursive: true });
  for (const file of files) {
    if (!/\.(html|css|js|json|xml|svg|txt)$/.test(file)) {
      continue;
    }
    const path = `build/${file}`;
    const body = await readFile(path);
    await Promise.all([
      writeFile(`${path}.br`, brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } })),
      writeFile(`${path}.gz`, gzipSync(body, { level: 6 })),
    ]);
  }
}

const [error] = await safeWrapAsync(compressBuild);
if (error) {
  console.error(new Error("Could not compress the static build", { cause: error }));
  process.exitCode = 1;
}
