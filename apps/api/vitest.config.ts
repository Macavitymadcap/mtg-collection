import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["./test/global-setup.ts"],
    setupFiles: ["./test/setup.ts"],
    fileParallelism: false, // integration tests share one database
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/generated/**",
        // Entry points and scripts: thin wrappers run by hand, not by tests.
        // Migrations do run (in test/global-setup.ts), but before coverage starts.
        "src/server.ts",
        "src/db/migrate.ts",
        "src/db/migrations/**",
        "src/scripts/**",
      ],
      reporter: ["text-summary", "text", "html"],
      // Fail the run if coverage drops below these
      thresholds: { lines: 90, branches: 80, functions: 90, statements: 90 },
    },
  },
});
