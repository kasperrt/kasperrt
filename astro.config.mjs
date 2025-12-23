import { defineConfig } from "astro/config";
import tailwind from "@tailwindcss/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  site: "https://kasperrt.me",
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
