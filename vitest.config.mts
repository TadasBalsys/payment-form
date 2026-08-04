import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    env: {
      IBAN_VALIDATION_ENDPOINT: "https://iban-validate.test/api",
    },
    exclude: [
      ...configDefaults.exclude,
      ".next/**",
      ".claude/**",
      "e2e/**",
      "playwright/**",
    ],
  },
});
