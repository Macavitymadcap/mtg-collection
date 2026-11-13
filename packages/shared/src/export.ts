import { z } from "zod";
import type { Card } from "./card.js";
import { boards, conditions, finishes, formats, rarities, type Board, type Condition, type Finish, type Format } from "./constants.js";

export const EXPORT_FORMAT_VERSION = 1;

export interface ExportCollectionEntry {
  /** Reference used by deck cards in the same file; not a database id. */
  ref: string;
  cardId: string;
  quantity: number;
  finish: Finish;
  condition: Condition;
  language: string;
  notes: string | null;
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
  cards: ExportDeckCard[];
}

/** The whole database as JSON, for backups and moving between environments. */
export interface ExportFile {
  formatVersion: 1;
  exportedAt: string;
  cards: Card[];
  collection: ExportCollectionEntry[];
  decks: ExportDeck[];
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
  colors: z.string().regex(/^W?U?B?R?G?$/),
  colorIdentity: z.string().regex(/^W?U?B?R?G?$/),
  isBasicLand: z.boolean(),
  layout: z.string(),
  imageSmall: z.url().nullable(),
  imageNormal: z.url().nullable(),
  scryfallUri: z.url(),
});

/** Validates an export file, including that every reference resolves. */
export const exportFileSchema: z.ZodType<ExportFile> = z
  .object({
    formatVersion: z.literal(EXPORT_FORMAT_VERSION),
    exportedAt: z.iso.datetime(),
    cards: z.array(cardSchema),
    collection: z.array(
      z.object({
        ref: z.string().min(1),
        cardId: z.uuid(),
        quantity: z.number().int().min(1),
        finish: z.enum(finishes),
        condition: z.enum(conditions),
        language: z.string().min(2).max(5),
        notes: z.string().max(500).nullable(),
      })
    ),
    decks: z.array(
      z.object({
        ref: z.string().min(1),
        name: z.string().min(1).max(100),
        format: z.enum(formats),
        description: z.string().nullable(),
        cards: z.array(
          z.object({
            collectionRef: z.string().min(1),
            board: z.enum(boards),
            quantity: z.number().int().min(1),
          })
        ),
      })
    ),
  })
  .superRefine((file, ctx) => {
    const cardIds = new Set(file.cards.map((card) => card.id));
    const entryRefs = new Set(file.collection.map((entry) => entry.ref));
    file.collection.forEach((entry, i) => {
      if (!cardIds.has(entry.cardId)) {
        ctx.addIssue({ code: "custom", path: ["collection", i, "cardId"], message: `Unknown card ${entry.cardId}` });
      }
    });
    file.decks.forEach((deck, d) => {
      deck.cards.forEach((card, c) => {
        if (!entryRefs.has(card.collectionRef)) {
          ctx.addIssue({
            code: "custom",
            path: ["decks", d, "cards", c, "collectionRef"],
            message: `Unknown collection ref ${card.collectionRef}`,
          });
        }
      });
    });
  });
