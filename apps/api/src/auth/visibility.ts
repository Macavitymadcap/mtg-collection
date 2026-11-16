import type { CollectionEntry, CollectionSort, CollectionStats, DeckDetail } from "@mtg/shared";
import { getRequestContext } from "../core/request-context.js";

/**
 * True if the caller may see private details (prices paid, notes): a
 * signed-in person, or a token that can make changes. Visitors browsing the
 * public site can't.
 */
export function canSeePrivate(): boolean {
  const context = getRequestContext();
  return Boolean(context?.session) || Boolean(context?.user?.scopes.includes("cards:write"));
}

/** The entry without what it cost or its notes, for visitors. */
export function redactEntry<T extends CollectionEntry>(entry: T): T {
  return canSeePrivate() ? entry : { ...entry, purchasePrice: null, currency: null, notes: null };
}

export function redactDeck(deck: DeckDetail): DeckDetail {
  return canSeePrivate()
    ? deck
    : { ...deck, cards: deck.cards.map((card) => ({ ...card, entry: redactEntry(card.entry) })) };
}

export function redactStats(stats: CollectionStats): CollectionStats {
  return canSeePrivate() ? stats : { ...stats, spent: [], recent: stats.recent.map(redactEntry) };
}

/** Sorting by price would reveal prices, so visitors get name order instead. */
export function visibleSort(sort: CollectionSort): CollectionSort {
  return !canSeePrivate() && (sort === "price" || sort === "-price") ? "name" : sort;
}
