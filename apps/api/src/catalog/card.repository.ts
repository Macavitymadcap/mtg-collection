import type { Card } from "@mtg/shared";
import { inject, injectable } from "inversify";
import type { Knex } from "knex";
import { TYPES } from "../types.js";

/** Columns of the card table that make up a Card. */
export const cardColumns = [
  "id",
  "oracleId",
  "name",
  "setCode",
  "setName",
  "collectorNumber",
  "rarity",
  "manaCost",
  "manaValue",
  "typeLine",
  "oracleText",
  "colors",
  "colorIdentity",
  "isBasicLand",
  "layout",
  "imageSmall",
  "imageNormal",
  "scryfallUri",
] as const satisfies readonly (keyof Card)[];

/** The local cache of Scryfall printings. */
@injectable()
export class CardRepository {
  constructor(@inject(TYPES.Knex) private readonly db: Knex) {}

  async findByIds(ids: string[], trx?: Knex.Transaction): Promise<Card[]> {
    if (!ids.length) return [];
    const rows = await (trx ?? this.db)("card")
      .select([...cardColumns])
      .whereIn("id", ids);
    return rows as Card[];
  }

  /** Inserts new printings and refreshes ones already cached. */
  async upsert(cards: Card[], trx?: Knex.Transaction): Promise<void> {
    if (!cards.length) return;
    const now = new Date();
    await (trx ?? this.db)("card")
      .insert(cards.map((card) => ({ ...card, fetchedAt: now })))
      .onConflict("id")
      .merge();
  }
}
