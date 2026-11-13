import type { CollectionStats } from "@mtg/shared";
import { inject, injectable } from "inversify";
import type { Knex } from "knex";
import { Controller, Get, Route, Security, Tags } from "tsoa";
import { CollectionRepository } from "../collection/collection.repository.js";
import { TYPES } from "../types.js";

/** Totals for the dashboard. */
@injectable()
@Route("stats")
@Tags("Stats")
export class StatsController extends Controller {
  constructor(
    @inject(CollectionRepository) private readonly entries: CollectionRepository,
    @inject(TYPES.Knex) private readonly db: Knex,
  ) {
    super();
  }

  @Get()
  @Security("jwt", ["cards:read"])
  public async get(): Promise<CollectionStats> {
    const [totals, recent, decks] = await Promise.all([
      this.entries.totals(),
      this.entries.list({}, "-createdAt", { page: 1, limit: 12 }),
      this.db("deck").count({ count: "*" }).first(),
    ]);
    return { ...totals, decks: Number(decks?.count ?? 0), recent: recent.results };
  }
}
