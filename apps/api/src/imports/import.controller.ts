import type { ImportSummary, ManaboxImportRequest } from "@mtg/shared";
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
}
