import {
  EXPORT_FORMAT_VERSION,
  exportFileSchema,
  type Board,
  type BackupImportSummary,
  type Card,
  type DataCounts,
  type ExportFile,
  type Format,
} from "@mtg/shared";
import { inject, injectable } from "inversify";
import type { Knex } from "knex";
import { cardColumns } from "../catalog/card.repository.js";
import { BadRequest } from "../core/errors.js";
import { TransactionManager } from "../core/transaction.js";
import type { EntryRow } from "../collection/collection.repository.js";
import { TYPES } from "../types.js";

interface DeckRow {
  id: number;
  name: string;
  format: Format;
  description: string | null;
  createdAt: Date;
}

interface DeckCardRow {
  deckId: number;
  collectionEntryId: number;
  board: Board;
  quantity: number;
}

/**
 * Exports the whole database as an ExportFile, and replaces it from one.
 * Database ids are swapped for references ("c1", "d1" …) so a file can be
 * loaded into any empty database. Backs the /data endpoints and the
 * db:export and db:import scripts.
 */
@injectable()
export class DataService {
  constructor(
    @inject(TYPES.Knex) private readonly db: Knex,
    @inject(TransactionManager) private readonly tx: TransactionManager,
  ) {}

  async export(): Promise<ExportFile> {
    const [entries, decks, deckCards] = await Promise.all([
      this.db<EntryRow>("collection_entry").orderBy("id"),
      this.db<DeckRow>("deck").orderBy("name"),
      this.db<DeckCardRow>("deck_card").orderBy(["deckId", "collectionEntryId", "board"]),
    ]);
    // Only cards the collection uses: the table also caches cards looked at but never added
    const cards = await this.db("card")
      .select<Card[]>([...cardColumns])
      .whereIn("id", [...new Set(entries.map((entry) => entry.cardId))])
      .orderBy("id");

    const refs = new Map(entries.map((entry, i) => [entry.id, `c${i + 1}`]));
    return {
      formatVersion: EXPORT_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      cards,
      collection: entries.map((entry) => ({
        ref: refs.get(entry.id) ?? "",
        cardId: entry.cardId,
        quantity: entry.quantity,
        finish: entry.finish,
        condition: entry.condition,
        language: entry.language,
        purchasePrice: entry.purchasePrice,
        currency: entry.currency,
        signed: entry.signed,
        altered: entry.altered,
        misprint: entry.misprint,
        proxy: entry.proxy,
        notes: entry.notes,
        createdAt: entry.createdAt.toISOString(),
      })),
      decks: decks.map((deck, i) => ({
        ref: `d${i + 1}`,
        name: deck.name,
        format: deck.format,
        description: deck.description,
        createdAt: deck.createdAt.toISOString(),
        cards: deckCards
          .filter((card) => card.deckId === deck.id)
          .map((card) => ({
            collectionRef: refs.get(card.collectionEntryId) ?? "",
            board: card.board,
            quantity: card.quantity,
          })),
      })),
    };
  }

  /**
   * Replaces everything in the database with the file's contents, in one
   * transaction: if anything fails, nothing changes. With dryRun, validates
   * the file and reports the counts without writing.
   */
  async import(input: unknown, dryRun: boolean): Promise<BackupImportSummary> {
    const parsed = exportFileSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequest(
        "This isn't a valid export file",
        parsed.error.issues.slice(0, 50).map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      );
    }
    const file = parsed.data;
    const incoming = countFile(file);

    if (dryRun) return { incoming, replaced: await this.counts(), dryRun: true };

    const replaced = await this.tx.run(async (trx) => {
      const before = await this.counts(trx);

      // Children first, because of the foreign keys
      await trx("deck_card").delete();
      await trx("deck").delete();
      await trx("collection_entry").delete();
      await trx("card").delete();

      const now = new Date();
      await trx.batchInsert(
        "card",
        file.cards.map((card) => ({ ...card, fetchedAt: now })),
        500,
      );

      // One at a time, because each new id is needed to link deck cards
      const entryIds = new Map<string, number>();
      for (const { ref, createdAt, ...entry } of file.collection) {
        const [id] = await trx("collection_entry").insert({ ...entry, createdAt: new Date(createdAt), updatedAt: now });
        if (id === undefined) throw new Error("Insert returned no id");
        entryIds.set(ref, id);
      }

      for (const { ref: _ref, cards, createdAt, ...deck } of file.decks) {
        const [deckId] = await trx("deck").insert({ ...deck, createdAt: new Date(createdAt), updatedAt: now });
        if (deckId === undefined) throw new Error("Insert returned no id");
        const rows = cards.map((card) => ({
          deckId,
          collectionEntryId: entryIds.get(card.collectionRef),
          board: card.board,
          quantity: card.quantity,
        }));
        if (rows.length) await trx("deck_card").insert(rows);
      }
      return before;
    });

    return { incoming, replaced, dryRun: false };
  }

  /** What's in the database now. */
  async counts(trx?: Knex.Transaction): Promise<DataCounts> {
    const db = trx ?? this.db;
    const count = async (table: string): Promise<number> => {
      const row = await db(table).first<{ n: number | string } | undefined>(db.raw("count(*) as n"));
      return Number(row?.n ?? 0);
    };
    const copies = await db("collection_entry").first<{ n: number | string | null } | undefined>(
      db.raw("sum(quantity) as n"),
    );
    // Only cards the collection uses, to match what an export contains
    const cards = await db("collection_entry").first<{ n: number | string } | undefined>(
      db.raw("count(distinct cardId) as n"),
    );
    return {
      cards: Number(cards?.n ?? 0),
      entries: await count("collection_entry"),
      copies: Number(copies?.n ?? 0),
      decks: await count("deck"),
      deckCards: await count("deck_card"),
    };
  }
}

function countFile(file: ExportFile): DataCounts {
  return {
    cards: file.cards.length,
    entries: file.collection.length,
    copies: file.collection.reduce((sum, entry) => sum + entry.quantity, 0),
    decks: file.decks.length,
    deckCards: file.decks.reduce((sum, deck) => sum + deck.cards.length, 0),
  };
}

/** For callers that read a file from disk. */
export const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new BadRequest(`Not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
};
