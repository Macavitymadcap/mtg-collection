import type { Card } from "@mtg/shared";
import { isResponseError, isValidationError, up } from "up-fetch";
import { BadGateway } from "../core/errors.js";
import { logger } from "../core/logger.js";
import type { CardCatalog, CardLookup } from "./card-catalog.js";
import { cardCollectionSchema, cardListSchema, catalogSchema, scryfallCardSchema, toCard } from "./scryfall.schemas.js";
import { Throttle } from "./throttle.js";

export interface ScryfallOptions {
  baseUrl: string;
  userAgent: string;
  fetch?: typeof fetch;
  /** Gap between requests. Scryfall allows 10 per second. */
  intervalMs?: number;
  /** Gap between /cards/collection requests. Scryfall allows 2 per second. */
  collectionIntervalMs?: number;
}

/** Scryfall caps /cards/collection at 75 identifiers per request. */
const COLLECTION_BATCH = 75;
/** Stop following search pages after this many (175 cards each). */
const MAX_SEARCH_PAGES = 5;
const AUTOCOMPLETE_TTL_MS = 60 * 60 * 1000;
const AUTOCOMPLETE_CACHE_SIZE = 500;

/**
 * Scryfall API client. All of Scryfall's usage rules live here:
 * identifying headers, rate limits, caching and response validation.
 * https://scryfall.com/docs/api
 */
export class ScryfallClient implements CardCatalog {
  private readonly http;
  private readonly throttle: Throttle;
  private readonly collectionThrottle: Throttle;
  private readonly autocompleteCache = new Map<string, { names: string[]; expires: number }>();

  constructor(options: ScryfallOptions) {
    this.throttle = new Throttle(options.intervalMs ?? 100);
    this.collectionThrottle = new Throttle(options.collectionIntervalMs ?? 500);
    this.http = up(options.fetch ?? fetch, () => ({
      baseUrl: options.baseUrl,
      headers: {
        "User-Agent": options.userAgent,
        Accept: "application/json;q=0.9,*/*;q=0.8",
      },
      timeout: 10_000,
    }));
  }

  async autocomplete(query: string): Promise<string[]> {
    const key = query.trim().toLowerCase();
    if (key.length < 2) return [];

    const cached = this.autocompleteCache.get(key);
    if (cached && cached.expires > Date.now()) return cached.names;

    const { data } = await this.request(() =>
      this.http("/cards/autocomplete", { params: { q: key }, schema: catalogSchema }),
    );

    if (this.autocompleteCache.size >= AUTOCOMPLETE_CACHE_SIZE) {
      // Maps iterate in insertion order, so this drops the oldest entry
      const oldest = this.autocompleteCache.keys().next().value;
      if (oldest !== undefined) this.autocompleteCache.delete(oldest);
    }
    this.autocompleteCache.set(key, { names: data, expires: Date.now() + AUTOCOMPLETE_TTL_MS });
    return data;
  }

  async printings(name: string): Promise<Card[]> {
    const query = `!"${name.replaceAll('"', "")}"`;
    const cards: Card[] = [];
    let page = await this.request(
      () =>
        this.http("/cards/search", {
          params: { q: query, unique: "prints", order: "released", dir: "asc" },
          schema: cardListSchema,
        }),
      { notFoundAs: null },
    );

    for (let pages = 1; page; pages++) {
      cards.push(...page.data.map(toCard));
      const next = page.next_page;
      if (!page.has_more || !next || pages >= MAX_SEARCH_PAGES) break;
      page = await this.request(() => this.http(next, { schema: cardListSchema }));
    }
    return cards;
  }

  async bySetAndNumber(setCode: string, collectorNumber: string): Promise<Card | null> {
    const path = `/cards/${encodeURIComponent(setCode.toLowerCase())}/${encodeURIComponent(collectorNumber)}`;
    const card = await this.request(() => this.http(path, { schema: scryfallCardSchema }), { notFoundAs: null });
    return card ? toCard(card) : null;
  }

  async byIds(ids: string[]): Promise<CardLookup> {
    const unique = [...new Set(ids.map((id) => id.toLowerCase()))];
    const found: Card[] = [];

    for (let i = 0; i < unique.length; i += COLLECTION_BATCH) {
      const batch = unique.slice(i, i + COLLECTION_BATCH);
      const result = await this.collectionThrottle.run(() =>
        this.request(() =>
          this.http("/cards/collection", {
            method: "POST",
            body: { identifiers: batch.map((id) => ({ id })) },
            schema: cardCollectionSchema,
          }),
        ),
      );
      found.push(...result.data.map(toCard));
    }

    // Results can come back in any order, and not_found doesn't always echo
    // the id, so work out what's missing by comparing ids
    const foundIds = new Set(found.map((card) => card.id));
    return { found, notFound: unique.filter((id) => !foundIds.has(id)) };
  }

  /** Throttles a request and turns Scryfall failures into API errors. */
  private async request<T>(send: () => Promise<T>): Promise<T>;
  private async request<T, F>(send: () => Promise<T>, options: { notFoundAs: F }): Promise<T | F>;
  private async request<T, F>(send: () => Promise<T>, options?: { notFoundAs: F }): Promise<T | F> {
    try {
      return await this.throttle.run(send);
    } catch (error) {
      if (options && isResponseError(error) && error.status === 404) return options.notFoundAs;
      if (isResponseError(error)) {
        logger.warn("Scryfall request failed", { status: error.status, details: error.data as unknown });
        throw new BadGateway(
          error.status === 429 ? "Scryfall rate limit reached; try again shortly" : "Scryfall request failed",
        );
      }
      if (isValidationError(error)) {
        logger.error("Unexpected Scryfall response", { issues: error.issues });
        throw new BadGateway("Unexpected response from Scryfall");
      }
      logger.warn("Scryfall unreachable", { error: error instanceof Error ? error.message : error });
      throw new BadGateway("Scryfall is unreachable");
    }
  }
}
