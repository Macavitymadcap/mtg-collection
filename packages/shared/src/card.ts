import type { Rarity } from "./constants.js";

/** One printing of a card, cached from Scryfall. */
export interface Card {
  /** Scryfall printing id. */
  id: string;
  /** Shared by every printing of the same card. */
  oracleId: string;
  name: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  rarity: Rarity;
  manaCost: string | null;
  manaValue: number;
  typeLine: string;
  oracleText: string | null;
  /** Colours in WUBRG order, e.g. "WU". Empty for colourless. */
  colors: string;
  /** Colour identity in WUBRG order. */
  colorIdentity: string;
  isBasicLand: boolean;
  layout: string;
  imageSmall: string | null;
  imageNormal: string | null;
  scryfallUri: string;
}
