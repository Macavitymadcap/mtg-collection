import { expect, test } from "./support";

test.describe("visitors", () => {
  test.use({ signedIn: false });

  test("browse the collection and decks, without prices or ways to change anything", async ({ page }) => {
    await page.goto("/collection?search=elves");

    await expect(page.getByRole("row", { name: /Llanowar Elves/ })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /Paid/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Add cards" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Data" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

    await page
      .getByRole("row", { name: /Llanowar Elves/ })
      .getByText("Llanowar Elves")
      .click();
    await expect(page.getByRole("heading", { name: "Llanowar Elves" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(0);

    await page.goto("/decks");
    await expect(page.getByRole("button", { name: "New deck" })).toHaveCount(0);
  });

  test("are asked to sign in on pages that make changes", async ({ page }) => {
    await page.goto("/collection/add");

    await expect(page.getByText("Sign in to make changes")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in with GitHub" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Card name" })).toHaveCount(0);
  });
});

test("signing out leaves the site read-only", async ({ page }) => {
  await page.goto("/collection");
  await expect(page.getByRole("link", { name: "Add cards" })).toBeVisible();

  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();

  await expect(page.getByText("Signed out")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Add cards" })).toHaveCount(0);

  await page.reload();
  await page.locator("html[data-hydrated]").waitFor({ state: "attached" });
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});
