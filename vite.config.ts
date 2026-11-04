import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Build as a Node.js server for Render deployment
  nitro: {
    preset: "node-server",
    // tr46 (via mongodb) requires "punycode/"; map it to the npm package.
    alias: { "punycode/": fileURLToPath(new URL("./node_modules/punycode/punycode.js", import.meta.url)) },
    output: {
      dir: ".output",
    },
  } as never,
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});

