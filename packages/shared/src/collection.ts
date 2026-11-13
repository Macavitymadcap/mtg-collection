import type { Card } from "./card.js";
import type { Board, Condition, Finish, Rarity } from "./constants.js";

/** Physical oddities of a copy. Copies that differ in any of these are kept as separate entries. */
export interface CopyFlags {
  signed: boolean;
  altered: boolean;
  misprint: boolean;
  proxy: boolean;
}

/** Copies you own of one printing, in one finish, condition, language and set of flags. */
export interface CollectionEntry extends CopyFlags {
  id: number;
  card: Card;
  quantity: number;
  finish: Finish;
  condition: Condition;
  language: string;
  /** Price paid per copy, if known. */
  purchasePrice: number | null;
  /** ISO 4217 code for purchasePrice, e.g. "GBP". */
  currency: string | null;
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
  /**
   * Scryfall printing id.
   * @pattern ^[0-9a-fA-F-]{36}$
   */
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
  /** @minimum 0 */
  purchasePrice?: number | null;
  /** @pattern ^[A-Z]{3}$ */
  currency?: string | null;
  signed?: boolean;
  altered?: boolean;
  misprint?: boolean;
  proxy?: boolean;
  /** @maxLength 500 */
  notes?: string | null;
}

/**
 * Every field is optional. Changing scryfallId moves the copies to another
 * printing (to fix a wrong scan). If the change makes the entry identical to
 * another one, the two are merged and the other entry is returned.
 */
export interface UpdateCollectionEntryRequest {
  /** @pattern ^[0-9a-fA-F-]{36}$ */
  scryfallId?: string;
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
  /** @minimum 0 */
  purchasePrice?: number | null;
  /** @pattern ^[A-Z]{3}$ */
  currency?: string | null;
  signed?: boolean;
  altered?: boolean;
  misprint?: boolean;
  proxy?: boolean;
  /** @maxLength 500 */
  notes?: string | null;
}

export const collectionSorts = ["name", "-name", "createdAt", "-createdAt", "manaValue", "-manaValue", "setCode"] as const;
export type CollectionSort = (typeof collectionSorts)[number];

/** Filters for listing the collection. */
export interface CollectionFilter {
  /** Part of the card name. */
  search?: string;
  /** Colours the card must include, e.g. "WU". "C" means colourless. */
  colors?: string;
  /** Part of the type line, e.g. "Creature". */
  type?: string;
  setCode?: string;
  rarity?: Rarity;
  finish?: Finish;
  availableOnly?: boolean;
}
