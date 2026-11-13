import type { Card } from "./card.js";
import type { Board, Condition, Finish, Rarity } from "./constants.js";

/** Copies you own of one printing, in one finish, condition and language. */
export interface CollectionEntry {
  id: number;
  card: Card;
  quantity: number;
  finish: Finish;
  condition: Condition;
  language: string;
  notes: string | null;
  /** Copies used by decks (excluding "maybe" boards). */
  allocated: number;
  /** quantity − allocated. Negative means decks need more than you own. */
  available: number;
  createdAt: string;
  updatedAt: string;
}

/** Where an entry is used. */
export interface DeckUsage {
  deckId: number;
  deckName: string;
  board: Board;
  quantity: number;
}

export interface CollectionEntryDetail extends CollectionEntry {
  usages: DeckUsage[];
}

export interface CreateCollectionEntryRequest {
  /** Scryfall printing id. */
  scryfallId: string;
  /**
   * @isInt
   * @minimum 1
   * @maximum 999
   */
  quantity: number;
  finish: Finish;
  condition: Condition;
  /**
   * @minLength 2
   * @maxLength 5
   */
  language?: string;
  /** @maxLength 500 */
  notes?: string | null;
}

export interface UpdateCollectionEntryRequest {
  /**
   * @isInt
   * @minimum 1
   * @maximum 999
   */
  quantity?: number;
  finish?: Finish;
  condition?: Condition;
  /**
   * @minLength 2
   * @maxLength 5
   */
  language?: string;
  /** @maxLength 500 */
  notes?: string | null;
}

export type CollectionSort = "name" | "-name" | "createdAt" | "-createdAt" | "manaValue" | "-manaValue" | "setCode";

/** Filters for listing the collection. */
export interface CollectionFilter {
  search?: string;
  /** Colours the card must include, e.g. "WU". "C" means colourless. */
  colors?: string;
  type?: string;
  setCode?: string;
  rarity?: Rarity;
  finish?: Finish;
  deckId?: number;
  availableOnly?: boolean;
}
