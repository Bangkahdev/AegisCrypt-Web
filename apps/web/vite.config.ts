/// <reference types="vitest/config" />
import path from "node:path";
import { execFileSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cloudflare(),
    {
      // Static sub-pages make the asset directory ambiguous, so the precache
      // manifest is generated after the bundle is written, including when
      // `cf deploy` runs the build itself.
      name: "aegiscrypt-precache-manifest",
      apply: "build",
      closeBundle() {
        execFileSync(process.execPath, ["scripts/precache-manifest.mjs"], {
          stdio: "inherit",
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: './tests/setup.ts',
    css: false,
    include: ['tests/unit/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'tests/perf/**'],
  },
});