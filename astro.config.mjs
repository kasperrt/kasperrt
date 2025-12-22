import { defineConfig } from "astro/config";
import tailwind from "@tailwindcss/vite";

export default defineConfig({
  site: "https://kasperrt.me",
  vite: {
    plugins: [tailwind()],
  },
  outDir: "build",
});
