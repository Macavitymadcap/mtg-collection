import type { Knex } from "knex";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { CardCatalog } from "../src/catalog/card-catalog.js";
import { container } from "../src/ioc.js";
import { TYPES } from "../src/types.js";
import { auth, FakeCatalog, makeCard, resetDb } from "./helpers.js";

const furnace = makeCard({ name: "Great Furnace" });
const moor = makeCard({ name: "Barren Moor" });
container.rebind<CardCatalog>(TYPES.CardCatalog).toConstantValue(new FakeCatalog([furnace, moor]));

const app = createApp();
const db = container.get<Knex>(TYPES.Knex);

beforeEach(() => resetDb(db));
afterAll(() => db.destroy());

const HEADER =
  "Binder Name,Binder Type,Name,Set code,Set name,Collector number,Foil,Rarity,Quantity,ManaBox ID,Scryfall ID,Purchase price,Misprint,Altered,Signed,Condition,Language,Proxy,Purchase price currency,Added";

function row(name: string, id: string, quantity: number, extra: { condition?: string; added?: string; price?: string } = {}) {
  const { condition = "near_mint", added = "2026-11-13T12:32:51.366Z", price = "0.20" } = extra;
  return `old cards,binder,${name},EOC,Set,1,normal,common,${quantity},1,${id},${price},false,false,false,${condition},en,false,GBP,${added}`;
}

function post(lines: string[], dryRun?: boolean) {
  return request(app)
    .post(`/api/import/manabox${dryRun ? "?dryRun=true" : ""}`)
    .set(auth())
    .send({ csv: [HEADER, ...lines].join("\n") });
}

describe("POST /api/import/manabox", () => {
  const lines = [
    row("Great Furnace", furnace.id, 3, { added: "2026-11-13T12:00:00.000Z" }),
    row("Barren Moor", moor.id, 5),
    // A second scan of the same card in the same condition: one entry of 4
    row("Great Furnace", furnace.id, 1, { added: "2026-11-13T09:00:00.000Z" }),
  ];

  it("previews without writing", async () => {
    const response = await post(lines, true).expect(200);

    expect(response.body).toEqual({ rows: 3, copies: 9, created: 2, merged: 0, errors: [], dryRun: true });
    expect(await db("collection_entry").count({ n: "*" }).first()).toEqual({ n: 0 });
  });

  it("imports, combining identical rows and keeping the earliest date", async () => {
    await post(lines).expect(200);

    const entries = await request(app).get("/api/collection").set(auth()).expect(200);
    const great = entries.body.results.find((e: { card: { name: string } }) => e.card.name === "Great Furnace");
    expect(great).toMatchObject({ quantity: 4, purchasePrice: 0.2, currency: "GBP", createdAt: "2026-11-13T09:00:00.000Z" });
    expect(entries.body.count).toBe(2);
  });

  it("adds to existing entries", async () => {
    await post(lines).expect(200);
    const response = await post([row("Barren Moor", moor.id, 1)]).expect(200);

    expect(response.body).toMatchObject({ created: 0, merged: 1 });
    const entry = await db("collection_entry").where({ cardId: moor.id }).first();
    expect(entry.quantity).toBe(6);
  });

  it("writes nothing if any row is bad, and says which", async () => {
    const response = await post([
      ...lines,
      row("Mystery", "99999999-9999-4999-8999-999999999999", 1),
      row("Barren Moor", moor.id, 1, { condition: "pristine" }),
    ]).expect(422);

    expect(response.body.dryRun).toBe(true);
    expect(response.body.errors).toEqual([
      { line: 5, name: "Mystery", message: "Scryfall has no card with this ID" },
      { line: 6, name: "Barren Moor", message: 'unknown condition "pristine"' },
    ]);
    expect(await db("collection_entry").count({ n: "*" }).first()).toEqual({ n: 0 });
  });

  it("400s for a file that isn't a ManaBox export", async () => {
    const response = await request(app).post("/api/import/manabox").set(auth()).send({ csv: "a,b\n1,2" }).expect(400);
    expect(response.body.message).toMatch(/ManaBox/);
  });
});
