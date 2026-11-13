import type { Knex } from "knex";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { CardCatalog } from "../src/catalog/card-catalog.js";
import { container } from "../src/ioc.js";
import { TYPES } from "../src/types.js";
import { auth, FakeCatalog, makeCard, resetDb } from "./helpers.js";

const krenko = makeCard({ name: "Krenko", typeLine: "Legendary Creature — Goblin", manaValue: 3 });
const bolt = makeCard({ name: "Lightning Bolt", manaValue: 1 });
const counterspell = makeCard({ name: "Counterspell", colors: "U", colorIdentity: "U" });
container.rebind<CardCatalog>(TYPES.CardCatalog).toConstantValue(new FakeCatalog([krenko, bolt, counterspell]));

const app = createApp();
const db = container.get<Knex>(TYPES.Knex);

beforeEach(() => resetDb(db));
afterAll(() => db.destroy());

async function addEntry(scryfallId: string, quantity = 1, condition = "NM"): Promise<number> {
  const response = await request(app)
    .post("/api/collection")
    .set(auth())
    .send({ scryfallId, quantity, finish: "nonfoil", condition })
    .expect(201);
  return response.body.id;
}

async function createDeck(name = "Goblins", format = "commander"): Promise<number> {
  const response = await request(app).post("/api/decks").set(auth()).send({ name, format }).expect(201);
  return response.body.id;
}

function setCard(deckId: number, collectionEntryId: number, quantity: number, board = "main") {
  return request(app).put(`/api/decks/${deckId}/cards`).set(auth()).send({ collectionEntryId, board, quantity });
}

describe("decks", () => {
  it("creates a deck and refuses a duplicate name", async () => {
    const response = await request(app)
      .post("/api/decks")
      .set(auth())
      .send({ name: " Goblins ", format: "commander" })
      .expect(201);
    expect(response.body).toMatchObject({
      name: "Goblins",
      cards: [],
      cardCount: 0,
      warnings: [{ code: "deck-size" }, { code: "commander-count" }],
    });

    const duplicate = await request(app)
      .post("/api/decks")
      .set(auth())
      .send({ name: "Goblins", format: "modern" })
      .expect(409);
    expect(duplicate.body.message).toMatch(/already a deck called "Goblins"/);
  });

  it("adds cards, computing identity, stats and warnings", async () => {
    const deckId = await createDeck();
    await setCard(deckId, await addEntry(krenko.id), 1, "commander").expect(200);
    await setCard(deckId, await addEntry(bolt.id, 4), 1).expect(200);
    const response = await setCard(deckId, await addEntry(counterspell.id), 1).expect(200);

    expect(response.body).toMatchObject({ colorIdentity: "R", cardCount: 3 });
    expect(
      response.body.cards.map(
        (c: { board: string; entry: { card: { name: string } } }) => `${c.board}:${c.entry.card.name}`,
      ),
    ).toEqual(["commander:Krenko", "main:Counterspell", "main:Lightning Bolt"]);
    expect(response.body.stats.manaCurve).toMatchObject({ "1": 1, "2": 1, "3": 1 });
    expect(response.body.warnings.map((w: { code: string }) => w.code)).toEqual(["deck-size", "colour-identity"]);

    const list = await request(app).get("/api/decks").set(auth()).expect(200);
    expect(list.body).toEqual([
      expect.objectContaining({ id: deckId, cardCount: 3, warningCount: 2, colorIdentity: "R" }),
    ]);
  });

  it("tracks allocation across decks, ignoring maybe boards", async () => {
    const entryId = await addEntry(bolt.id, 2);
    const burn = await createDeck("Burn", "modern");
    const casual = await createDeck("Kitchen table", "casual");
    await setCard(burn, entryId, 2).expect(200);
    await setCard(casual, entryId, 4, "maybe").expect(200);
    const response = await setCard(casual, entryId, 1).expect(200);

    expect(response.body.warnings).toContainEqual(
      expect.objectContaining({ code: "over-allocated", cardName: "Lightning Bolt" }),
    );
    const entry = await request(app).get(`/api/collection/${entryId}`).set(auth()).expect(200);
    expect(entry.body).toMatchObject({ allocated: 3, available: -1 });
    expect(entry.body.usages.map((u: { deckName: string; board: string }) => `${u.deckName}:${u.board}`)).toEqual([
      "Burn:main",
      "Kitchen table:main",
      "Kitchen table:maybe",
    ]);

    const free = await request(app).get("/api/collection?availableOnly=true").set(auth()).expect(200);
    expect(free.body.count).toBe(0);
  });

  it("removes a card with quantity 0", async () => {
    const deckId = await createDeck();
    const entryId = await addEntry(bolt.id);
    await setCard(deckId, entryId, 1).expect(200);
    const response = await setCard(deckId, entryId, 0).expect(200);
    expect(response.body.cards).toEqual([]);
  });

  it("rejects unknown entries and decks", async () => {
    const deckId = await createDeck();
    await setCard(deckId, 999_999, 1).expect(400);
    await setCard(999_999, await addEntry(bolt.id), 1).expect(404);
  });

  it("renames and deletes a deck, leaving the cards in the collection", async () => {
    const deckId = await createDeck();
    const entryId = await addEntry(bolt.id);
    await setCard(deckId, entryId, 1).expect(200);

    const renamed = await request(app)
      .patch(`/api/decks/${deckId}`)
      .set(auth())
      .send({ name: "Mono red", format: "casual" })
      .expect(200);
    expect(renamed.body).toMatchObject({ name: "Mono red", format: "casual", warnings: [] });

    await request(app).delete(`/api/decks/${deckId}`).set(auth()).expect(204);
    const entry = await request(app).get(`/api/collection/${entryId}`).set(auth()).expect(200);
    expect(entry.body).toMatchObject({ quantity: 1, allocated: 0, usages: [] });
  });
});

describe("collection entries used in decks", () => {
  it("can't be deleted, and the error names the decks", async () => {
    const deckId = await createDeck();
    const entryId = await addEntry(bolt.id);
    await setCard(deckId, entryId, 1).expect(200);

    const response = await request(app).delete(`/api/collection/${entryId}`).set(auth()).expect(409);
    expect(response.body).toMatchObject({
      message: "Used in Goblins. Remove it from that deck first.",
      details: { decks: ["Goblins"] },
    });
  });

  it("keep their places in decks when merged into an identical entry", async () => {
    const deckId = await createDeck("Burn", "casual");
    const played = await addEntry(bolt.id, 2, "LP");
    const nearMint = await addEntry(bolt.id, 3, "NM");
    await setCard(deckId, played, 1).expect(200);
    await setCard(deckId, nearMint, 2).expect(200);

    // Correct the condition: the two entries become identical and merge
    const merged = await request(app)
      .patch(`/api/collection/${played}`)
      .set(auth())
      .send({ condition: "NM" })
      .expect(200);
    expect(merged.body).toMatchObject({ id: nearMint, quantity: 5, allocated: 3 });

    const deck = await request(app).get(`/api/decks/${deckId}`).set(auth()).expect(200);
    expect(deck.body.cards).toEqual([
      expect.objectContaining({ board: "main", quantity: 3, entry: expect.objectContaining({ id: nearMint }) }),
    ]);
  });
});
