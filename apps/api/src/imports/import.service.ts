import type { ImportRowError, ImportSummary } from "@mtg/shared";
import { inject, injectable } from "inversify";
import { CardService } from "../catalog/card.service.js";
import { BadRequest } from "../core/errors.js";
import { TransactionManager } from "../core/transaction.js";
import { MAX_QUANTITY } from "../collection/collection.service.js";
import { CollectionRepository, keyString, type NewEntryRow } from "../collection/collection.repository.js";
import { parseManaboxCsv, type ManaboxRow } from "./manabox.parser.js";

interface Group {
  row: NewEntryRow & { createdAt?: Date };
  lines: number[];
  name: string;
}

/** Imports collections exported by other apps. Adds to the collection; never replaces it. */
@injectable()
export class ImportService {
  constructor(
    @inject(CollectionRepository) private readonly entries: CollectionRepository,
    @inject(CardService) private readonly cards: CardService,
    @inject(TransactionManager) private readonly tx: TransactionManager,
  ) {}

  /**
   * Imports a ManaBox CSV. All or nothing: if any row has a problem, nothing
   * is written. With dryRun, reports what would happen without writing.
   */
  async importManabox(csv: string, dryRun: boolean): Promise<ImportSummary> {
    const parsed = parseManaboxCsv(csv);
    const errors: ImportRowError[] = [...parsed.errors];

    const { cards, fetched, notFound } = await this.cards.resolve(parsed.rows.map((row) => row.scryfallId));
    const missing = new Set(notFound);
    const rows = parsed.rows.filter((row) => {
      if (!missing.has(row.scryfallId)) return true;
      errors.push({ line: row.line, name: row.name, message: "Scryfall has no card with this ID" });
      return false;
    });

    const groups = groupRows(rows);
    const existing = new Map(
      (await this.entries.findByCardIds([...cards.keys()])).map((entry) => [keyString(entry), entry]),
    );

    let created = 0;
    let merged = 0;
    for (const [key, group] of groups) {
      const current = existing.get(key);
      if (current) merged++;
      else created++;
      if ((current?.quantity ?? 0) + group.row.quantity > MAX_QUANTITY) {
        errors.push({
          line: group.lines[0] ?? 0,
          name: group.name,
          message: `would take the entry over ${MAX_QUANTITY} copies`,
        });
      }
    }

    errors.sort((a, b) => a.line - b.line);
    const summary: ImportSummary = {
      rows: parsed.rowCount,
      copies: rows.reduce((sum, row) => sum + row.quantity, 0),
      created,
      merged,
      errors,
      dryRun: dryRun || errors.length > 0,
    };
    if (summary.dryRun) return summary;
    if (!groups.size) throw new BadRequest("Nothing to import");

    await this.tx.run(async (trx) => {
      await this.cards.cache(fetched, trx);
      for (const [key, group] of groups) {
        const current = existing.get(key);
        if (current) {
          await this.entries.update(current.id, { quantity: current.quantity + group.row.quantity }, trx);
        } else {
          await this.entries.insert(group.row, trx);
        }
      }
    });
    return summary;
  }
}

/** Combines rows for identical copies, so each becomes one entry. */
function groupRows(rows: ManaboxRow[]): Map<string, Group> {
  const groups = new Map<string, Group>();
  for (const row of rows) {
    const entry: NewEntryRow = {
      cardId: row.scryfallId,
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
      notes: null,
      ...(row.addedAt && { createdAt: row.addedAt }),
    };
    const key = keyString(entry);
    const group = groups.get(key);
    if (!group) {
      groups.set(key, { row: entry, lines: [row.line], name: row.name });
      continue;
    }
    group.lines.push(row.line);
    group.row.quantity += row.quantity;
    // Keep the earliest date and the first known price
    if (entry.createdAt && (!group.row.createdAt || entry.createdAt < group.row.createdAt))
      group.row.createdAt = entry.createdAt;
    if (group.row.purchasePrice === null && entry.purchasePrice !== null) {
      group.row.purchasePrice = entry.purchasePrice;
      group.row.currency = entry.currency;
    }
  }
  return groups;
}
