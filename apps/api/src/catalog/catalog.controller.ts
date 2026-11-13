import type { Card } from "@mtg/shared";
import { inject, injectable } from "inversify";
import { Controller, Get, Path, Query, Response, Route, Security, Tags } from "tsoa";
import { NotFound } from "../core/errors.js";
import { TYPES } from "../types.js";
import type { CardCatalog } from "./card-catalog.js";

/** Card lookups for the "add to collection" flow. Proxies Scryfall. */
@injectable()
@Route("catalog")
@Tags("Catalog")
@Security("jwt", ["cards:read"])
export class CatalogController extends Controller {
  constructor(@inject(TYPES.CardCatalog) private readonly catalog: CardCatalog) {
    super();
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
