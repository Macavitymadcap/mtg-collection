import { cards } from "./fixtures/cards";
import { expect, test } from "./support";

const HEADER =
  "Binder Name,Binder Type,Name,Set code,Set name,Collector number,Foil,Rarity,Quantity,ManaBox ID,Scryfall ID,Purchase price,Misprint,Altered,Signed,Condition,Language,Proxy,Purchase price currency,Added";

test("imports a ManaBox export after previewing it", async ({ page }) => {
  const csv = [
    HEADER,
    `binder,binder,Lightning Bolt,M10,Magic 2010,1,normal,common,2,1,${cards.boltM10.id},0.50,false,false,false,near_mint,en,false,GBP,2026-11-02T10:00:00.000Z`,
    `binder,binder,Mountain,M10,Magic 2010,4,normal,common,5,2,${cards.mountain.id},,false,false,false,near_mint,en,false,,2026-11-02T10:00:00.000Z`,
  ].join("\n");

  await page.goto("/collection/import");
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "ManaBox_Collection.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });

  await expect(page.getByText("Ready to import")).toBeVisible();
  await expect(page.getByText(/2 rows · 7 copies · 1 new entry · 1 added to entries you already have/)).toBeVisible();
  await page.getByRole("button", { name: "Import 7 copies" }).click();
  await expect(page.getByText("Imported", { exact: true })).toBeVisible();

  await page.goto("/collection?search=mountain");
  await expect(page.getByRole("row", { name: /Mountain/ })).toContainText("35");
});

test("builds a precon's deck from cards already owned", async ({ page }) => {
  await page.goto("/collection/import?source=precon");
  await page.getByRole("combobox", { name: "Product" }).fill("goblin");
  await page.getByRole("option", { name: /Goblin Rush/ }).click();
  await page.getByRole("radio", { name: /I already own these cards/ }).check();

  // The M10 Bolt isn't owned, but the A25 printing is; the commander is owned non-foil
  await expect(page.getByText("Ready to build")).toBeVisible();
  await expect(page.getByText(/Lightning Bolt: uses your A25 #2 printing/)).toBeVisible();
  await page.getByRole("button", { name: "Create deck" }).click();

  await page.getByRole("link", { name: "Open deck" }).click();
  await expect(page.getByRole("heading", { name: "Goblin Rush" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Commander (1)" })).toBeVisible();
});
