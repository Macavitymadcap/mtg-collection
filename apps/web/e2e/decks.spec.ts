import { expect, test } from "./support";

test("builds a deck from owned cards, with live checks", async ({ page }) => {
  await page.goto("/decks");
  await page.getByRole("button", { name: "New deck" }).click();
  await page.getByRole("textbox", { name: "Name" }).fill("Elf Ball");
  await page.getByRole("combobox", { name: "Format" }).click();
  await page.getByRole("option", { name: "Casual" }).click();
  await page.getByRole("button", { name: "Create" }).click();

  await expect(page.getByRole("heading", { name: "Elf Ball" })).toBeVisible();
  await page.getByRole("combobox", { name: "Add from your collection" }).fill("elves");
  await page.getByRole("option", { name: /Llanowar Elves/ }).click();
  await expect(page.getByText("Added Llanowar Elves to main deck")).toBeVisible();

  await page.getByRole("button", { name: "One more Llanowar Elves" }).click();
  await page.getByRole("button", { name: "One more Llanowar Elves" }).click();
  await expect(page.getByRole("heading", { name: "Main deck (3)" })).toBeVisible();

  // Casual has no size rules; the stats follow the cards
  await expect(page.getByRole("img", { name: "Green 3" })).toBeVisible();
});

test("warns about the commander's colours", async ({ page }) => {
  await page.goto("/decks");
  await page.getByRole("link", { name: /Goblins/ }).click();
  await expect(page.getByRole("heading", { name: "Goblins" })).toBeVisible();

  await page.getByRole("combobox", { name: "Add from your collection" }).fill("elves");
  await page.getByRole("option", { name: /Llanowar Elves/ }).click();

  await expect(page.getByText("Llanowar Elves is outside the commander's colours (G).")).toBeVisible();
});
