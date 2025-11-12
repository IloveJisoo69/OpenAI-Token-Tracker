import { defineConfig } from "vite";
import { resolve } from "path";
import fs from "fs";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: "src/content.js",
      output: {
        entryFileNames: "content.js",
        format: "iife",
      },
    },
  },
  plugins: [
    {
      name: "copy-manifest",
      closeBundle() {
        fs.copyFileSync(resolve("manifest.json"), resolve("dist/manifest.json"));
        fs.copyFileSync(resolve("styles.css"), resolve("dist/styles.css"));
        console.log("✅ manifest.json copied to dist/");
      },
    },
  ],
});
