/** Body for importing a ManaBox collection export. */
export interface ManaboxImportRequest {
  /** The CSV file's contents. */
  csv: string;
}

import type { Format } from "./constants.js";

/** A row that couldn't be imported. For CSV files, line numbers count the header as line 1. */
export interface ImportRowError {
  line: number;
  name: string | null;
  message: string;
}

export interface ImportSummary {
  /** Data rows in the file. */
  rows: number;
  /** Copies across all valid rows. */
  copies: number;
  /** Entries that don't exist yet and will be (or were) created. */
  created: number;
  /** Entries that already exist; the file's quantities are added to them. */
  merged: number;
  /** Rows that were rejected. Nothing is imported unless this is empty. */
  errors: ImportRowError[];
  /** True if nothing was written. */
  dryRun: boolean;
  /**
   * Things worth knowing that don't stop the import, e.g. a deck built from
   * owned cards using a different printing than the product's.
   */
  notes?: ImportRowError[];
  /** The deck created (or that would be) from a preconstructed deck import. */
  deck?: { id: number | null; name: string; format: Format } | null;
}

/** A preconstructed product (Commander deck, starter deck …) from MTGJSON. */
export interface PreconSummary {
  /** MTGJSON's file name, used to import it. */
  fileName: string;
  name: string;
  /** Set code, e.g. "PIP". */
  setCode: string;
  /** e.g. "Commander Deck". */
  type: string;
  releaseDate: string;
}

export interface PreconImportRequest {
  /** @pattern ^[A-Za-z0-9_]+$ */
  fileName: string;
  /** Also create a deck holding these cards. */
  createDeck: boolean;
  /**
   * You already own the cards: build the deck from your existing collection
   * entries instead of adding copies. Requires createDeck.
   */
  useOwnedCards?: boolean;
  /**
   * Name for the new deck. Defaults to the product's name.
   * @maxLength 100
   */
  deckName?: string;
}
