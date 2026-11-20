import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests: the real web app and API, against the mtg_test database
 * and a fake Scryfall/MTGJSON (e2e/fake-upstream.ts). Ports are separate from
 * `npm run dev` (3000/3400), so both can run at once. Tests reset the
 * database, so they run one at a time.
 */
const PORTS = { web: 3001, api: 3401, upstream: 3402 };
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: isCI ? 1 : 0,
  forbidOnly: isCI,
  reporter: isCI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://localhost:${PORTS.web}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /\.phone\.spec\.ts$/ },
    // Pixel 7 rather than an iPhone: same phone layout, and it runs in Chromium
    { name: "phone", use: { ...devices["Pixel 7"] }, testMatch: /\.(phone|a11y)\.spec\.ts$/ },
  ],
  webServer: [
    {
      command: `npx tsx e2e/fake-upstream.ts ${PORTS.upstream}`,
      url: `http://127.0.0.1:${PORTS.upstream}/DeckList.json`,
      reuseExistingServer: !isCI,
    },
    {
      // Migrate the test database, generate routes, then start the API
      command:
        "npx tsx --env-file=.env.test src/db/migrate.ts latest && npx tsoa spec-and-routes && npx tsx --env-file=.env.test src/server.ts",
      cwd: "../api",
      url: `http://127.0.0.1:${PORTS.api}/api/health`,
      env: {
        PORT: String(PORTS.api),
        SCRYFALL_BASE_URL: `http://127.0.0.1:${PORTS.upstream}`,
        MTGJSON_BASE_URL: `http://127.0.0.1:${PORTS.upstream}`,
        // The site the browser signs in on
        AUTH_BASE_URL: `http://localhost:${PORTS.web}`,
      },
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
    {
      // A production build: closer to what's deployed than `next dev`. CI has already built it.
      command: `${isCI ? "" : "npx next build && "}npx next start -p ${PORTS.web}`,
      url: `http://localhost:${PORTS.web}`,
      env: {
        API_BASE_URL: `http://127.0.0.1:${PORTS.api}/api`,
        // Must match apps/api/.env.test
        API_JWT_SECRET: "local-only-change-me-please",
      },
      reuseExistingServer: !isCI,
      timeout: 240_000,
    },
  ],
});
