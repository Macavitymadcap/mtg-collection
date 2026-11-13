import { describe, expect, it } from "vitest";
import type { Card } from "./card.js";
import type { CollectionEntry } from "./collection.js";
import type { Board } from "./constants.js";
import type { DeckCard } from "./deck.js";
import { checkDeck, deckColorIdentity, deckStats, primaryType } from "./rules.js";

let id = 0;

function card(overrides: Partial<Card> = {}): Card {
  id++;
  return {
    id: `card-${id}`,
    oracleId: `oracle-${id}`,
    name: `Card ${id}`,
    setCode: "tst",
    setName: "Test",
    collectorNumber: String(id),
    rarity: "common",
    manaCost: "{1}{R}",
    manaValue: 2,
    typeLine: "Instant",
    oracleText: null,
    colors: "R",
    colorIdentity: "R",
    isBasicLand: false,
    layout: "normal",
    imageSmall: null,
    imageNormal: null,
    scryfallUri: "https://scryfall.com",
    ...overrides,
  };
}

function line(c: Card, quantity: number, board: Board = "main", owned = 99, allocated = 0): DeckCard {
  const entry: CollectionEntry = {
    id: ++id,
    card: c,
    quantity: owned,
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
    allocated,
    available: owned - allocated,
    createdAt: "",
    updatedAt: "",
  };
  return { entry, board, quantity };
}

const mountain = card({ name: "Mountain", typeLine: "Basic Land — Mountain", isBasicLand: true, manaCost: null, manaValue: 0, colors: "", colorIdentity: "R" });
const codes = (warnings: { code: string }[]) => warnings.map((w) => w.code);

describe("checkDeck: constructed", () => {
  it("accepts a legal 60-card deck", () => {
    const deck = [line(card(), 4), line(card(), 4), line(mountain, 52)];
    expect(checkDeck("modern", deck)).toEqual([]);
  });

  it("warns about small decks and big sideboards", () => {
    const deck = [line(mountain, 40), line(mountain, 16, "side")];
    expect(codes(checkDeck("standard", deck))).toEqual(["deck-size", "deck-size"]);
  });

  it("counts copies across printings and boards, ignoring maybe and basics", () => {
    const shock = card({ name: "Shock" });
    const reprint = { ...card(), name: "Shock", oracleId: shock.oracleId };
    const deck = [line(shock, 3), line(reprint, 2, "side"), line(shock, 5, "maybe"), line(mountain, 60)];

    const warnings = checkDeck("modern", deck);
    expect(warnings).toEqual([{ code: "too-many-copies", cardName: "Shock", message: "5 copies of Shock; modern allows 4." }]);
  });

  it("lets cards that say so have any number of copies", () => {
    const rats = card({ name: "Relentless Rats", oracleText: "A deck can have any number of cards named Relentless Rats." });
    expect(checkDeck("casual", [line(rats, 20)])).toEqual([]);
    expect(checkDeck("modern", [line(rats, 20), line(mountain, 40)])).toEqual([]);
  });

  it("has no rules for casual decks", () => {
    expect(checkDeck("casual", [line(card(), 9)])).toEqual([]);
  });
});

describe("checkDeck: commander", () => {
  const krenko = card({ name: "Krenko", typeLine: "Legendary Creature — Goblin", colorIdentity: "R" });

  it("accepts 100 singleton cards in the commander's colours", () => {
    const deck = [line(krenko, 1, "commander"), ...Array.from({ length: 60 }, () => line(card(), 1)), line(mountain, 39)];
    expect(checkDeck("commander", deck)).toEqual([]);
  });

  it("warns about size, duplicates, missing commander and sideboards", () => {
    const bolt = card({ name: "Bolt" });
    expect(codes(checkDeck("commander", [line(bolt, 2), line(card(), 1, "side")]))).toEqual([
      "deck-size",
      "deck-size",
      "too-many-copies",
      "commander-count",
    ]);
  });

  it("flags cards outside the commander's colour identity", () => {
    const counterspell = card({ name: "Counterspell", colorIdentity: "U", colors: "U" });
    const warnings = checkDeck("commander", [line(krenko, 1, "commander"), line(counterspell, 1)]);
    expect(warnings.find((w) => w.code === "colour-identity")).toMatchObject({ cardName: "Counterspell" });
  });
});

describe("checkDeck: ownership", () => {
  it("warns once per entry when decks need more copies than you own", () => {
    const bolt = line(card({ name: "Bolt" }), 2, "main", 1, 3);
    const sameEntrySide = { ...bolt, board: "side" as const, quantity: 1 };
    const warnings = checkDeck("casual", [bolt, sameEntrySide]);
    expect(warnings).toEqual([
      { code: "over-allocated", cardName: "Bolt", message: "You own 1 Bolt but your decks use 3." },
    ]);
  });
});

describe("stats and identity", () => {
  it("builds the curve, colours and types from played boards only", () => {
    const giant = card({ typeLine: "Creature — Giant", manaValue: 8, colors: "RG", colorIdentity: "RG" });
    const stats = deckStats([line(giant, 2), line(card(), 3), line(mountain, 10), line(card(), 4, "side")]);

    expect(stats.cardCount).toBe(15);
    expect(stats.manaCurve).toMatchObject({ "2": 3, "7+": 2, "0": 0 });
    expect(stats.colors).toEqual({ R: 5, G: 2, C: 10 });
    expect(stats.types).toEqual({ Creature: 2, Instant: 3, Land: 10 });
  });

  it("groups by the most significant type on the front face", () => {
    expect(primaryType("Artifact Creature — Golem")).toBe("Creature");
    expect(primaryType("Artifact Land")).toBe("Artifact");
    expect(primaryType("Instant // Sorcery")).toBe("Instant");
    expect(primaryType("Kindred Tribal")).toBe("Other");
  });

  it("uses the commander for a commander deck's identity", () => {
    const commander = line(card({ colorIdentity: "BG" }), 1, "commander");
    expect(deckColorIdentity("commander", [commander, line(card({ colorIdentity: "W" }), 1)])).toBe("BG");
    expect(deckColorIdentity("casual", [line(card({ colorIdentity: "GW" }), 1), line(card({ colorIdentity: "U" }), 1)])).toBe("WUG");
  });
});
