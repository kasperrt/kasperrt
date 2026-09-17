import { defineConfig } from "astro/config";
import tailwind from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import { createSitemapSerialize } from "./src/utils/sitemap.ts";

const site = "https://kasperrt.me";

export default defineConfig({
  site,
  devToolbar: { enabled: false },
  markdown: {
    syntaxHighlight: "shiki",
    shikiConfig: {
      theme: "one-light",
    },
  },
  compressHTML: true,
  output: "static",
  redirects: { "/console": "/" },
  integrations: [
    sitemap({
      serialize: createSitemapSerialize({ site }),
      filter: (url) => !url.includes("/windows/"),
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
