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
    plugins: [tailwind()],
  },
  outDir: "build",
});
