import { test as base, expect, type Cookie, type Page } from "@playwright/test";
import jwt from "jsonwebtoken";
import { seedCollection } from "./fixtures/cards";

const API = "http://127.0.0.1:3401/api";
// Must match apps/api/.env.test
const JWT_SECRET = "local-only-change-me-please";

const token = (): string => jwt.sign({ scope: "cards:read cards:write data:admin" }, JWT_SECRET, { expiresIn: "5m" });

/** A tiny SVG, served in place of Scryfall's mana symbol images. */
const SYMBOL =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><circle cx="8" cy="8" r="7" fill="#999"/></svg>';

/**
 * Every test starts from the same data (fixtures/cards.ts), replaced through
 * the API's own import endpoint, and never loads images from Scryfall.
 * Tests run signed in (as the API's test login, without GitHub) unless they
 * set `test.use({ signedIn: false })`.
 */
export const test = base.extend<{ page: Page; signedIn: boolean }>({
  signedIn: [true, { option: true }],
  page: async ({ page, request, signedIn, baseURL }, use) => {
    const reset = await request.post(`${API}/data/import`, {
      headers: { Authorization: `Bearer ${token()}` },
      data: seedCollection(),
    });
    expect(reset.ok(), await reset.text()).toBe(true);

    if (signedIn) {
      const response = await request.post(`${API}/test/sign-in?origin=${baseURL}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      expect(response.ok(), await response.text()).toBe(true);
      await page.context().addCookies((await response.json()) as Cookie[]);
    }

    await page.route(/^https:\/\/(svgs|cards)\.scryfall\.io\//, (route) =>
      route.fulfill({ contentType: "image/svg+xml", body: SYMBOL }),
    );

    // After each navigation, wait until React has hydrated the page (see providers.tsx)
    const goto = page.goto.bind(page);
    page.goto = async (url, options) => {
      const response = await goto(url, options);
      await page.locator("html[data-hydrated]").waitFor({ state: "attached" });
      return response;
    };
    await use(page);
  },
});

export { expect };
