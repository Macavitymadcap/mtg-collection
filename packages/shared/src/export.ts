import { z } from "zod";
import type { Card, CardDetails } from "./card.js";
import {
  boards,
  conditions,
  finishes,
  formats,
  rarities,
  type Board,
  type Condition,
  type Finish,
  type Format,
} from "./constants.js";

/**
 * The format files are written in. Version 2 spells the card fields
 * `colours` and `colourIdentity`; version 1 files (`colors`, `colorIdentity`)
 * are still accepted on import and upgraded as they're read.
 */
export const EXPORT_FORMAT_VERSION = 2;

export interface ExportCollectionEntry {
  /** Reference used by deck cards in the same file; not a database id. */
  ref: string;
  cardId: string;
  quantity: number;
  finish: Finish;
  condition: Condition;
  language: string;
  purchasePrice: number | null;
  currency: string | null;
  signed: boolean;
  altered: boolean;
  misprint: boolean;
  proxy: boolean;
  notes: string | null;
  createdAt: string;
}

export interface ExportDeckCard {
  collectionRef: string;
  board: Board;
  quantity: number;
}

export interface ExportDeck {
  ref: string;
  name: string;
  format: Format;
  description: string | null;
  createdAt: string;
  cards: ExportDeckCard[];
}

/** What replacing the database with an export file does (or would do, in a dry run). */
export interface BackupImportSummary {
  /** What the file contains. */
  incoming: DataCounts;
  /** What was in the database before (and is deleted by the import). */
  replaced: DataCounts;
  dryRun: boolean;
}

export interface DataCounts {
  cards: number;
  entries: number;
  copies: number;
  decks: number;
  deckCards: number;
}

/** The whole database as JSON, for backups and moving between environments. */
export interface ExportFile {
  formatVersion: 2;
  exportedAt: string;
  cards: Card[];
  collection: ExportCollectionEntry[];
  decks: ExportDeck[];
}

/** A card in a version 1 file. Written out rather than with Omit, which tsoa's validation mishandles. */
export interface ExportCardV1 extends CardDetails {
  colors: string;
  colorIdentity: string;
}

/** A version 1 file: the same, apart from how cards spell their colours. */
export interface ExportFileV1 extends Omit<ExportFile, "formatVersion" | "cards"> {
  formatVersion: 1;
  cards: ExportCardV1[];
}

/** Turns a version 1 file into version 2. Anything else passes through for the schema to check. */
function upgradeV1(input: unknown): unknown {
  if (typeof input !== "object" || input === null || !("formatVersion" in input) || input.formatVersion !== 1) {
    return input;
  }
  const file = input as { cards?: unknown };
  const cards = Array.isArray(file.cards)
    ? file.cards.map((card: unknown) => {
        if (typeof card !== "object" || card === null) return card;
        const { colors, colorIdentity, ...rest } = card as Record<string, unknown>;
        return { ...rest, colours: colors, colourIdentity: colorIdentity };
      })
    : file.cards;
  return { ...input, formatVersion: 2, cards };
}

const cardSchema: z.ZodType<Card> = z.object({
  id: z.uuid(),
  oracleId: z.uuid(),
  name: z.string().min(1),
  setCode: z.string().min(1),
  setName: z.string(),
  collectorNumber: z.string().min(1),
  rarity: z.enum(rarities),
  manaCost: z.string().nullable(),
  manaValue: z.number().min(0),
  typeLine: z.string(),
  oracleText: z.string().nullable(),
  colours: z.string().regex(/^W?U?B?R?G?$/),
  colourIdentity: z.string().regex(/^W?U?B?R?G?$/),
  isBasicLand: z.boolean(),
  layout: z.string(),
  imageSmall: z.url().nullable(),
  imageNormal: z.url().nullable(),
  scryfallUri: z.url(),
});

/** Validates an export file (version 1 or 2), including that every reference resolves. */
export const exportFileSchema: z.ZodType<ExportFile, unknown> = z.preprocess(
  upgradeV1,
  z
    .object({
      formatVersion: z.literal(EXPORT_FORMAT_VERSION),
      exportedAt: z.iso.datetime(),
      cards: z.array(cardSchema),
      collection: z.array(
        z.object({
          ref: z.string().min(1),
          cardId: z.uuid(),
          quantity: z.number().int().min(1).max(999),
          finish: z.enum(finishes),
          condition: z.enum(conditions),
          language: z.string().min(2).max(5),
          purchasePrice: z.number().min(0).nullable(),
          currency: z
            .string()
            .regex(/^[A-Z]{3}$/)
            .nullable(),
          signed: z.boolean(),
          altered: z.boolean(),
          misprint: z.boolean(),
          proxy: z.boolean(),
          notes: z.string().max(500).nullable(),
          createdAt: z.iso.datetime(),
        }),
      ),
      decks: z.array(
        z.object({
          ref: z.string().min(1),
          name: z.string().min(1).max(100),
          format: z.enum(formats),
          description: z.string().max(2000).nullable(),
          createdAt: z.iso.datetime(),
          cards: z.array(
            z.object({
              collectionRef: z.string().min(1),
              board: z.enum(boards),
              quantity: z.number().int().min(1).max(999),
            }),
          ),
        }),
      ),
    })
    .superRefine((file, ctx) => {
      const issue = (path: (string | number)[], message: string): void => {
        ctx.addIssue({ code: "custom", path, message });
      };
      /** Reports the second and later occurrences of each key. */
      const unique = <T>(
        items: T[],
        key: (item: T) => string,
        path: (i: number) => (string | number)[],
        what: string,
      ) => {
        const seen = new Set<string>();
        items.forEach((item, i) => {
          const k = key(item);
          if (seen.has(k)) issue(path(i), `Duplicate ${what}`);
          seen.add(k);
        });
        return seen;
      };

      const cardIds = unique(
        file.cards,
        (card) => card.id,
        (i) => ["cards", i, "id"],
        "card id",
      );
      const entryRefs = unique(
        file.collection,
        (entry) => entry.ref,
        (i) => ["collection", i, "ref"],
        "collection ref",
      );
      // The database allows one entry per printing, finish, condition, language and flags
      unique(
        file.collection,
        (e) => [e.cardId, e.finish, e.condition, e.language, e.signed, e.altered, e.misprint, e.proxy].join("|"),
        (i) => ["collection", i],
        "collection entry (same card, finish, condition, language and flags as an earlier one)",
      );
      unique(
        file.decks,
        (deck) => deck.ref,
        (i) => ["decks", i, "ref"],
        "deck ref",
      );
      unique(
        file.decks,
        (deck) => deck.name,
        (i) => ["decks", i, "name"],
        "deck name",
      );

      file.collection.forEach((entry, i) => {
        if (!cardIds.has(entry.cardId)) issue(["collection", i, "cardId"], `Unknown card ${entry.cardId}`);
      });
      file.decks.forEach((deck, d) => {
        unique(
          deck.cards,
          (card) => `${card.collectionRef}|${card.board}`,
          (c) => ["decks", d, "cards", c],
          "deck card (same entry on the same board)",
        );
        deck.cards.forEach((card, c) => {
          if (!entryRefs.has(card.collectionRef)) {
            issue(["decks", d, "cards", c, "collectionRef"], `Unknown collection ref ${card.collectionRef}`);
          }
        });
      });
    }),
);
