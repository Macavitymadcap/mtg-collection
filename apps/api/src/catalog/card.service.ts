import type { Card } from "@mtg/shared";
import { inject, injectable } from "inversify";
import type { Knex } from "knex";
import { NotFound } from "../core/errors.js";
import { TYPES } from "../types.js";
import type { CardCatalog } from "./card-catalog.js";
import { CardRepository } from "./card.repository.js";

export interface ResolvedCards {
  /** Every requested printing that exists, by id. */
  cards: Map<string, Card>;
  /** Printings fetched from the catalogue that aren't cached yet. Save them with `cache`. */
  fetched: Card[];
  notFound: string[];
}

/** Gets printings from the local cache, falling back to the catalogue (Scryfall). */
@injectable()
export class CardService {
  constructor(
    @inject(CardRepository) private readonly cards: CardRepository,
    @inject(TYPES.CardCatalog) private readonly catalog: CardCatalog
  ) {}

  /**
   * Looks up printings without writing anything, so the network calls can
   * happen before a transaction is opened.
   */
  async resolve(ids: string[]): Promise<ResolvedCards> {
    const wanted = [...new Set(ids.map((id) => id.toLowerCase()))];
    const cached = await this.cards.findByIds(wanted);
    const cards = new Map(cached.map((card) => [card.id, card]));

    const missing = wanted.filter((id) => !cards.has(id));
    if (!missing.length) return { cards, fetched: [], notFound: [] };

    const { found, notFound } = await this.catalog.byIds(missing);
    for (const card of found) cards.set(card.id, card);
    return { cards, fetched: found, notFound };
  }

  /** One printing, or 404 if Scryfall doesn't know it. */
  async resolveOne(id: string): Promise<ResolvedCards & { card: Card }> {
    const resolved = await this.resolve([id]);
    const card = resolved.cards.get(id.toLowerCase());
    if (!card) throw new NotFound(`No card with Scryfall id ${id}`);
    return { ...resolved, card };
  }

  cache(cards: Card[], trx?: Knex.Transaction): Promise<void> {
    return this.cards.upsert(cards, trx);
  }
}
