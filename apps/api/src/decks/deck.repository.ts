import type { Board, Format } from "@mtg/shared";
import { inject, injectable } from "inversify";
import type { Knex } from "knex";
import { TYPES } from "../types.js";

export interface DeckRow {
  id: number;
  name: string;
  format: Format;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeckCardRow {
  deckId: number;
  collectionEntryId: number;
  board: Board;
  quantity: number;
}

@injectable()
export class DeckRepository {
  constructor(@inject(TYPES.Knex) private readonly db: Knex) {}

  list(): Promise<DeckRow[]> {
    return this.db<DeckRow>("deck").orderBy("name");
  }

  async get(id: number, trx?: Knex.Transaction): Promise<DeckRow | null> {
    return (await (trx ?? this.db)<DeckRow>("deck").where({ id }).first()) ?? null;
  }

  async findByName(name: string, trx?: Knex.Transaction): Promise<DeckRow | null> {
    return (await (trx ?? this.db)<DeckRow>("deck").where({ name }).first()) ?? null;
  }

  async insert(values: Pick<DeckRow, "name" | "format" | "description">, trx?: Knex.Transaction): Promise<number> {
    const [id] = await (trx ?? this.db)("deck").insert(values);
    if (id === undefined) throw new Error("Insert returned no id");
    return id;
  }

  async update(
    id: number,
    values: Partial<Pick<DeckRow, "name" | "format" | "description">>,
    trx?: Knex.Transaction,
  ): Promise<void> {
    await (trx ?? this.db)("deck")
      .where({ id })
      .update({ ...values, updatedAt: new Date() });
  }

  /** Marks a deck as changed, e.g. after its cards change. */
  async touch(id: number, trx?: Knex.Transaction): Promise<void> {
    await (trx ?? this.db)("deck").where({ id }).update({ updatedAt: new Date() });
  }

  async delete(id: number): Promise<boolean> {
    return (await this.db("deck").where({ id }).delete()) > 0;
  }

  /** Card rows for some decks, or for every deck if no ids are given. */
  cards(deckIds?: number[], trx?: Knex.Transaction): Promise<DeckCardRow[]> {
    const query = (trx ?? this.db)<DeckCardRow>("deck_card");
    if (deckIds) query.whereIn("deckId", deckIds);
    return query;
  }

  /** Sets how many copies of an entry are on a board. 0 removes the row. */
  async setCard(row: DeckCardRow, trx?: Knex.Transaction): Promise<void> {
    const db = trx ?? this.db;
    const key = { deckId: row.deckId, collectionEntryId: row.collectionEntryId, board: row.board };
    if (row.quantity === 0) {
      await db("deck_card").where(key).delete();
      return;
    }
    await db("deck_card").insert(row).onConflict(["deckId", "collectionEntryId", "board"]).merge(["quantity"]);
  }
}
