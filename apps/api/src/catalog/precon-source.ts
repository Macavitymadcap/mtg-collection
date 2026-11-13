import type { Board, Finish, PreconSummary } from "@mtg/shared";

export interface PreconCard {
  /** Null if the source doesn't know the Scryfall id. */
  scryfallId: string | null;
  name: string;
  quantity: number;
  finish: Finish;
  board: Board;
}

export interface PreconDeck extends PreconSummary {
  cards: PreconCard[];
}

/** Where preconstructed deck lists come from. MTGJSON in the app; a fake in tests. */
export interface PreconSource {
  list(): Promise<PreconSummary[]>;
  /** One product's card list, or null if there's no such file. */
  get(fileName: string): Promise<PreconDeck | null>;
}
