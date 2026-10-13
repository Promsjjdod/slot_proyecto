import { defineConfig } from "vitest/config";

const repository = process.env.GITHUB_REPOSITORY?.split("/")[1];
const base = process.env.BASE_PATH ?? (process.env.GITHUB_ACTIONS && repository ? `/${repository}/` : "/");

export default defineConfig({
  base,
  server: { host: "0.0.0.0", allowedHosts: [".e2b.app"] },
  preview: { host: "0.0.0.0", allowedHosts: [".e2b.app"] },
  build: {
    target: "es2022",
    sourcemap: true,
    assetsInlineLimit: 4096,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
