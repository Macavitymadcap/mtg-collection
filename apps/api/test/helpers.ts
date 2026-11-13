import type { Card } from "@mtg/shared";
import jwt from "jsonwebtoken";
import type { Knex } from "knex";
import type { CardCatalog, CardLookup } from "../src/catalog/card-catalog.js";
import { config } from "../src/config.js";

/** A bearer header for the test API. */
export function auth(scope = "cards:read cards:write data:admin"): { Authorization: string } {
  return { Authorization: `Bearer ${jwt.sign({ scope }, config.JWT_SECRET, { subject: "test", expiresIn: "5m" })}` };
}

/** Empties every table, children first. */
export async function resetDb(db: Knex): Promise<void> {
  await db("deck_card").delete();
  await db("deck").delete();
  await db("collection_entry").delete();
  await db("card").delete();
}

let sequence = 0;

/** A printing with sensible defaults and a fresh id. */
export function makeCard(overrides: Partial<Card> = {}): Card {
  sequence++;
  const id = `00000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`;
  return {
    id,
    oracleId: `10000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`,
    name: `Card ${sequence}`,
    setCode: "tst",
    setName: "Test Set",
    collectorNumber: String(sequence),
    rarity: "common",
    manaCost: "{1}{R}",
    manaValue: 2,
    typeLine: "Instant",
    oracleText: "Deal 2 damage to any target.",
    colors: "R",
    colorIdentity: "R",
    isBasicLand: false,
    layout: "normal",
    imageSmall: null,
    imageNormal: null,
    scryfallUri: `https://scryfall.com/card/tst/${sequence}`,
    ...overrides,
  };
}

/** An in-memory catalogue standing in for Scryfall. Records the ids it was asked for. */
export class FakeCatalog implements CardCatalog {
  readonly requested: string[][] = [];

  constructor(public cards: Card[] = []) {}

  async autocomplete(query: string): Promise<string[]> {
    const q = query.toLowerCase();
    return [...new Set(this.cards.filter((card) => card.name.toLowerCase().includes(q)).map((card) => card.name))];
  }

  async printings(name: string): Promise<Card[]> {
    return this.cards.filter((card) => card.name === name);
  }

  async bySetAndNumber(setCode: string, collectorNumber: string): Promise<Card | null> {
    return this.cards.find((card) => card.setCode === setCode && card.collectorNumber === collectorNumber) ?? null;
  }

  async byIds(ids: string[]): Promise<CardLookup> {
    this.requested.push(ids);
    const found = this.cards.filter((card) => ids.includes(card.id));
    return { found, notFound: ids.filter((id) => !found.some((card) => card.id === id)) };
  }
}
