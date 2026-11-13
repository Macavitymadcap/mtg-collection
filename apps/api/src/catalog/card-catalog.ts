import type { Card } from "@mtg/shared";

export interface CardLookup {
  found: Card[];
  /** Requested ids the catalogue doesn't know. */
  notFound: string[];
}

/** Where card data comes from. Scryfall in the app; a fake in tests. */
export interface CardCatalog {
  /** Card names starting with or containing `query`. */
  autocomplete(query: string): Promise<string[]>;
  /** Every printing of an exact card name, oldest first. */
  printings(name: string): Promise<Card[]>;
  /** One printing by set code and collector number, or null. */
  bySetAndNumber(setCode: string, collectorNumber: string): Promise<Card | null>;
  /** Many printings by Scryfall id. */
  byIds(ids: string[]): Promise<CardLookup>;
}
