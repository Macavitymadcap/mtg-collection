import {
  boards,
  checkDeck,
  deckColorIdentity,
  deckStats,
  type CreateDeckRequest,
  type DeckCard,
  type DeckDetail,
  type DeckSummary,
  type SetDeckCardRequest,
  type UpdateDeckRequest,
} from "@mtg/shared";
import { inject, injectable } from "inversify";
import type { Knex } from "knex";
import { CollectionRepository } from "../collection/collection.repository.js";
import { BadRequest, Conflict, NotFound } from "../core/errors.js";
import { TransactionManager } from "../core/transaction.js";
import { DeckRepository, type DeckCardRow, type DeckRow } from "./deck.repository.js";

@injectable()
export class DeckService {
  constructor(
    @inject(DeckRepository) private readonly decks: DeckRepository,
    @inject(CollectionRepository) private readonly entries: CollectionRepository,
    @inject(TransactionManager) private readonly tx: TransactionManager
  ) {}

  /** Every deck with its counts and warnings, by name. */
  async list(): Promise<DeckSummary[]> {
    const [decks, rows] = await Promise.all([this.decks.list(), this.decks.cards()]);
    const cards = await this.toDeckCards(rows);
    return decks.map((deck) => this.summarise(deck, cards.filter((card) => card.deckId === deck.id)));
  }

  async get(id: number, trx?: Knex.Transaction): Promise<DeckDetail> {
    const deck = await this.decks.get(id, trx);
    if (!deck) throw new NotFound(`No deck ${id}`);
    const cards = await this.toDeckCards(await this.decks.cards([id], trx), trx);
    return this.detail(deck, cards);
  }

  async create(request: CreateDeckRequest): Promise<DeckDetail> {
    const name = request.name.trim();
    return this.tx.run(async (trx) => {
      await this.assertNameFree(name, undefined, trx);
      const id = await this.decks.insert({ name, format: request.format, description: request.description ?? null }, trx);
      return this.get(id, trx);
    });
  }

  async update(id: number, request: UpdateDeckRequest): Promise<DeckDetail> {
    return this.tx.run(async (trx) => {
      if (!(await this.decks.get(id, trx))) throw new NotFound(`No deck ${id}`);
      const name = request.name?.trim();
      if (name) await this.assertNameFree(name, id, trx);
      await this.decks.update(id, { ...request, ...(name && { name }) }, trx);
      return this.get(id, trx);
    });
  }

  async remove(id: number): Promise<void> {
    if (!(await this.decks.delete(id))) throw new NotFound(`No deck ${id}`);
  }

  /**
   * Puts copies of an entry on a board, or removes them with quantity 0.
   * Using more copies than you own is allowed; it shows as a warning.
   */
  async setCard(id: number, request: SetDeckCardRequest): Promise<DeckDetail> {
    return this.tx.run(async (trx) => {
      if (!(await this.decks.get(id, trx))) throw new NotFound(`No deck ${id}`);
      if (!(await this.entries.findRow(request.collectionEntryId, trx))) {
        throw new BadRequest(`No collection entry ${request.collectionEntryId}`);
      }
      await this.decks.setCard({ deckId: id, ...request }, trx);
      await this.decks.touch(id, trx);
      return this.get(id, trx);
    });
  }

  private async assertNameFree(name: string, exceptId: number | undefined, trx: Knex.Transaction): Promise<void> {
    const existing = await this.decks.findByName(name, trx);
    if (existing && existing.id !== exceptId) throw new Conflict(`There's already a deck called "${name}"`);
  }

  /** Joins card rows to their collection entries, sorted by board then card name. */
  private async toDeckCards(rows: DeckCardRow[], trx?: Knex.Transaction): Promise<(DeckCard & { deckId: number })[]> {
    const entries = await this.entries.getMany([...new Set(rows.map((row) => row.collectionEntryId))], trx);
    const byId = new Map(entries.map((entry) => [entry.id, entry]));
    return rows
      .flatMap((row) => {
        const entry = byId.get(row.collectionEntryId);
        return entry ? [{ deckId: row.deckId, entry, board: row.board, quantity: row.quantity }] : [];
      })
      .sort((a, b) => boards.indexOf(a.board) - boards.indexOf(b.board) || a.entry.card.name.localeCompare(b.entry.card.name));
  }

  private summarise(deck: DeckRow, cards: DeckCard[]): DeckSummary {
    return {
      id: deck.id,
      name: deck.name,
      format: deck.format,
      description: deck.description,
      colorIdentity: deckColorIdentity(deck.format, cards),
      cardCount: deckStats(cards).cardCount,
      warningCount: checkDeck(deck.format, cards).length,
      createdAt: deck.createdAt.toISOString(),
      updatedAt: deck.updatedAt.toISOString(),
    };
  }

  private detail(deck: DeckRow, withIds: (DeckCard & { deckId: number })[]): DeckDetail {
    const cards: DeckCard[] = withIds.map(({ entry, board, quantity }) => ({ entry, board, quantity }));
    const warnings = checkDeck(deck.format, cards);
    const stats = deckStats(cards);
    return { ...this.summarise(deck, cards), warningCount: warnings.length, cards, stats, warnings };
  }
}
