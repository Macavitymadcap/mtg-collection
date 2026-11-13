import { colors as wubrg, type Board, type Format } from "./constants.js";
import type { DeckCard, DeckStats, DeckWarning } from "./deck.js";

/** Boards that are part of the deck you play. Sideboard and maybe aren't. */
const PLAYED_BOARDS: readonly Board[] = ["commander", "main"];
/** Boards that count towards copy limits. */
const LIMITED_BOARDS: readonly Board[] = ["commander", "main", "side"];

interface FormatRules {
  /** Exact deck size (commander) or minimum (constructed). */
  size?: { exact?: number; min?: number };
  maxSideboard?: number;
  maxCopies?: number;
  commander?: boolean;
}

const rules: Record<Format, FormatRules> = {
  commander: { size: { exact: 100 }, maxSideboard: 0, maxCopies: 1, commander: true },
  standard: { size: { min: 60 }, maxSideboard: 15, maxCopies: 4 },
  pioneer: { size: { min: 60 }, maxSideboard: 15, maxCopies: 4 },
  modern: { size: { min: 60 }, maxSideboard: 15, maxCopies: 4 },
  legacy: { size: { min: 60 }, maxSideboard: 15, maxCopies: 4 },
  pauper: { size: { min: 60 }, maxSideboard: 15, maxCopies: 4 },
  casual: {},
};

const count = (cards: DeckCard[], boards: readonly Board[]): number =>
  cards.filter((card) => boards.includes(card.board)).reduce((sum, card) => sum + card.quantity, 0);

/** Letters in WUBRG order. */
function sortColors(letters: Iterable<string>): string {
  const set = new Set(letters);
  return wubrg.filter((color) => set.has(color)).join("");
}

/** Basic lands, and cards that say so (e.g. Relentless Rats), ignore copy limits. */
function unlimitedCopies(card: DeckCard): boolean {
  const { isBasicLand, oracleText } = card.entry.card;
  return isBasicLand || /any number of cards named/i.test(oracleText ?? "");
}

/**
 * A deck's colour identity. In commander it's the commanders'; otherwise it's
 * every card on the main deck.
 */
export function deckColorIdentity(format: Format, cards: DeckCard[]): string {
  const source =
    rules[format].commander && cards.some((card) => card.board === "commander")
      ? cards.filter((card) => card.board === "commander")
      : cards.filter((card) => PLAYED_BOARDS.includes(card.board));
  return sortColors(source.flatMap((card) => [...card.entry.card.colorIdentity]));
}

/**
 * Checks a deck against its format's construction rules and against what you
 * own. Returns warnings; nothing here blocks saving. Card legality (bans,
 * which sets are allowed) isn't checked.
 */
export function checkDeck(format: Format, cards: DeckCard[]): DeckWarning[] {
  const warnings: DeckWarning[] = [];
  const formatRules = rules[format];

  const played = count(cards, PLAYED_BOARDS);
  const { size } = formatRules;
  if (size?.exact !== undefined && played !== size.exact) {
    warnings.push({ code: "deck-size", message: `A ${format} deck has exactly ${size.exact} cards; this has ${played}.` });
  }
  if (size?.min !== undefined && played < size.min) {
    warnings.push({ code: "deck-size", message: `A ${format} deck needs at least ${size.min} cards; this has ${played}.` });
  }
  const sideboard = count(cards, ["side"]);
  if (formatRules.maxSideboard !== undefined && sideboard > formatRules.maxSideboard) {
    warnings.push({
      code: "deck-size",
      message:
        formatRules.maxSideboard === 0
          ? `${format} decks don't have a sideboard; ${sideboard} cards are on it.`
          : `The sideboard holds at most ${formatRules.maxSideboard} cards; this has ${sideboard}.`,
    });
  }

  if (formatRules.maxCopies !== undefined) {
    // Copies are counted by card (oracle id), across printings and boards
    const byCard = new Map<string, { name: string; quantity: number }>();
    for (const card of cards) {
      if (!LIMITED_BOARDS.includes(card.board) || unlimitedCopies(card)) continue;
      const { oracleId, name } = card.entry.card;
      const total = byCard.get(oracleId) ?? { name, quantity: 0 };
      total.quantity += card.quantity;
      byCard.set(oracleId, total);
    }
    for (const { name, quantity } of byCard.values()) {
      if (quantity > formatRules.maxCopies) {
        warnings.push({
          code: "too-many-copies",
          cardName: name,
          message: `${quantity} copies of ${name}; ${format} allows ${formatRules.maxCopies}.`,
        });
      }
    }
  }

  if (formatRules.commander) {
    const commanders = count(cards, ["commander"]);
    if (commanders === 0) {
      warnings.push({ code: "commander-count", message: "Choose a commander." });
    } else if (commanders > 2) {
      warnings.push({ code: "commander-count", message: `${commanders} commanders; at most 2 (with partner).` });
    } else {
      const identity = deckColorIdentity(format, cards);
      for (const card of cards) {
        if (!PLAYED_BOARDS.includes(card.board) || card.board === "commander") continue;
        const outside = [...card.entry.card.colorIdentity].filter((color) => !identity.includes(color));
        if (outside.length) {
          warnings.push({
            code: "colour-identity",
            cardName: card.entry.card.name,
            message: `${card.entry.card.name} is outside the commander's colours (${sortColors(outside)}).`,
          });
        }
      }
    }
  }

  // Each entry is reported once, even if it's on several boards
  const seen = new Set<number>();
  for (const card of cards) {
    const { entry } = card;
    if (seen.has(entry.id) || entry.available >= 0) continue;
    seen.add(entry.id);
    warnings.push({
      code: "over-allocated",
      cardName: entry.card.name,
      message: `You own ${entry.quantity} ${entry.card.name} but your decks use ${entry.allocated}.`,
    });
  }

  return warnings;
}

const TYPE_ORDER = ["Creature", "Planeswalker", "Battle", "Instant", "Sorcery", "Artifact", "Enchantment", "Land"] as const;

/** The type a card is grouped under: the most significant type on its front face. */
export function primaryType(typeLine: string): string {
  const front = typeLine.split(" // ")[0] ?? typeLine;
  return TYPE_ORDER.find((type) => front.includes(type)) ?? "Other";
}

/** Counts for the deck builder's charts. Only the played boards (commander and main) count. */
export function deckStats(cards: DeckCard[]): DeckStats {
  const stats: DeckStats = { cardCount: 0, manaCurve: {}, colors: {}, types: {} };
  for (const label of ["0", "1", "2", "3", "4", "5", "6", "7+"]) stats.manaCurve[label] = 0;

  for (const { board, quantity, entry } of cards) {
    if (!PLAYED_BOARDS.includes(board)) continue;
    const { card } = entry;
    const type = primaryType(card.typeLine);
    stats.cardCount += quantity;
    stats.types[type] = (stats.types[type] ?? 0) + quantity;

    if (type !== "Land") {
      const curve = card.manaValue >= 7 ? "7+" : String(Math.floor(card.manaValue));
      stats.manaCurve[curve] = (stats.manaCurve[curve] ?? 0) + quantity;
    }
    for (const color of card.colors || "C") {
      stats.colors[color] = (stats.colors[color] ?? 0) + quantity;
    }
  }
  return stats;
}
