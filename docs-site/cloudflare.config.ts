import { defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    name: "aegiscrypt-docs",
    compatibilityDate: "2026-09-21",
    observability: {
      enabled: true,
    },
    assets: {
      notFoundHandling: "404-page",
    },
    domains: ["docs.aegiscrypt.bangkah.tech"],
  },
});
