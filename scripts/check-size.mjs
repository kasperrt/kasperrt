import { readFile, readdir } from "node:fs/promises";
import { safeWrapAsync } from "../src/utils/wrap.ts";

const resourceBudget = 14000;

async function checkSizes() {
  const [readError, resources] = await safeWrapAsync(() =>
    Promise.all([readFile("build/index.html", "utf8"), readdir("build", { recursive: true })]),
  );
  if (readError) {
    return new Error("Build the site before checking resource sizes", { cause: readError });
  }
  const [html, files] = resources;
  const initial = new Set(["index.html"]);
  for (const match of html.matchAll(/(?:src|href)="\/(?!\/)([^"?#]+\.(?:css|js|woff2|webp|ico))"/g)) {
    const [, file] = match;
    if (file) {
      initial.add(file);
    }
  }
  const checked = new Set([
    ...initial,
    ...files.filter((file) => /\.(?:html|js|css|svg|woff2)$/.test(file) || /^projects\/.*\.webp$/.test(file)),
  ]);
  const sizes = await Promise.all(
    Array.from(checked, async (file) => {
      const [error, body] = await safeWrapAsync(() => readFile(`build/${file}`));
      if (error) {
        return new Error(`Could not measure ${file}`, { cause: error });
      }
      let transferred = body.length;
      if (/\.(?:html|css|js|svg)$/.test(file)) {
        const [compressionError, compressed] = await safeWrapAsync(() => readFile(`build/${file}.br`));
        if (compressionError) {
          return new Error(`Could not measure the compressed ${file}`, { cause: compressionError });
        }
        transferred = compressed.length;
      }
      return { file, bytes: body.length, transferred };
    }),
  );
  let total = 0;
  let overBudget = false;
  for (const size of sizes) {
    if (size instanceof Error) {
      return size;
    }
    if (initial.has(size.file)) {
      total += size.transferred;
      console.log(`${(size.transferred / 1000).toFixed(2)} KB transferred · ${size.file}`);
    }
    if (size.transferred > resourceBudget) {
      console.error(`Over the 14 KB resource budget: ${size.file} (${size.transferred} bytes)`);
      overBudget = true;
    }
  }
  console.log(`Initial first-party resources: ${(total / 1000).toFixed(2)} KB, excluding HTTP headers.`);
  console.log("Text sizes use the build's Brotli files. Saved windows and external embeds load separately.");
  if (overBudget) {
    return new Error("The build exceeds its resource budget");
  }
}

const error = await checkSizes();
if (error) {
  console.error(error);
  process.exitCode = 1;
}
