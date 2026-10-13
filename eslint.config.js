import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "coverage/**", "node_modules/**", "public/assets/audio/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ["src/**/*.ts", "tools/**/*.ts", "vite.config.ts"],
    languageOptions: {
      globals: {
        document: "readonly",
        localStorage: "readonly",
        navigator: "readonly",
        window: "readonly",
        console: "readonly",
        globalThis: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        performance: "readonly",
        process: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    files: ["public/sw.js"],
    languageOptions: {
      globals: {
        caches: "readonly",
        fetch: "readonly",
        Promise: "readonly",
        Response: "readonly",
        self: "readonly",
        URL: "readonly",
      },
    },
  },
  {
    files: ["tools/generate-audio.cjs"],
    languageOptions: {
      globals: {
        Buffer: "readonly",
        __dirname: "readonly",
        console: "readonly",
        global: "readonly",
        require: "readonly",
      },
    },
    rules: { "@typescript-eslint/no-require-imports": "off", "no-console": "off" },
  },
  {
    files: ["tools/**/*.ts"],
    rules: { "no-console": "off" },
  },
);
