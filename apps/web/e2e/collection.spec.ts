import { expect, test } from "./support";

test("adds a card: search, pick the printing, save, and see it in the collection", async ({ page }) => {
  await page.goto("/collection/add");

  await page.getByRole("combobox", { name: "Card name" }).fill("bolt");
  await page.getByRole("option", { name: "Lightning Bolt" }).click();
  await page.getByText("Magic 2010").click();
  await page.getByRole("spinbutton", { name: "Quantity" }).fill("3");
  await page.getByRole("button", { name: "Add to collection" }).click();

  await expect(page.getByText("Added 3 × Lightning Bolt")).toBeVisible();

  await page.goto("/collection?search=bolt");
  // The M10 copy just added, and the A25 copies from the seed data
  await expect(page.getByRole("row", { name: /Lightning Bolt M10 #1/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Lightning Bolt A25 #2/ })).toBeVisible();
});

test("edits an entry, and moves it to another printing", async ({ page }) => {
  await page.goto("/collection?search=elves");
  await page
    .getByRole("row", { name: /Llanowar Elves/ })
    .getByText("Llanowar Elves")
    .click();

  await expect(page.getByRole("heading", { name: "Llanowar Elves" })).toBeVisible();
  await page.getByRole("checkbox", { name: "Signed" }).check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Signed" })).toBeChecked();
});

test("filters the collection by colour, keeping the filter in the URL", async ({ page }) => {
  await page.goto("/collection");
  await expect(page.getByText("4 entries")).toBeVisible();

  await page.getByRole("button", { name: "Green" }).click();
  await expect(page).toHaveURL(/colors=G/);
  await expect(page.getByText("1 entry")).toBeVisible();
  await expect(page.getByRole("row", { name: /Llanowar Elves/ })).toBeVisible();
});
