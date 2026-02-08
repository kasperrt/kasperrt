import { defineConfig } from "astro/config";
import tailwind from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import svelte from "@astrojs/svelte";
import { createSitemapSerialize } from "./src/utils/sitemap.ts";

const site = "https://kasperrt.me";

export default defineConfig({
  site,
  markdown: {
    syntaxHighlight: "shiki",
    shikiConfig: {
      themes: {
        light: "one-light",
        dark: "one-dark-pro",
        dim: "one-dark-pro",
      },
    },
  },
  compressHTML: true,
  output: "static",
  integrations: [
    svelte(),
    sitemap({
      serialize: createSitemapSerialize({ site }),
    }),
  ],
  vite: {
    build: {
      minify: "terser",
    },
    // Astro currently types against a different Vite major than @tailwindcss/vite.
    // Cast to avoid type conflicts while keeping runtime behavior unchanged.
    // biome-ignore lint/suspicious/noExplicitAny: Astro and @tailwindcss/vite currently type against different Vite majors.
    plugins: [tailwind() as any],
  },
  outDir: "build",
});
