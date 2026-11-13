import type { Knex } from "knex";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { CardCatalog } from "../src/catalog/card-catalog.js";
import { container } from "../src/ioc.js";
import { TYPES } from "../src/types.js";
import { auth, FakeCatalog, makeCard, resetDb } from "./helpers.js";

const shock = makeCard({ name: "Shock", setCode: "m19" });
const shockReprint = makeCard({ name: "Shock", setCode: "m20" });
const forest = makeCard({ name: "Forest", typeLine: "Basic Land — Forest", colors: "", colorIdentity: "G", isBasicLand: true, manaCost: null, manaValue: 0 });
const catalog = new FakeCatalog([shock, shockReprint, forest]);
container.rebind<CardCatalog>(TYPES.CardCatalog).toConstantValue(catalog);

const app = createApp();
const db = container.get<Knex>(TYPES.Knex);

beforeEach(() => resetDb(db));
afterAll(() => db.destroy());

function add(body: Record<string, unknown>) {
  return request(app)
    .post("/api/collection")
    .set(auth())
    .send({ finish: "nonfoil", condition: "NM", quantity: 1, ...body });
}

describe("POST /api/collection", () => {
  it("adds a printing, caching the card", async () => {
    const response = await add({ scryfallId: shock.id, quantity: 2, purchasePrice: 0.25, currency: "GBP" }).expect(201);

    expect(response.body).toMatchObject({
      card: { name: "Shock", setCode: "m19" },
      quantity: 2,
      language: "en",
      signed: false,
      purchasePrice: 0.25,
      currency: "GBP",
      allocated: 0,
      available: 2,
    });
    expect(await db("card").where({ id: shock.id }).first()).toBeTruthy();
  });

  it("merges identical copies into one entry", async () => {
    const first = await add({ scryfallId: shock.id, quantity: 2 }).expect(201);
    const second = await add({ scryfallId: shock.id, quantity: 3 }).expect(200);

    expect(second.body.id).toBe(first.body.id);
    expect(second.body.quantity).toBe(5);
  });

  it("keeps different conditions and signed copies apart", async () => {
    await add({ scryfallId: shock.id }).expect(201);
    await add({ scryfallId: shock.id, condition: "LP" }).expect(201);
    await add({ scryfallId: shock.id, signed: true }).expect(201);
  });

  it("only asks the catalogue for cards it hasn't cached", async () => {
    catalog.requested.length = 0;
    await add({ scryfallId: forest.id }).expect(201);
    await add({ scryfallId: forest.id, condition: "MP" }).expect(201);
    expect(catalog.requested).toEqual([[forest.id]]);
  });

  it("404s for an unknown Scryfall id", async () => {
    await add({ scryfallId: "99999999-9999-4999-8999-999999999999" }).expect(404);
  });

  it("validates the body", async () => {
    const response = await add({ scryfallId: shock.id, quantity: 0, finish: "shiny" }).expect(400);
    expect(Object.keys(response.body.details)).toEqual(expect.arrayContaining(["body.quantity", "body.finish"]));
  });

  it("needs the cards:write scope", async () => {
    await request(app).post("/api/collection").set(auth("cards:read")).send({}).expect(403);
  });
});

describe("GET /api/collection", () => {
  beforeEach(async () => {
    await add({ scryfallId: shock.id, quantity: 4 });
    await add({ scryfallId: forest.id, quantity: 10, finish: "foil" });
  });

  it("pages and sorts by name by default", async () => {
    const response = await request(app).get("/api/collection?limit=1").set(auth("cards:read")).expect(200);

    expect(response.body).toMatchObject({ page: 1, limit: 1, count: 2, totalPages: 2 });
    expect(response.body.results.map((e: { card: { name: string } }) => e.card.name)).toEqual(["Forest"]);
  });

  it.each([
    ["search=sho", ["Shock"]],
    ["colors=R", ["Shock"]],
    ["colors=C", ["Forest"]],
    ["type=basic", ["Forest"]],
    ["finish=foil", ["Forest"]],
    ["setCode=M19", ["Shock"]],
    ["sort=-name", ["Shock", "Forest"]],
  ])("filters with %s", async (query, names) => {
    const response = await request(app).get(`/api/collection?${query}`).set(auth("cards:read")).expect(200);
    expect(response.body.results.map((e: { card: { name: string } }) => e.card.name)).toEqual(names);
  });

  it("rejects colours out of WUBRG order", async () => {
    await request(app).get("/api/collection?colors=RW").set(auth("cards:read")).expect(400);
  });
});

describe("GET, PATCH and DELETE /api/collection/{id}", () => {
  it("returns an entry with its deck usages", async () => {
    const { body: entry } = await add({ scryfallId: shock.id });
    const response = await request(app).get(`/api/collection/${entry.id}`).set(auth()).expect(200);
    expect(response.body).toMatchObject({ id: entry.id, usages: [] });
  });

  it("corrects condition, flags, price and printing", async () => {
    const { body: entry } = await add({ scryfallId: shock.id, quantity: 2 });

    const response = await request(app)
      .patch(`/api/collection/${entry.id}`)
      .set(auth())
      .send({ scryfallId: shockReprint.id, condition: "MP", signed: true, purchasePrice: 1.5, currency: "GBP" })
      .expect(200);

    expect(response.body).toMatchObject({
      id: entry.id,
      card: { id: shockReprint.id, setCode: "m20" },
      condition: "MP",
      signed: true,
      purchasePrice: 1.5,
      quantity: 2,
    });
  });

  it("merges into an identical entry when an edit creates a duplicate", async () => {
    const { body: keep } = await add({ scryfallId: shock.id, quantity: 3, condition: "LP" });
    const { body: fold } = await add({ scryfallId: shock.id, quantity: 2 });

    const response = await request(app).patch(`/api/collection/${fold.id}`).set(auth()).send({ condition: "LP" }).expect(200);

    expect(response.body).toMatchObject({ id: keep.id, quantity: 5 });
    await request(app).get(`/api/collection/${fold.id}`).set(auth()).expect(404);
  });

  it("deletes an entry", async () => {
    const { body: entry } = await add({ scryfallId: shock.id });
    await request(app).delete(`/api/collection/${entry.id}`).set(auth()).expect(204);
    await request(app).delete(`/api/collection/${entry.id}`).set(auth()).expect(404);
  });
});

describe("GET /api/catalog", () => {
  it("proxies autocomplete and printings", async () => {
    const names = await request(app).get("/api/catalog/autocomplete?q=sho").set(auth("cards:read")).expect(200);
    expect(names.body).toEqual(["Shock"]);

    const printings = await request(app).get("/api/catalog/printings?name=Shock").set(auth("cards:read")).expect(200);
    expect(printings.body.map((card: { setCode: string }) => card.setCode)).toEqual(["m19", "m20"]);
  });

  it("404s for an unknown set and number", async () => {
    await request(app).get("/api/catalog/cards/xyz/1").set(auth("cards:read")).expect(404);
  });
});
