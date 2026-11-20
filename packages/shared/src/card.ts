import type { Rarity } from "./constants.js";

/** A printing's details apart from its colours, which old export files spell differently. */
export interface CardDetails {
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
  isBasicLand: boolean;
  layout: string;
  imageSmall: string | null;
  imageNormal: string | null;
  scryfallUri: string;
}

/** One printing of a card, cached from Scryfall. */
export interface Card extends CardDetails {
  /** Colours in WUBRG order, e.g. "WU". Empty for colourless. */
  colours: string;
  /** Colour identity in WUBRG order. */
  colourIdentity: string;
}
