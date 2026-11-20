import type { Card, ExportFile } from "@mtg/shared";

/**
 * The only cards the end-to-end tests know about. The fake Scryfall serves
 * them, and the seed collection uses them. No images, so tests never fetch
 * from Scryfall's CDN.
 */
function card(n: number, fields: Partial<Card> & Pick<Card, "name" | "setCode" | "setName">): Card {
  const hex = String(n).padStart(12, "0");
  return {
    id: `e2e00000-0000-4000-8000-${hex}`,
    oracleId: `e2e10000-0000-4000-8000-${hex}`,
    collectorNumber: String(n),
    rarity: "common",
    manaCost: "{R}",
    manaValue: 1,
    typeLine: "Instant",
    oracleText: null,
    colours: "R",
    colourIdentity: "R",
    isBasicLand: false,
    layout: "normal",
    imageSmall: null,
    imageNormal: null,
    scryfallUri: `https://scryfall.com/card/${fields.setCode}/${n}`,
    ...fields,
  };
}

export const cards = {
  boltM10: card(1, {
    name: "Lightning Bolt",
    setCode: "m10",
    setName: "Magic 2010",
    oracleText: "Lightning Bolt deals 3 damage to any target.",
  }),
  boltA25: card(2, {
    name: "Lightning Bolt",
    // Another printing of the same card: same oracle id as the M10 one
    oracleId: "e2e10000-0000-4000-8000-000000000001",
    setCode: "a25",
    setName: "Masters 25",
    rarity: "uncommon",
    oracleText: "Lightning Bolt deals 3 damage to any target.",
  }),
  krenko: card(3, {
    name: "Krenko, Mob Boss",
    setCode: "m13",
    setName: "Magic 2013",
    rarity: "rare",
    manaCost: "{2}{R}{R}",
    manaValue: 4,
    typeLine: "Legendary Creature — Goblin Warrior",
  }),
  mountain: card(4, {
    name: "Mountain",
    setCode: "m10",
    setName: "Magic 2010",
    manaCost: null,
    manaValue: 0,
    typeLine: "Basic Land — Mountain",
    colours: "",
    isBasicLand: true,
  }),
  elves: card(5, {
    name: "Llanowar Elves",
    setCode: "m19",
    setName: "Core Set 2019",
    manaCost: "{G}",
    typeLine: "Creature — Elf Druid",
    colours: "G",
    colourIdentity: "G",
  }),
} satisfies Record<string, Card>;

export const allCards: Card[] = Object.values(cards);

/**
 * The collection every test starts from: four entries (the M10 Bolt is left
 * out, so tests can add it) and a commander deck.
 */
export function seedCollection(): ExportFile {
  const entry = (ref: string, cardId: string, quantity: number) => ({
    ref,
    cardId,
    quantity,
    finish: "nonfoil" as const,
    condition: "NM" as const,
    language: "en",
    purchasePrice: null,
    currency: null,
    signed: false,
    altered: false,
    misprint: false,
    proxy: false,
    notes: null,
    createdAt: "2026-11-01T12:00:00.000Z",
  });
  return {
    formatVersion: 2,
    exportedAt: "2026-11-01T12:00:00.000Z",
    cards: [cards.boltA25, cards.krenko, cards.mountain, cards.elves],
    collection: [
      entry("c1", cards.boltA25.id, 2),
      entry("c2", cards.krenko.id, 1),
      entry("c3", cards.mountain.id, 30),
      entry("c4", cards.elves.id, 4),
    ],
    decks: [
      {
        ref: "d1",
        name: "Goblins",
        format: "commander",
        description: "Krenko tokens",
        createdAt: "2026-11-01T12:00:00.000Z",
        cards: [
          { collectionRef: "c2", board: "commander", quantity: 1 },
          { collectionRef: "c1", board: "main", quantity: 1 },
          { collectionRef: "c3", board: "main", quantity: 20 },
        ],
      },
    ],
  };
}
