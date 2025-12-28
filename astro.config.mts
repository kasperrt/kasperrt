import { defineConfig } from "astro/config";
import tailwind from "@tailwindcss/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import sitemap from "@astrojs/sitemap";
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
  integrations: [
    sitemap({
      serialize: createSitemapSerialize({ site }),
    }),
  ],
  vite: {
    build: {
      minify: true,
    },
    plugins: [
      tailwind(),
      sentryVitePlugin({
        sourcemaps: {
          filesToDeleteAfterUpload: ["./build/**/*.map"],
          disable: false,
        },
        silent: true,
        org: "kasperrt",
        project: "kasperrtme",
        bundleSizeOptimizations: {
          excludeDebugStatements: true,
          excludeReplayIframe: true,
          excludeReplayShadowDom: true,
          excludeReplayWorker: true,
          excludeTracing: true,
        },
      }),
    ],
  },
  outDir: "build",
});
