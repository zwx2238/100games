import js from "@eslint/js";
import html from "eslint-plugin-html";

export default [
  {
    files: ["**/*.html"],
    plugins: { html },
    ...js.configs.recommended,
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "off", // inline scripts use globals like document, window, etc.
      "no-console": "off",
    },
  },
  {
    files: ["**/*.js"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        URL: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      "scripts/screenshots*/**",
      "scripts/*report*.html",
      "scripts/generate-*",
    ],
  },
];
