import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./support";

/** Every main page, reached the way a person would (deck and card ids change between runs). */
const pages: [string, (page: Page) => Promise<void>][] = [
  ["dashboard", (page) => page.goto("/").then(() => undefined)],
  ["collection", (page) => page.goto("/collection").then(() => undefined)],
  ["add cards", (page) => page.goto("/collection/add").then(() => undefined)],
  ["import", (page) => page.goto("/collection/import").then(() => undefined)],
  ["decks", (page) => page.goto("/decks").then(() => undefined)],
  ["data", (page) => page.goto("/settings/data").then(() => undefined)],
  [
    "deck builder",
    async (page) => {
      await page.goto("/decks");
      await page.getByRole("link", { name: /Goblins/ }).click();
      await expect(page.getByRole("heading", { name: "Goblins" })).toBeVisible();
    },
  ],
  [
    "card",
    async (page) => {
      await page.goto("/collection?view=grid");
      await page.getByRole("link", { name: /Krenko, Mob Boss/ }).click();
      await expect(page.getByRole("heading", { name: "Krenko, Mob Boss" })).toBeVisible();
    },
  ],
];

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    for (const [name, open] of pages) {
      test(`${name} has no accessibility violations`, async ({ page }) => {
        await open(page);
        // Let data load and skeletons settle before scanning
        await page.waitForLoadState("networkidle");
        expect(await violations(page)).toEqual([]);
      });
    }
  });
}

/** The page's WCAG 2.1 A and AA violations, naming the offending elements so a failure says what to fix. */
async function violations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return results.violations.map(
    (v) => `${v.id}: ${v.help} → ${v.nodes.map((node) => node.target.join(" ")).join(" | ")}`,
  );
}

// What visitors see differs: read-only pages and the sign-in prompt
test.describe("signed out", () => {
  test.use({ signedIn: false });
  const visitorPages = pages.filter(([name]) => ["collection", "add cards", "deck builder", "card"].includes(name));

  for (const [name, open] of visitorPages) {
    test(`${name} has no accessibility violations`, async ({ page }) => {
      await open(page);
      await page.waitForLoadState("networkidle");
      expect(await violations(page)).toEqual([]);
    });
  }
});
