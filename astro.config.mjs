import { defineConfig } from "astro/config";
import tailwind from "@tailwindcss/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  site: "https://kasperrt.me",
  vite: {
    plugins: [
      tailwind(),
      sentryVitePlugin({
        sourcemaps: {
          filesToDeleteAfterUpload: ["./build/**/*.map"],
          disable: !createSentryRelease,
        },
        silent: true,
        org: "kasperrt",
        project: "kasperrtme",
      }),
    ],
  },
  outDir: "build",
});
