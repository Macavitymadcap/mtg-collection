import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Vite reads the "@/..." alias from tsconfig.json
    tsconfigPaths: true,
    alias: { "server-only": fileURLToPath(new URL("./test/server-only.ts", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    environmentOptions: { jsdom: { url: "http://localhost:3000" } },
    setupFiles: ["./test/setup.ts"],
    // Values for src/lib/env.ts
    env: { API_BASE_URL: "http://api.test/api", API_JWT_SECRET: "test-secret-0123456789" },
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        // Thin wiring with nothing of its own to test: route files that only
        // forward to the API or render one feature component
        "src/app/**/route.ts",
        "src/app/**/page.tsx",
        "src/app/layout.tsx",
        "src/app/providers.tsx",
      ],
      reporter: ["text-summary", "text", "html"],
      // Fail the run if coverage drops below these
      thresholds: { lines: 90, branches: 80, functions: 85, statements: 90 },
    },
  },
});
