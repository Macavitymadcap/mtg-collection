import type { Knex } from "knex";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { CardCatalog } from "../src/catalog/card-catalog.js";
import type { PreconSource } from "../src/catalog/precon-source.js";
import { container } from "../src/ioc.js";
import { TYPES } from "../src/types.js";
import { auth, FakeCatalog, FakePrecons, makeCard, resetDb } from "./helpers.js";

const dogmeat = makeCard({ name: "Dogmeat, Ever Loyal", typeLine: "Legendary Creature — Dog", colorIdentity: "RGW" });
const solRing = makeCard({ name: "Sol Ring", typeLine: "Artifact", colors: "", colorIdentity: "" });
const solRingReprint = makeCard({
  name: "Sol Ring",
  oracleId: solRing.oracleId,
  setCode: "c21",
  collectorNumber: "263",
  typeLine: "Artifact",
  colors: "",
  colorIdentity: "",
});
const forest = makeCard({
  name: "Forest",
  typeLine: "Basic Land — Forest",
  isBasicLand: true,
  colors: "",
  colorIdentity: "G",
});

container
  .rebind<CardCatalog>(TYPES.CardCatalog)
  .toConstantValue(new FakeCatalog([dogmeat, solRing, solRingReprint, forest]));
container.rebind<PreconSource>(TYPES.PreconSource).toConstantValue(
  new FakePrecons([
    {
      fileName: "ScrappySurvivors_PIP",
      name: "Scrappy Survivors",
      setCode: "PIP",
      type: "Commander Deck",
      releaseDate: "2024-03-08",
      cards: [
        { scryfallId: dogmeat.id, name: dogmeat.name, quantity: 1, finish: "foil", board: "commander" },
        { scryfallId: solRing.id, name: solRing.name, quantity: 1, finish: "nonfoil", board: "main" },
        { scryfallId: forest.id, name: forest.name, quantity: 9, finish: "nonfoil", board: "main" },
      ],
    },
    {
      fileName: "Broken_TST",
      name: "Broken",
      setCode: "TST",
      type: "Intro Pack",
      releaseDate: "2020-01-01",
      cards: [{ scryfallId: null, name: "Mystery", quantity: 1, finish: "nonfoil", board: "main" }],
    },
  ]),
);

const app = createApp();
const db = container.get<Knex>(TYPES.Knex);

beforeEach(() => resetDb(db));
afterAll(() => db.destroy());

function importPrecon(body: Record<string, unknown>, dryRun = false) {
  return request(app)
    .post(`/api/import/precon${dryRun ? "?dryRun=true" : ""}`)
    .set(auth())
    .send({ fileName: "ScrappySurvivors_PIP", createDeck: true, ...body });
}

describe("GET /api/catalog/precons", () => {
  it("searches by name, set and type", async () => {
    const byName = await request(app).get("/api/catalog/precons?search=scrappy").set(auth()).expect(200);
    expect(byName.body.map((p: { fileName: string }) => p.fileName)).toEqual(["ScrappySurvivors_PIP"]);

    const byTypeAndSet = await request(app).get("/api/catalog/precons?search=commander%20pip").set(auth()).expect(200);
    expect(byTypeAndSet.body).toHaveLength(1);
  });
});

describe("POST /api/import/precon", () => {
  it("previews the cards and the deck without writing", async () => {
    const response = await importPrecon({}, true).expect(200);
    expect(response.body).toMatchObject({
      rows: 3,
      copies: 11,
      created: 3,
      merged: 0,
      errors: [],
      dryRun: true,
      deck: { id: null, name: "Scrappy Survivors", format: "commander" },
    });
    expect(await db("collection_entry").count({ n: "*" }).first()).toEqual({ n: 0 });
  });

  it("adds the cards and builds the deck, commander and foils included", async () => {
    const response = await importPrecon({ deckName: "Dogmeat" }).expect(200);
    const deckId = response.body.deck.id as number;

    const deck = await request(app).get(`/api/decks/${deckId}`).set(auth()).expect(200);
    expect(deck.body).toMatchObject({ name: "Dogmeat", format: "commander", cardCount: 11 });
    expect(deck.body.description).toBe("Scrappy Survivors (PIP Commander Deck, 2024)");
    expect(
      deck.body.cards.map(
        (c: {
          board: string;
          quantity: number;
          entry: { card: { name: string }; finish: string; available: number };
        }) => `${c.board}:${c.quantity}:${c.entry.card.name}:${c.entry.finish}:${c.entry.available}`,
      ),
    ).toEqual(["commander:1:Dogmeat, Ever Loyal:foil:0", "main:9:Forest:nonfoil:0", "main:1:Sol Ring:nonfoil:0"]);
  });

  it("can add the cards without creating a deck, merging with copies you have", async () => {
    await request(app)
      .post("/api/collection")
      .set(auth())
      .send({ scryfallId: solRing.id, quantity: 2, finish: "nonfoil", condition: "NM" })
      .expect(201);

    const response = await importPrecon({ createDeck: false }).expect(200);

    expect(response.body).toMatchObject({ created: 2, merged: 1, deck: null });
    expect((await db("collection_entry").where({ cardId: solRing.id }).first()).quantity).toBe(3);
    expect(await db("deck").count({ n: "*" }).first()).toEqual({ n: 0 });
  });

  it("refuses a deck name that's taken, writing nothing", async () => {
    await request(app)
      .post("/api/decks")
      .set(auth())
      .send({ name: "Scrappy Survivors", format: "commander" })
      .expect(201);

    const response = await importPrecon({}).expect(422);

    expect(response.body.errors).toEqual([
      {
        line: 0,
        name: "Scrappy Survivors",
        message: 'There\'s already a deck called "Scrappy Survivors". Choose another name.',
      },
    ]);
    expect(await db("collection_entry").count({ n: "*" }).first()).toEqual({ n: 0 });
  });

  it("reports cards without a Scryfall ID, and unknown products", async () => {
    const broken = await importPrecon({ fileName: "Broken_TST" }).expect(422);
    expect(broken.body.errors).toEqual([
      { line: 1, name: "Mystery", message: "MTGJSON doesn't give a Scryfall ID for this card" },
    ]);

    await importPrecon({ fileName: "Nope_XYZ" }).expect(404);
    await importPrecon({ fileName: "../etc/passwd" }).expect(400);
  });
});

describe("GET /api/stats", () => {
  it("totals the collection, decks and spending", async () => {
    await importPrecon({});
    await request(app)
      .post("/api/collection")
      .set(auth())
      .send({
        scryfallId: solRing.id,
        quantity: 2,
        finish: "foil",
        condition: "LP",
        purchasePrice: 1.25,
        currency: "GBP",
      })
      .expect(201);

    const response = await request(app).get("/api/stats").set(auth("cards:read")).expect(200);

    expect(response.body).toMatchObject({
      entries: 4,
      copies: 13,
      uniqueCards: 3,
      decks: 1,
      allocated: 11,
      spent: [{ currency: "GBP", total: 2.5 }],
    });
    expect(response.body.recent[0].card.name).toBe("Sol Ring");
  });
});

describe("POST /api/import/precon with useOwnedCards", () => {
  async function own(scryfallId: string, quantity: number, finish = "nonfoil", condition = "NM"): Promise<number> {
    const response = await request(app)
      .post("/api/collection")
      .set(auth())
      .send({ scryfallId, quantity, finish, condition });
    return response.body.id as number;
  }

  const copies = async () => (await db("collection_entry").sum({ n: "quantity" }).first())?.n;

  it("builds the deck from the copies you own, adding none", async () => {
    const dogmeatId = await own(dogmeat.id, 1, "foil");
    await own(solRing.id, 1);
    await own(forest.id, 6, "nonfoil", "LP");
    await own(forest.id, 4); // two Forest entries: 9 needed, 10 owned
    const before = await copies();

    const preview = await importPrecon({ useOwnedCards: true }, true).expect(200);
    expect(preview.body).toMatchObject({ created: 0, merged: 4, errors: [], notes: [], dryRun: true });

    const response = await importPrecon({ useOwnedCards: true }).expect(200);
    expect(await copies()).toEqual(before);

    const deck = await request(app).get(`/api/decks/${response.body.deck.id}`).set(auth()).expect(200);
    expect(deck.body.cardCount).toBe(11);
    expect(deck.body.cards[0]).toMatchObject({ board: "commander", quantity: 1, entry: { id: dogmeatId } });
    const forests = deck.body.cards.filter(
      (c: { entry: { card: { name: string } } }) => c.entry.card.name === "Forest",
    );
    expect(forests.reduce((sum: number, c: { quantity: number }) => sum + c.quantity, 0)).toBe(9);
  });

  it("uses other printings and finishes, saying so", async () => {
    await own(dogmeat.id, 1, "nonfoil");
    await own(solRingReprint.id, 1);
    await own(forest.id, 9);

    const response = await importPrecon({ useOwnedCards: true }, true).expect(200);

    expect(response.body.errors).toEqual([]);
    expect(response.body.notes).toEqual([
      { line: 1, name: "Dogmeat, Ever Loyal", message: "Uses a nonfoil copy (the product's is foil)" },
      {
        line: 2,
        name: "Sol Ring",
        message: "Uses your C21 #263 printing (the product's is TST #" + solRing.collectorNumber + ")",
      },
    ]);
  });

  it("writes nothing when cards are missing or short", async () => {
    await own(dogmeat.id, 1, "foil");
    await own(forest.id, 5);

    const response = await importPrecon({ useOwnedCards: true }).expect(422);

    expect(response.body.errors).toEqual([
      { line: 2, name: "Sol Ring", message: "not in your collection (no printing of it)" },
      { line: 3, name: "Forest", message: "you own 5 copies (any printing); the deck needs 9" },
    ]);
    expect(await db("deck").count({ n: "*" }).first()).toEqual({ n: 0 });
  });

  it("needs createDeck", async () => {
    await importPrecon({ useOwnedCards: true, createDeck: false }).expect(400);
  });
});
