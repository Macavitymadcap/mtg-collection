import { expect, test } from "./support";

test("navigates with the bottom bar and browses the collection as a list", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });
  await nav.getByRole("link", { name: "Collection" }).click();

  await expect(page).toHaveURL(/\/collection$/);
  await expect(nav.getByRole("link", { name: "Collection" })).toHaveAttribute("aria-current", "page");
  // A list, not the desktop table
  await expect(page.getByRole("grid")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Krenko, Mob Boss/ })).toBeVisible();

  await page.getByRole("button", { name: "Filters" }).click();
  await page.getByRole("group", { name: "Filters" }).getByRole("button", { name: "Green" }).click();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByText("1 entry")).toBeVisible();
});

test("uses tabs and the add sheet in the deck builder", async ({ page }) => {
  await page.goto("/decks");
  await page.getByRole("link", { name: /Goblins/ }).click();

  await expect(page.getByRole("tab", { name: "Cards (22)" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Stats" }).click();
  await expect(page.getByRole("heading", { name: "Mana curve" })).toBeVisible();

  await page.getByRole("button", { name: "Add from your collection" }).click();
  await page.getByRole("combobox", { name: "Add from your collection" }).fill("elves");
  await page.getByRole("option", { name: /Llanowar Elves/ }).click();
  await expect(page.getByText("Added Llanowar Elves to main deck")).toBeVisible();
});
