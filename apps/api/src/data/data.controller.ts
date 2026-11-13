import type { BackupImportSummary, DataCounts, ExportFile } from "@mtg/shared";
import { inject, injectable } from "inversify";
import { Body, Controller, Get, Post, Query, Response, Route, Security, Tags } from "tsoa";
import { DataService } from "./data.service.js";

/** The whole database as JSON: backups, and moving to another environment. */
@injectable()
@Route("data")
@Tags("Data")
@Security("jwt", ["data:admin"])
export class DataController extends Controller {
  constructor(@inject(DataService) private readonly service: DataService) {
    super();
  }

  /** Everything (cards used, collection, decks) as an export file. */
  @Get("export")
  public async export(): Promise<ExportFile> {
    const file = await this.service.export();
    this.setHeader("Content-Disposition", `attachment; filename="mtg-collection-${file.exportedAt.slice(0, 10)}.json"`);
    return file;
  }

  /** What's in the database now, in the same terms as an import summary. */
  @Get("counts")
  public counts(): Promise<DataCounts> {
    return this.service.counts();
  }

  /**
   * Replaces everything in the database with an export file's contents, in
   * one transaction. Use dryRun to validate the file and see the counts first.
   */
  @Post("import")
  @Response(400, "Not a valid export file; details lists the problems")
  public import(@Body() body: ExportFile, @Query() dryRun = false): Promise<BackupImportSummary> {
    return this.service.import(body, dryRun);
  }
}
