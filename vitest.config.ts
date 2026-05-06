import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    env: {
      AI_API_KEY: "test-key",
      AI_BASE_URL: "http://localhost:1234",
    },
    include: ["__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
