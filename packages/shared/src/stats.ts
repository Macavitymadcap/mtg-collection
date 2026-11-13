import type { CollectionEntry } from "./collection.js";

/** Totals for the dashboard. */
export interface CollectionStats {
  /** Collection entries (printing + finish + condition …). */
  entries: number;
  /** Physical copies. */
  copies: number;
  /** Different cards, counting all printings of a card as one. */
  uniqueCards: number;
  decks: number;
  /** Copies used by decks. */
  allocated: number;
  /** Total paid, per currency, where prices are known. */
  spent: { currency: string; total: number }[];
  /** The most recently added entries, newest first. */
  recent: CollectionEntry[];
}
