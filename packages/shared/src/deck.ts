import type { Board, Format } from "./constants.js";
import type { CollectionEntry } from "./collection.js";

/** A problem with a deck. Warnings never block saving. */
export interface DeckWarning {
  code: "deck-size" | "too-many-copies" | "commander-count" | "colour-identity" | "over-allocated";
  message: string;
  /** Card name the warning is about, if any. */
  cardName?: string;
}

/** One line in a deck: an owned entry on a board. */
export interface DeckCard {
  entry: CollectionEntry;
  board: Board;
  quantity: number;
}

export interface DeckStats {
  /** Cards on the main deck and commander boards. */
  cardCount: number;
  /** Mana value (0–7+) to count, lands excluded. */
  manaCurve: Record<string, number>;
  /** Cards per colour, plus "C" for colourless. */
  colors: Record<string, number>;
  /** Cards per primary type (Creature, Instant, Land …). */
  types: Record<string, number>;
}

export interface DeckSummary {
  id: number;
  name: string;
  format: Format;
  description: string | null;
  /** WUBRG order. */
  colorIdentity: string;
  cardCount: number;
  warningCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeckDetail extends DeckSummary {
  cards: DeckCard[];
  stats: DeckStats;
  warnings: DeckWarning[];
}

export interface CreateDeckRequest {
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  format: Format;
  /** @maxLength 2000 */
  description?: string | null;
}

export interface UpdateDeckRequest {
  /**
   * @minLength 1
   * @maxLength 100
   */
  name?: string;
  format?: Format;
  /** @maxLength 2000 */
  description?: string | null;
}

/** Sets how many copies of an entry are on a board. 0 removes it. */
export interface SetDeckCardRequest {
  /** @isInt */
  collectionEntryId: number;
  board: Board;
  /**
   * @isInt
   * @minimum 0
   * @maximum 999
   */
  quantity: number;
}
