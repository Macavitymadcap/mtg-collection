import type { Card, CollectionEntry, DeckCard, DeckSummary } from "@mtg/shared";

let sequence = 0;

export function makeCard(overrides: Partial<Card> = {}): Card {
  sequence++;
  return {
    id: `00000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`,
    oracleId: `10000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`,
    name: `Card ${sequence}`,
    setCode: "tst",
    setName: "Test Set",
    collectorNumber: String(sequence),
    rarity: "common",
    manaCost: "{R}",
    manaValue: 1,
    typeLine: "Instant",
    oracleText: null,
    colors: "R",
    colorIdentity: "R",
    isBasicLand: false,
    layout: "normal",
    imageSmall: null,
    imageNormal: null,
    scryfallUri: "https://scryfall.com/card/tst/1",
    ...overrides,
  };
}

export function makeEntry(overrides: Partial<CollectionEntry> = {}): CollectionEntry {
  sequence++;
  const entry: CollectionEntry = {
    id: sequence,
    card: makeCard(),
    quantity: 1,
    finish: "nonfoil",
    condition: "NM",
    language: "en",
    signed: false,
    altered: false,
    misprint: false,
    proxy: false,
    purchasePrice: null,
    currency: null,
    notes: null,
    allocated: 0,
    available: 1,
    createdAt: "2026-11-13T12:00:00.000Z",
    updatedAt: "2026-11-13T12:00:00.000Z",
    ...overrides,
  };
  return { ...entry, available: overrides.available ?? entry.quantity - entry.allocated };
}

export function makeDeckCard(
  entry: Partial<CollectionEntry>,
  board: DeckCard["board"] = "main",
  quantity = 1,
): DeckCard {
  return { entry: makeEntry(entry), board, quantity };
}

export function makeDeckSummary(overrides: Partial<DeckSummary> = {}): DeckSummary {
  sequence++;
  return {
    id: sequence,
    name: `Deck ${sequence}`,
    format: "commander",
    description: null,
    colorIdentity: "R",
    cardCount: 0,
    warningCount: 0,
    createdAt: "2026-11-13T12:00:00.000Z",
    updatedAt: "2026-11-13T12:00:00.000Z",
    ...overrides,
  };
}
