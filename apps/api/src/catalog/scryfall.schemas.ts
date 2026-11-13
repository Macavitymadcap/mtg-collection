import { colors, rarities, type Card, type Rarity } from "@mtg/shared";
import { z } from "zod";

// Only the fields the app uses. Zod drops the rest.

const imageUris = z.object({ small: z.url().optional(), normal: z.url().optional() });

const face = z.object({
  oracle_id: z.uuid().optional(),
  mana_cost: z.string().optional(),
  type_line: z.string().optional(),
  oracle_text: z.string().optional(),
  colors: z.array(z.string()).optional(),
  image_uris: imageUris.optional(),
});

export const scryfallCardSchema = z.object({
  id: z.uuid(),
  oracle_id: z.uuid().optional(),
  name: z.string(),
  set: z.string(),
  set_name: z.string(),
  collector_number: z.string(),
  rarity: z.string(),
  mana_cost: z.string().optional(),
  cmc: z.number().optional(),
  type_line: z.string().optional(),
  oracle_text: z.string().optional(),
  colors: z.array(z.string()).optional(),
  color_identity: z.array(z.string()),
  layout: z.string(),
  image_uris: imageUris.optional(),
  card_faces: z.array(face).optional(),
  scryfall_uri: z.url(),
});
export type ScryfallCard = z.infer<typeof scryfallCardSchema>;

export const cardListSchema = z.object({
  data: z.array(scryfallCardSchema),
  has_more: z.boolean(),
  next_page: z.url().optional(),
});

export const cardCollectionSchema = z.object({
  data: z.array(scryfallCardSchema),
  not_found: z.array(z.object({ id: z.string().optional() })),
});

export const catalogSchema = z.object({ data: z.array(z.string()) });

/** Sorts colour letters into WUBRG order and drops anything else. */
function toColorString(values: string[]): string {
  return colors.filter((color) => values.includes(color)).join("");
}

function toRarity(value: string): Rarity {
  return (rarities as readonly string[]).includes(value) ? (value as Rarity) : "special";
}

/**
 * Maps a Scryfall card to the app's Card. Double-faced cards keep most of
 * their data on `card_faces`, so fall back to the faces where needed.
 */
export function toCard(card: ScryfallCard): Card {
  const faces = card.card_faces ?? [];
  const front = faces[0];
  const joinFaces = (pick: (f: (typeof faces)[number]) => string | undefined) => {
    const parts = faces.map(pick).filter((part): part is string => Boolean(part));
    return parts.length ? parts.join(" // ") : null;
  };

  const oracleId = card.oracle_id ?? front?.oracle_id;
  if (!oracleId) throw new Error(`Scryfall card ${card.id} has no oracle id`);

  const typeLine = card.type_line ?? joinFaces((f) => f.type_line) ?? "";
  const images = card.image_uris ?? front?.image_uris;

  return {
    id: card.id,
    oracleId,
    name: card.name,
    setCode: card.set,
    setName: card.set_name,
    collectorNumber: card.collector_number,
    rarity: toRarity(card.rarity),
    manaCost: card.mana_cost || joinFaces((f) => f.mana_cost),
    manaValue: card.cmc ?? 0,
    typeLine,
    oracleText: card.oracle_text ?? joinFaces((f) => f.oracle_text),
    colors: toColorString(card.colors ?? front?.colors ?? []),
    colorIdentity: toColorString(card.color_identity),
    isBasicLand: /\bBasic\b.*\bLand\b/.test(typeLine),
    layout: card.layout,
    imageSmall: images?.small ?? null,
    imageNormal: images?.normal ?? null,
    scryfallUri: card.scryfall_uri,
  };
}
