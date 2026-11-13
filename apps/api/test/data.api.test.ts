import type { ExportFile } from "@mtg/shared";
import type { Knex } from "knex";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { CardCatalog } from "../src/catalog/card-catalog.js";
import { container } from "../src/ioc.js";
import { TYPES } from "../src/types.js";
import { auth, FakeCatalog, makeCard, resetDb } from "./helpers.js";

const goblin = makeCard({ name: "Krenko", typeLine: "Legendary Creature — Goblin" });
const bolt = makeCard({ name: "Lightning Bolt" });
const mountain = makeCard({ name: "Mountain", typeLine: "Basic Land — Mountain", isBasicLand: true, colors: "" });
const unused = makeCard({ name: "Looked at, never added" });
container.rebind<CardCatalog>(TYPES.CardCatalog).toConstantValue(new FakeCatalog([goblin, bolt, mountain, unused]));

const app = createApp();
const db = container.get<Knex>(TYPES.Knex);

beforeEach(() => resetDb(db));
afterAll(() => db.destroy());

async function add(body: Record<string, unknown>): Promise<number> {
  const response = await request(app)
    .post("/api/collection")
    .set(auth())
    .send({ finish: "nonfoil", condition: "NM", quantity: 1, ...body })
    .expect(201);
  return response.body.id as number;
}

/** A small but varied collection: prices, flags, notes, two decks sharing an entry. */
async function seed(): Promise<void> {
  const krenko = await add({ scryfallId: goblin.id, finish: "foil", signed: true, notes: "From a prerelease" });
  const bolts = await add({ scryfallId: bolt.id, quantity: 4, purchasePrice: 1.5, currency: "GBP" });
  const playedBolt = await add({ scryfallId: bolt.id, condition: "HP", language: "ja" });
  const mountains = await add({ scryfallId: mountain.id, quantity: 30 });
  // Cached by a lookup but never kept: shouldn't be exported
  await db("card").insert({ ...unused, fetchedAt: new Date() });

  const goblins = (
    await request(app)
      .post("/api/decks")
      .set(auth())
      .send({ name: "Goblins", format: "commander", description: "Go wide" })
  ).body.id as number;
  const burn = (await request(app).post("/api/decks").set(auth()).send({ name: "Burn", format: "modern" })).body
    .id as number;
  for (const [deckId, collectionEntryId, board, quantity] of [
    [goblins, krenko, "commander", 1],
    [goblins, bolts, "main", 1],
    [goblins, mountains, "main", 20],
    [burn, bolts, "main", 4],
    [burn, playedBolt, "side", 1],
    [burn, mountains, "maybe", 10],
  ] as const) {
    await request(app)
      .put(`/api/decks/${deckId}/cards`)
      .set(auth())
      .send({ collectionEntryId, board, quantity })
      .expect(200);
  }
}

async function exportFile(): Promise<ExportFile> {
  return (await request(app).get("/api/data/export").set(auth()).expect(200)).body as ExportFile;
}

const withoutTimestamp = ({ exportedAt: _exportedAt, ...file }: ExportFile) => file;

describe("GET /api/data/export", () => {
  it("exports the collection and decks with references instead of ids", async () => {
    await seed();
    const response = await request(app).get("/api/data/export").set(auth()).expect(200);
    const file = response.body as ExportFile;

    expect(response.headers["content-disposition"]).toMatch(
      /^attachment; filename="mtg-collection-\d{4}-\d{2}-\d{2}\.json"$/,
    );
    expect(file.formatVersion).toBe(1);
    expect(file.cards.map((card) => card.name).sort()).toEqual(["Krenko", "Lightning Bolt", "Mountain"]);
    expect(file.collection.map((entry) => entry.ref)).toEqual(["c1", "c2", "c3", "c4"]);
    expect(file.collection[0]).toMatchObject({ finish: "foil", signed: true, notes: "From a prerelease" });
    expect(file.decks.map((deck) => deck.name)).toEqual(["Burn", "Goblins"]);
    expect(file.decks[0]?.cards).toEqual([
      { collectionRef: "c2", board: "main", quantity: 4 },
      { collectionRef: "c3", board: "side", quantity: 1 },
      { collectionRef: "c4", board: "maybe", quantity: 10 },
    ]);
  });

  it("needs the data:admin scope", async () => {
    await request(app).get("/api/data/export").set(auth("cards:read cards:write")).expect(403);
  });
});

describe("POST /api/data/import", () => {
  it("round-trips: export, wipe, import, export gives the same file", async () => {
    await seed();
    const first = await exportFile();
    await resetDb(db);

    const response = await request(app).post("/api/data/import").set(auth()).send(first).expect(200);
    expect(response.body).toEqual({
      incoming: { cards: 3, entries: 4, copies: 36, decks: 2, deckCards: 6 },
      replaced: { cards: 0, entries: 0, copies: 0, decks: 0, deckCards: 0 },
      dryRun: false,
    });

    expect(withoutTimestamp(await exportFile())).toEqual(withoutTimestamp(first));
  });

  it("replaces what's there, keeping allocations working", async () => {
    await seed();
    const file = await exportFile();
    await add({ scryfallId: bolt.id, condition: "LP" }); // not in the file: should disappear

    const response = await request(app).post("/api/data/import").set(auth()).send(file).expect(200);
    expect(response.body.replaced).toMatchObject({ entries: 5, decks: 2 });

    const stats = await request(app).get("/api/stats").set(auth()).expect(200);
    expect(stats.body).toMatchObject({ entries: 4, copies: 36, decks: 2, allocated: 27 });
  });

  it("previews with dryRun without writing", async () => {
    await seed();
    const file = await exportFile();
    await resetDb(db);

    const response = await request(app).post("/api/data/import?dryRun=true").set(auth()).send(file).expect(200);
    expect(response.body).toMatchObject({ dryRun: true, incoming: { entries: 4 }, replaced: { entries: 0 } });
    expect(await db("collection_entry").count({ n: "*" }).first()).toEqual({ n: 0 });
  });

  it("rejects broken references and duplicates, changing nothing", async () => {
    await seed();
    const file = await exportFile();
    const broken: ExportFile = {
      ...file,
      collection: [...file.collection, { ...file.collection[1]!, ref: "c9" }],
      decks: file.decks.map((deck, i) =>
        i === 0
          ? { ...deck, cards: [...deck.cards, { collectionRef: "c42", board: "main", quantity: 1 }] }
          : { ...deck, name: "Burn" },
      ),
    };

    const response = await request(app).post("/api/data/import").set(auth()).send(broken).expect(400);

    expect(response.body.message).toBe("This isn't a valid export file");
    expect(response.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "collection.4",
          message: expect.stringMatching(/^Duplicate collection entry/),
        }),
        expect.objectContaining({ path: "decks.1.name", message: "Duplicate deck name" }),
        expect.objectContaining({ path: "decks.0.cards.3.collectionRef", message: "Unknown collection ref c42" }),
      ]),
    );
    expect(await db("deck").count({ n: "*" }).first()).toEqual({ n: 2 });
  });

  it("rejects other format versions", async () => {
    const file = await exportFile();
    await request(app)
      .post("/api/data/import")
      .set(auth())
      .send({ ...file, formatVersion: 2 })
      .expect(400);
  });
});
