import type { Card, CollectionEntry, CollectionFilter, CollectionSort, CopyFlags } from "@mtg/shared";
import { inject, injectable } from "inversify";
import type { Knex } from "knex";
import { cardColumns } from "../catalog/card.repository.js";
import type { PageRequest } from "../core/pagination.js";
import { TYPES } from "../types.js";

/** A collection_entry row. */
export interface EntryRow extends CopyFlags {
  id: number;
  cardId: string;
  quantity: number;
  finish: CollectionEntry["finish"];
  condition: CollectionEntry["condition"];
  language: string;
  purchasePrice: number | null;
  currency: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NewEntryRow = Omit<EntryRow, "id" | "createdAt" | "updatedAt"> & { createdAt?: Date };

/** The columns that make an entry unique. Matches the collection_entry_copy_unique index. */
export type EntryKey = Pick<EntryRow, "cardId" | "finish" | "condition" | "language" | "signed" | "altered" | "misprint" | "proxy">;

export function keyOf(entry: EntryKey): EntryKey {
  const { cardId, finish, condition, language, signed, altered, misprint, proxy } = entry;
  return { cardId: cardId.toLowerCase(), finish, condition, language, signed, altered, misprint, proxy };
}

/** A string form of the key, for use in Maps. */
export function keyString(entry: EntryKey): string {
  return Object.values(keyOf(entry)).join("|");
}

/**
 * Copies allocated to decks. Decks don't exist yet, so this is 0; it becomes
 * a sum over deck_card when they do.
 */
const ALLOCATED = "0";

const sortColumns: Record<CollectionSort, [string, "asc" | "desc"][]> = {
  name: [["card.name", "asc"]],
  "-name": [["card.name", "desc"]],
  createdAt: [["collection_entry.createdAt", "asc"]],
  "-createdAt": [["collection_entry.createdAt", "desc"]],
  manaValue: [["card.manaValue", "asc"], ["card.name", "asc"]],
  "-manaValue": [["card.manaValue", "desc"], ["card.name", "asc"]],
  setCode: [["card.setCode", "asc"], ["card.collectorNumber", "asc"]],
};

type JoinedRow = EntryRow & { allocated: number } & Record<`card_${keyof Card}`, unknown>;

function toEntry(row: JoinedRow): CollectionEntry {
  const card = Object.fromEntries(cardColumns.map((column) => [column, row[`card_${column}`]])) as unknown as Card;
  const allocated = Number(row.allocated);
  return {
    id: row.id,
    card,
    quantity: row.quantity,
    finish: row.finish,
    condition: row.condition,
    language: row.language,
    signed: row.signed,
    altered: row.altered,
    misprint: row.misprint,
    proxy: row.proxy,
    purchasePrice: row.purchasePrice,
    currency: row.currency,
    notes: row.notes,
    allocated,
    available: row.quantity - allocated,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@injectable()
export class CollectionRepository {
  constructor(@inject(TYPES.Knex) private readonly db: Knex) {}

  /** Entries joined to their cards, with allocation. */
  private joined(trx?: Knex.Transaction) {
    return (trx ?? this.db)("collection_entry")
      .join("card", "card.id", "collection_entry.cardId")
      .select("collection_entry.*", this.db.raw(`${ALLOCATED} as allocated`))
      .select(cardColumns.map((column) => `card.${column} as card_${column}`));
  }

  async list(filter: CollectionFilter, sort: CollectionSort, page: PageRequest): Promise<{ results: CollectionEntry[]; count: number }> {
    const query = this.joined();

    if (filter.search) query.whereILike("card.name", `%${filter.search}%`);
    if (filter.type) query.whereILike("card.typeLine", `%${filter.type}%`);
    if (filter.setCode) query.where("card.setCode", filter.setCode.toLowerCase());
    if (filter.rarity) query.where("card.rarity", filter.rarity);
    if (filter.finish) query.where("collection_entry.finish", filter.finish);
    if (filter.colors === "C") query.where("card.colors", "");
    // Not whereLike: on MySQL it adds COLLATE utf8_bin, which fails on utf8mb4 columns
    else if (filter.colors) for (const color of filter.colors) query.where("card.colors", "like", `%${color}%`);
    if (filter.availableOnly) query.whereRaw(`collection_entry.quantity - (${ALLOCATED}) > 0`);

    const countQuery = query.clone().clearSelect().clearOrder().count({ count: "*" }).first();
    for (const [column, direction] of sortColumns[sort]) query.orderBy(column, direction);
    query.orderBy("collection_entry.id", "asc").limit(page.limit).offset((page.page - 1) * page.limit);

    const [rows, total] = await Promise.all([query, countQuery]);
    return { results: (rows as JoinedRow[]).map(toEntry), count: Number(total?.count ?? 0) };
  }

  async get(id: number, trx?: Knex.Transaction): Promise<CollectionEntry | null> {
    const row = await this.joined(trx).where("collection_entry.id", id).first();
    return row ? toEntry(row as JoinedRow) : null;
  }

  async findRow(id: number, trx?: Knex.Transaction): Promise<EntryRow | null> {
    const query = (trx ?? this.db)<EntryRow>("collection_entry").where({ id }).first();
    if (trx) query.forUpdate();
    return (await query) ?? null;
  }

  /** The entry with exactly this key, locked when inside a transaction. */
  async findByKey(key: EntryKey, trx?: Knex.Transaction): Promise<EntryRow | null> {
    const query = (trx ?? this.db)<EntryRow>("collection_entry").where(keyOf(key)).first();
    if (trx) query.forUpdate();
    return (await query) ?? null;
  }

  async findByCardIds(cardIds: string[], trx?: Knex.Transaction): Promise<EntryRow[]> {
    if (!cardIds.length) return [];
    return (trx ?? this.db)<EntryRow>("collection_entry").whereIn("cardId", cardIds);
  }

  async insert(row: NewEntryRow, trx?: Knex.Transaction): Promise<number> {
    const [id] = await (trx ?? this.db)("collection_entry").insert(row);
    if (id === undefined) throw new Error("Insert returned no id");
    return id;
  }

  async update(id: number, values: Partial<NewEntryRow>, trx?: Knex.Transaction): Promise<void> {
    await (trx ?? this.db)("collection_entry")
      .where({ id })
      .update({ ...values, updatedAt: new Date() });
  }

  async delete(id: number, trx?: Knex.Transaction): Promise<boolean> {
    return (await (trx ?? this.db)("collection_entry").where({ id }).delete()) > 0;
  }
}
