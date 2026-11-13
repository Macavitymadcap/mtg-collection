import type { Card, PreconSummary } from "@mtg/shared";
import { inject, injectable } from "inversify";
import { Controller, Get, Path, Query, Response, Route, Security, Tags } from "tsoa";
import { NotFound } from "../core/errors.js";
import { TYPES } from "../types.js";
import type { CardCatalog } from "./card-catalog.js";
import type { PreconSource } from "./precon-source.js";

/** Card lookups for the "add to collection" flow. Proxies Scryfall. */
@injectable()
@Route("catalog")
@Tags("Catalog")
@Security("jwt", ["cards:read"])
export class CatalogController extends Controller {
  constructor(
    @inject(TYPES.CardCatalog) private readonly catalog: CardCatalog,
    @inject(TYPES.PreconSource) private readonly precons: PreconSource,
  ) {
    super();
  }

  /**
   * Preconstructed products (Commander decks, starter decks …), newest first.
   * Matches the search against name, set code and product type.
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 200
   */
  @Get("precons")
  public async searchPrecons(@Query() search?: string, @Query() limit = 50): Promise<PreconSummary[]> {
    const terms = (search ?? "").toLowerCase().split(/\s+/).filter(Boolean);
    const all = await this.precons.list();
    return all
      .filter((precon) => {
        const text = `${precon.name} ${precon.setCode} ${precon.type}`.toLowerCase();
        return terms.every((term) => text.includes(term));
      })
      .slice(0, limit);
  }

  /** Card names matching what's been typed so far. Fewer than 2 characters returns nothing. */
  @Get("autocomplete")
  public autocomplete(@Query() q: string): Promise<string[]> {
    return this.catalog.autocomplete(q);
  }

  /** Every printing of a card, oldest first. Empty if the name doesn't match exactly. */
  @Get("printings")
  public printings(@Query() name: string): Promise<Card[]> {
    return this.catalog.printings(name);
  }

  /** One printing by set code and collector number. */
  @Get("cards/{setCode}/{collectorNumber}")
  @Response(404, "No such printing")
  public async card(@Path() setCode: string, @Path() collectorNumber: string): Promise<Card> {
    const card = await this.catalog.bySetAndNumber(setCode, collectorNumber);
    if (!card) throw new NotFound(`No printing ${setCode.toUpperCase()} #${collectorNumber}`);
    return card;
  }
}
