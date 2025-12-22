import { defineConfig } from "astro/config";
import tailwind from "@tailwindcss/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  site: "https://kasperrt.me",
  vite: {
    plugins: [
      tailwind(),
      sentryVitePlugin({
        org: "kasperrt",
        project: "kasperrtme",
      }),
    ],
  },
  outDir: "build",
});
