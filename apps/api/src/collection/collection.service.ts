import type {
  CollectionEntry,
  CollectionEntryDetail,
  CollectionFilter,
  CollectionSort,
  CreateCollectionEntryRequest,
  Page,
  UpdateCollectionEntryRequest,
} from "@mtg/shared";
import { inject, injectable } from "inversify";
import { CardService } from "../catalog/card.service.js";
import { BadRequest, NotFound } from "../core/errors.js";
import { toPage, type PageRequest } from "../core/pagination.js";
import { TransactionManager } from "../core/transaction.js";
import { CollectionRepository, keyOf, type EntryRow, type NewEntryRow } from "./collection.repository.js";

export const MAX_QUANTITY = 999;

export interface AddResult {
  entry: CollectionEntry;
  /** False if the copies were added to an existing entry. */
  created: boolean;
}

@injectable()
export class CollectionService {
  constructor(
    @inject(CollectionRepository) private readonly entries: CollectionRepository,
    @inject(CardService) private readonly cards: CardService,
    @inject(TransactionManager) private readonly tx: TransactionManager
  ) {}

  async list(filter: CollectionFilter, sort: CollectionSort, page: PageRequest): Promise<Page<CollectionEntry>> {
    if (filter.colors && !/^(C|W?U?B?R?G?)$/.test(filter.colors)) {
      throw new BadRequest('colors must be letters from "WUBRG" in that order, or "C" for colourless');
    }
    const { results, count } = await this.entries.list(filter, sort, page);
    return toPage(results, count, page);
  }

  async get(id: number): Promise<CollectionEntryDetail> {
    const entry = await this.entries.get(id);
    if (!entry) throw new NotFound(`No collection entry ${id}`);
    return { ...entry, usages: [] };
  }

  /** Adds copies. If an identical entry exists, its quantity goes up instead. */
  async add(request: CreateCollectionEntryRequest): Promise<AddResult> {
    // Look the card up before opening the transaction: it may call Scryfall
    const { card, fetched } = await this.cards.resolveOne(request.scryfallId);

    const row: NewEntryRow = {
      cardId: card.id,
      quantity: request.quantity,
      finish: request.finish,
      condition: request.condition,
      language: request.language ?? "en",
      signed: request.signed ?? false,
      altered: request.altered ?? false,
      misprint: request.misprint ?? false,
      proxy: request.proxy ?? false,
      purchasePrice: request.purchasePrice ?? null,
      currency: request.currency ?? null,
      notes: request.notes ?? null,
    };

    return this.tx.run(async (trx) => {
      await this.cards.cache(fetched, trx);
      const existing = await this.entries.findByKey(row, trx);

      let id: number;
      if (existing) {
        id = existing.id;
        await this.entries.update(id, { quantity: checkedSum(existing.quantity, row.quantity), ...fillGaps(existing, row) }, trx);
      } else {
        id = await this.entries.insert(row, trx);
      }

      const entry = await this.entries.get(id, trx);
      if (!entry) throw new Error(`Entry ${id} vanished`);
      return { entry, created: !existing };
    });
  }

  /**
   * Edits an entry. If the edit makes it identical to another entry (for
   * example after correcting the printing or condition), the two are merged
   * and the surviving entry is returned, so the id can change.
   */
  async update(id: number, request: UpdateCollectionEntryRequest): Promise<CollectionEntry> {
    const { scryfallId, ...changes } = request;
    const resolved = scryfallId ? await this.cards.resolveOne(scryfallId) : null;

    return this.tx.run(async (trx) => {
      const current = await this.entries.findRow(id, trx);
      if (!current) throw new NotFound(`No collection entry ${id}`);
      if (resolved) await this.cards.cache(resolved.fetched, trx);

      const updated: EntryRow = { ...current, ...changes, cardId: resolved?.card.id ?? current.cardId };
      const twin = await this.entries.findByKey(updated, trx);

      let resultId = id;
      if (twin && twin.id !== id) {
        // Fold this entry into its twin
        await this.entries.update(twin.id, { quantity: checkedSum(twin.quantity, updated.quantity), ...fillGaps(twin, updated) }, trx);
        await this.entries.delete(id, trx);
        resultId = twin.id;
      } else {
        await this.entries.update(id, { ...keyOf(updated), ...changes }, trx);
      }

      const entry = await this.entries.get(resultId, trx);
      if (!entry) throw new Error(`Entry ${resultId} vanished`);
      return entry;
    });
  }

  async remove(id: number): Promise<void> {
    if (!(await this.entries.delete(id))) throw new NotFound(`No collection entry ${id}`);
  }
}

function checkedSum(a: number, b: number): number {
  if (a + b > MAX_QUANTITY) throw new BadRequest(`An entry can hold at most ${MAX_QUANTITY} copies`);
  return a + b;
}

/** When merging, keep the existing entry's price and notes, but fill them in if it has none. */
function fillGaps(existing: EntryRow, incoming: NewEntryRow): Partial<NewEntryRow> {
  const values: Partial<NewEntryRow> = {};
  if (existing.purchasePrice === null && incoming.purchasePrice !== null) {
    values.purchasePrice = incoming.purchasePrice;
    values.currency = incoming.currency;
  }
  if (!existing.notes && incoming.notes) values.notes = incoming.notes;
  return values;
}
