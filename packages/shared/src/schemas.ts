import { z } from "zod";
import type { CreateCollectionEntryRequest, UpdateCollectionEntryRequest } from "./collection.js";
import { boards, conditions, finishes, formats } from "./constants.js";
import type { CreateDeckRequest, SetDeckCardRequest, UpdateDeckRequest } from "./deck.js";

// Each schema is typed against its interface, so a field added to one
// without the other is a compile error.

const quantity = z.number().int().min(1).max(999);
const language = z.string().min(2).max(5);
const notes = z.string().max(500).nullable();

export const createCollectionEntrySchema: z.ZodType<CreateCollectionEntryRequest> = z.object({
  scryfallId: z.uuid(),
  quantity,
  finish: z.enum(finishes),
  condition: z.enum(conditions),
  language: language.optional(),
  notes: notes.optional(),
});

export const updateCollectionEntrySchema: z.ZodType<UpdateCollectionEntryRequest> = z.object({
  quantity: quantity.optional(),
  finish: z.enum(finishes).optional(),
  condition: z.enum(conditions).optional(),
  language: language.optional(),
  notes: notes.optional(),
});

const deckName = z.string().trim().min(1, "Enter a name").max(100);
const deckDescription = z.string().max(2000).nullable();

export const createDeckSchema: z.ZodType<CreateDeckRequest> = z.object({
  name: deckName,
  format: z.enum(formats),
  description: deckDescription.optional(),
});

export const updateDeckSchema: z.ZodType<UpdateDeckRequest> = z.object({
  name: deckName.optional(),
  format: z.enum(formats).optional(),
  description: deckDescription.optional(),
});

export const setDeckCardSchema: z.ZodType<SetDeckCardRequest> = z.object({
  collectionEntryId: z.number().int().positive(),
  board: z.enum(boards),
  quantity: z.number().int().min(0).max(999),
});
