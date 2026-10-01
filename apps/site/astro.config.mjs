import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";

export default defineConfig({
  integrations: [preact()],
  site: "https://bip-atlas.pages.dev",
  trailingSlash: "always",
  devToolbar: { enabled: false },
  build: { format: "directory" },
  vite: {
    server: { fs: { allow: ["../.."] } },
    ssr: { noExternal: ["@bip-atlas/figures", "@bip-atlas/models", "@bip-atlas/publication"] },
    resolve: { dedupe: ["preact"] },
    optimizeDeps: {
      include: ["preact", "preact/hooks"],
      exclude: ["@bip-atlas/figures", "@bip-atlas/models", "@bip-atlas/publication"],
    },
  },
});
