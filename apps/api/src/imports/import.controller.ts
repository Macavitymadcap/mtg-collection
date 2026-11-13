import type { ImportSummary, ManaboxImportRequest, PreconImportRequest } from "@mtg/shared";
import { inject, injectable } from "inversify";
import { Body, Controller, Post, Query, Response, Route, Security, Tags } from "tsoa";
import { ImportService } from "./import.service.js";

@injectable()
@Route("import")
@Tags("Import")
export class ImportController extends Controller {
  constructor(@inject(ImportService) private readonly service: ImportService) {
    super();
  }

  /**
   * Adds a ManaBox collection export (CSV) to the collection. Copies that
   * match an existing entry increase its quantity, so importing the same
   * file twice doubles it. Nothing is written if any row has an error; the
   * response lists them. Use dryRun to preview.
   */
  @Post("manabox")
  @Security("jwt", ["cards:write"])
  @Response(400, "Not a usable ManaBox CSV")
  @Response(422, "Some rows have errors; nothing was imported")
  public async manabox(@Body() body: ManaboxImportRequest, @Query() dryRun = false): Promise<ImportSummary> {
    const summary = await this.service.importManabox(body.csv, dryRun);
    if (summary.errors.length) this.setStatus(422);
    return summary;
  }

  /**
   * Adds every card in a preconstructed product (from MTGJSON) to the
   * collection as near-mint English copies, keeping foils. With createDeck,
   * also creates a deck holding them, commander included. Same rules as the
   * ManaBox import: all or nothing, 422 with the problems, dryRun to preview.
   */
  @Post("precon")
  @Security("jwt", ["cards:write"])
  @Response(404, "No such product")
  @Response(422, "Some cards have problems, or the deck name is taken; nothing was imported")
  public async precon(@Body() body: PreconImportRequest, @Query() dryRun = false): Promise<ImportSummary> {
    const summary = await this.service.importPrecon(body, dryRun);
    if (summary.errors.length) this.setStatus(422);
    return summary;
  }
}
