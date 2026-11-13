import type { Board, Finish, PreconSummary } from "@mtg/shared";
import { isResponseError, isValidationError, up } from "up-fetch";
import { z } from "zod";
import { BadGateway } from "../core/errors.js";
import { logger } from "../core/logger.js";
import type { PreconCard, PreconDeck, PreconSource } from "./precon-source.js";

const deckListSchema = z.object({
  data: z.array(
    z.object({
      code: z.string(),
      fileName: z.string(),
      name: z.string(),
      releaseDate: z.string().nullable().optional(),
      type: z.string(),
    }),
  ),
});

const deckCardSchema = z.object({
  name: z.string(),
  count: z.number().int().positive(),
  isFoil: z.boolean().optional(),
  isEtched: z.boolean().optional(),
  identifiers: z.object({ scryfallId: z.uuid().optional() }),
});

const deckSchema = z.object({
  data: z.object({
    code: z.string(),
    name: z.string(),
    releaseDate: z.string().nullable().optional(),
    type: z.string(),
    commander: z.array(deckCardSchema).optional(),
    mainBoard: z.array(deckCardSchema),
    sideBoard: z.array(deckCardSchema).optional(),
  }),
});

const DAY_MS = 24 * 60 * 60 * 1000;
const DECK_CACHE_SIZE = 20;

export interface MtgjsonOptions {
  baseUrl: string;
  userAgent: string;
  fetch?: typeof fetch;
}

/**
 * Reads preconstructed deck lists from MTGJSON (https://mtgjson.com), which
 * publishes them as free JSON files. The list is cached for a day, and the
 * most recently used decks are kept in memory.
 */
export class MtgjsonClient implements PreconSource {
  private readonly http;
  private listCache: { decks: PreconSummary[]; expires: number } | null = null;
  private readonly deckCache = new Map<string, PreconDeck>();

  constructor(options: MtgjsonOptions) {
    this.http = up(options.fetch ?? fetch, () => ({
      baseUrl: options.baseUrl,
      headers: { "User-Agent": options.userAgent, Accept: "application/json" },
      timeout: 30_000, // deck files are several hundred KB
    }));
  }

  async list(): Promise<PreconSummary[]> {
    if (this.listCache && this.listCache.expires > Date.now()) return this.listCache.decks;

    const { data } = await this.request(() => this.http("/DeckList.json", { schema: deckListSchema })).catch(
      (error: unknown) => {
        throw error instanceof NotFoundError ? new BadGateway("MTGJSON's deck list is missing") : error;
      },
    );
    const decks = data
      .map((deck) => ({
        fileName: deck.fileName,
        name: deck.name,
        setCode: deck.code,
        type: deck.type,
        releaseDate: deck.releaseDate ?? "",
      }))
      .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate) || a.name.localeCompare(b.name));
    this.listCache = { decks, expires: Date.now() + DAY_MS };
    return decks;
  }

  async get(fileName: string): Promise<PreconDeck | null> {
    // File names are letters, digits and underscores; anything else can't be one
    if (!/^[A-Za-z0-9_]+$/.test(fileName)) return null;
    const cached = this.deckCache.get(fileName);
    if (cached) return cached;

    let response: z.infer<typeof deckSchema>;
    try {
      response = await this.request(() => this.http(`/decks/${fileName}.json`, { schema: deckSchema }));
    } catch (error) {
      if (error instanceof NotFoundError) return null;
      throw error;
    }

    const { data } = response;
    const toCards = (cards: z.infer<typeof deckCardSchema>[] | undefined, board: Board): PreconCard[] =>
      (cards ?? []).map((card) => ({
        scryfallId: card.identifiers.scryfallId ?? null,
        name: card.name,
        quantity: card.count,
        finish: toFinish(card),
        board,
      }));

    const deck: PreconDeck = {
      fileName,
      name: data.name,
      setCode: data.code,
      type: data.type,
      releaseDate: data.releaseDate ?? "",
      cards: [
        ...toCards(data.commander, "commander"),
        ...toCards(data.mainBoard, "main"),
        ...toCards(data.sideBoard, "side"),
      ],
    };

    if (this.deckCache.size >= DECK_CACHE_SIZE) {
      const oldest = this.deckCache.keys().next().value;
      if (oldest !== undefined) this.deckCache.delete(oldest);
    }
    this.deckCache.set(fileName, deck);
    return deck;
  }

  private async request<T>(send: () => Promise<T>): Promise<T> {
    try {
      return await send();
    } catch (error) {
      // MTGJSON is a static file host: a missing deck is a 404 (or 403 from its CDN)
      if (isResponseError(error) && (error.status === 404 || error.status === 403)) throw new NotFoundError();
      if (isResponseError(error)) {
        logger.warn("MTGJSON request failed", { status: error.status });
        throw new BadGateway("MTGJSON request failed");
      }
      if (isValidationError(error)) {
        logger.error("Unexpected MTGJSON response", { issues: error.issues });
        throw new BadGateway("Unexpected response from MTGJSON");
      }
      logger.warn("MTGJSON unreachable", { error: error instanceof Error ? error.message : error });
      throw new BadGateway("MTGJSON is unreachable");
    }
  }
}

class NotFoundError extends Error {}

function toFinish(card: { isFoil?: boolean; isEtched?: boolean }): Finish {
  if (card.isEtched) return "etched";
  return card.isFoil ? "foil" : "nonfoil";
}
