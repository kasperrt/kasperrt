Insert more meta-humor here 🌊

`pnpm dev --port 4173` runs the live development server.

`pnpm build` generates the site, CV PDF, images, and Brotli/gzip files, then checks the 14 KB resource budget. The budget covers all HTML pages and window fragments, JavaScript, CSS, webfonts, the homepage portrait/favicon, and project thumbnails. Text is measured using the Brotli bytes served to supporting browsers; gzip and uncompressed fallbacks remain available. Social previews and the downloadable PDF are separate, on-demand assets.

`pnpm preview` serves that build at http://127.0.0.1:4174 using the same Caddy configuration as production. Install Caddy 2.11.4, or set `CADDY_BIN` to its executable. Use this preview for network measurements; the development server includes Vite, source maps, and unminified modules. Saved apps and third-party embeds add their own requests when restored or opened.
