import type { Board, Format, ImportRowError, ImportSummary, PreconImportRequest } from "@mtg/shared";
import { inject, injectable } from "inversify";
import { CardService } from "../catalog/card.service.js";
import type { PreconDeck, PreconSource } from "../catalog/precon-source.js";
import { MAX_QUANTITY } from "../collection/collection.service.js";
import { CollectionRepository, keyString, type NewEntryRow } from "../collection/collection.repository.js";
import { BadRequest, NotFound } from "../core/errors.js";
import { TransactionManager } from "../core/transaction.js";
import { DeckRepository } from "../decks/deck.repository.js";
import { TYPES } from "../types.js";
import { parseManaboxCsv, type ManaboxRow } from "./manabox.parser.js";

/** One line of an import: copies of a printing, and the deck board they go on if a deck is being created. */
export type ImportRow = ManaboxRow & { board?: Board };

interface NewDeck {
  name: string;
  format: Format;
  description: string;
}

/** Rows for identical copies, combined into one collection entry. */
interface Group {
  row: NewEntryRow;
  lines: number[];
  name: string;
  /** Copies per deck board, when a deck is being created. */
  boards: Map<Board, number>;
}

/**
 * Adds cards from other sources to the collection: ManaBox exports and
 * preconstructed decks. Imports add to the collection, never replace it, and
 * are all or nothing: if any row has a problem, nothing is written.
 */
@injectable()
export class ImportService {
  constructor(
    @inject(CollectionRepository) private readonly entries: CollectionRepository,
    @inject(DeckRepository) private readonly decks: DeckRepository,
    @inject(CardService) private readonly cards: CardService,
    @inject(TYPES.PreconSource) private readonly precons: PreconSource,
    @inject(TransactionManager) private readonly tx: TransactionManager,
  ) {}

  /** Imports a ManaBox CSV. With dryRun, reports what would happen without writing. */
  async importManabox(csv: string, dryRun: boolean): Promise<ImportSummary> {
    const parsed = parseManaboxCsv(csv);
    return this.run(parsed.rows, parsed.errors, parsed.rowCount, dryRun);
  }

  /**
   * Imports every card in a preconstructed product as near-mint English
   * copies, optionally creating a deck from them too.
   */
  async importPrecon(request: PreconImportRequest, dryRun: boolean): Promise<ImportSummary> {
    const precon = await this.precons.get(request.fileName);
    if (!precon) throw new NotFound(`No preconstructed deck "${request.fileName}"`);

    const errors: ImportRowError[] = [];
    const rows: ImportRow[] = [];
    precon.cards.forEach((card, index) => {
      const line = index + 1;
      if (!card.scryfallId) {
        errors.push({ line, name: card.name, message: "MTGJSON doesn't give a Scryfall ID for this card" });
        return;
      }
      rows.push({
        line,
        name: card.name,
        scryfallId: card.scryfallId,
        quantity: card.quantity,
        finish: card.finish,
        condition: "NM",
        language: "en",
        signed: false,
        altered: false,
        misprint: false,
        proxy: false,
        purchasePrice: null,
        currency: null,
        addedAt: null,
        board: card.board,
      });
    });

    const deck: NewDeck | undefined = request.createDeck
      ? {
          name: request.deckName?.trim() || precon.name,
          format: /commander/i.test(precon.type) ? "commander" : "casual",
          description: `${precon.name} (${precon.setCode.toUpperCase()} ${precon.type}${precon.releaseDate ? `, ${precon.releaseDate.slice(0, 4)}` : ""})`,
        }
      : undefined;

    if (request.useOwnedCards) {
      if (!deck) throw new BadRequest("Building from owned cards creates a deck: set createDeck to true");
      return this.buildDeckFromOwned(precon, deck, dryRun);
    }
    return this.run(rows, errors, precon.cards.length, dryRun, deck);
  }

  /**
   * Builds a product's deck from cards already in the collection, adding no
   * copies. For each card it uses, in order of preference: the same printing
   * and finish, the same printing in another finish, then any printing of the
   * card (scans sometimes log the wrong set). Free copies are used before
   * copies already in other decks. Substitutions are reported as notes; if
   * any card isn't owned in sufficient numbers, nothing is written.
   */
  private async buildDeckFromOwned(precon: PreconDeck, deck: NewDeck, dryRun: boolean): Promise<ImportSummary> {
    const errors: ImportRowError[] = [];
    const notes: ImportRowError[] = [];
    const lines = precon.cards.map((card, index) => ({ ...card, line: index + 1 }));

    const ids = lines.flatMap((line) => (line.scryfallId ? [line.scryfallId] : []));
    const { cards } = await this.cards.resolve(ids);
    const owned = await this.entries.findByOracleIds([...new Set([...cards.values()].map((card) => card.oracleId))]);

    // Copies of each entry still unclaimed by this deck: in total, and not in any deck
    const remaining = new Map(owned.map((entry) => [entry.id, entry.quantity]));
    const free = new Map(owned.map((entry) => [entry.id, Math.max(0, entry.quantity - entry.allocated)]));
    const plan = new Map<string, { collectionEntryId: number; board: Board; quantity: number }>();
    const usedEntries = new Set<number>();

    for (const line of lines) {
      if (!line.scryfallId) {
        errors.push({ line: line.line, name: line.name, message: "MTGJSON doesn't give a Scryfall ID for this card" });
        continue;
      }
      const card = cards.get(line.scryfallId.toLowerCase());
      if (!card) {
        errors.push({ line: line.line, name: line.name, message: "Scryfall has no card with this ID" });
        continue;
      }

      const preference = (entry: (typeof owned)[number]): number =>
        entry.cardId === card.id ? (entry.finish === line.finish ? 0 : 1) : 2;
      const candidates = owned
        .filter((entry) => entry.oracleId === card.oracleId)
        .sort((a, b) => preference(a) - preference(b) || (free.get(b.id) ?? 0) - (free.get(a.id) ?? 0));

      let needed = line.quantity;
      const used: { entry: (typeof owned)[number]; quantity: number; inOtherDecks: boolean }[] = [];
      for (const pass of ["free", "any"] as const) {
        for (const entry of candidates) {
          if (needed === 0) break;
          const available = (pass === "free" ? free.get(entry.id) : remaining.get(entry.id)) ?? 0;
          const take = Math.min(needed, available);
          if (take <= 0) continue;
          needed -= take;
          remaining.set(entry.id, (remaining.get(entry.id) ?? 0) - take);
          free.set(
            entry.id,
            Math.min(
              Math.max(0, (free.get(entry.id) ?? 0) - (pass === "free" ? take : 0)),
              remaining.get(entry.id) ?? 0,
            ),
          );
          used.push({ entry, quantity: take, inOtherDecks: pass === "any" });
        }
      }

      if (needed > 0) {
        const found = line.quantity - needed;
        errors.push({
          line: line.line,
          name: line.name,
          message: found
            ? `you own ${found} ${found === 1 ? "copy" : "copies"} (any printing); the deck needs ${line.quantity}`
            : "not in your collection (no printing of it)",
        });
        continue;
      }

      for (const { entry, quantity, inOtherDecks } of used) {
        usedEntries.add(entry.id);
        const key = `${entry.id}|${line.board}`;
        const planned = plan.get(key);
        if (planned) planned.quantity += quantity;
        else plan.set(key, { collectionEntryId: entry.id, board: line.board, quantity });

        const substitutions: string[] = [];
        if (entry.cardId !== card.id) {
          substitutions.push(
            `your ${entry.setCode.toUpperCase()} #${entry.collectorNumber} printing (the product's is ${card.setCode.toUpperCase()} #${card.collectorNumber})`,
          );
        } else if (entry.finish !== line.finish) {
          substitutions.push(`a ${entry.finish} copy (the product's is ${line.finish})`);
        }
        if (inOtherDecks) substitutions.push("copies already in another deck");
        if (substitutions.length)
          notes.push({ line: line.line, name: line.name, message: `Uses ${substitutions.join(", and ")}` });
      }
    }

    if (await this.decks.findByName(deck.name)) {
      errors.push({
        line: 0,
        name: deck.name,
        message: `There's already a deck called "${deck.name}". Choose another name.`,
      });
    }

    errors.sort((a, b) => a.line - b.line);
    const summary: ImportSummary = {
      rows: precon.cards.length,
      copies: lines.reduce((sum, line) => sum + line.quantity, 0),
      created: 0,
      merged: usedEntries.size,
      errors,
      notes,
      dryRun: dryRun || errors.length > 0,
      deck: { id: null, name: deck.name, format: deck.format },
    };
    if (summary.dryRun) return summary;

    const deckId = await this.tx.run(async (trx) => {
      const id = await this.decks.insert(deck, trx);
      for (const row of plan.values()) await this.decks.setCard({ deckId: id, ...row }, trx);
      return id;
    });
    if (summary.deck) summary.deck.id = deckId;
    return summary;
  }

  private async run(
    parsedRows: ImportRow[],
    parseErrors: ImportRowError[],
    rowCount: number,
    dryRun: boolean,
    deck?: NewDeck,
  ): Promise<ImportSummary> {
    const errors: ImportRowError[] = [...parseErrors];

    // Look cards up before any transaction: this may call Scryfall
    const { cards, fetched, notFound } = await this.cards.resolve(parsedRows.map((row) => row.scryfallId));
    const missing = new Set(notFound);
    const rows = parsedRows.filter((row) => {
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

    if (deck && (await this.decks.findByName(deck.name))) {
      errors.push({
        line: 0,
        name: deck.name,
        message: `There's already a deck called "${deck.name}". Choose another name.`,
      });
    }

    errors.sort((a, b) => a.line - b.line);
    const summary: ImportSummary = {
      rows: rowCount,
      copies: rows.reduce((sum, row) => sum + row.quantity, 0),
      created,
      merged,
      errors,
      dryRun: dryRun || errors.length > 0,
      deck: deck ? { id: null, name: deck.name, format: deck.format } : null,
    };
    if (summary.dryRun) return summary;
    if (!groups.size) throw new BadRequest("Nothing to import");

    const deckId = await this.tx.run(async (trx) => {
      await this.cards.cache(fetched, trx);

      const entryIds = new Map<string, number>();
      for (const [key, group] of groups) {
        const current = existing.get(key);
        if (current) {
          await this.entries.update(current.id, { quantity: current.quantity + group.row.quantity }, trx);
          entryIds.set(key, current.id);
        } else {
          entryIds.set(key, await this.entries.insert(group.row, trx));
        }
      }

      if (!deck) return null;
      const id = await this.decks.insert(deck, trx);
      for (const [key, group] of groups) {
        const collectionEntryId = entryIds.get(key);
        if (collectionEntryId === undefined) continue;
        for (const [board, quantity] of group.boards) {
          await this.decks.setCard({ deckId: id, collectionEntryId, board, quantity }, trx);
        }
      }
      return id;
    });

    if (summary.deck) summary.deck.id = deckId;
    return summary;
  }
}

/** Combines rows for identical copies, so each becomes one entry. */
function groupRows(rows: ImportRow[]): Map<string, Group> {
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
    let group = groups.get(key);
    if (!group) {
      group = { row: entry, lines: [], name: row.name, boards: new Map() };
      groups.set(key, group);
    } else {
      group.row.quantity += row.quantity;
      // Keep the earliest date and the first known price
      if (entry.createdAt && (!group.row.createdAt || entry.createdAt < group.row.createdAt)) {
        group.row.createdAt = entry.createdAt;
      }
      if (group.row.purchasePrice === null && entry.purchasePrice !== null) {
        group.row.purchasePrice = entry.purchasePrice;
        group.row.currency = entry.currency;
      }
    }
    group.lines.push(row.line);
    if (row.board) group.boards.set(row.board, (group.boards.get(row.board) ?? 0) + row.quantity);
  }
  return groups;
}
