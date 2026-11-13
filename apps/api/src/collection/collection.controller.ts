import type {
  CollectionEntry,
  CollectionEntryDetail,
  CollectionSort,
  CreateCollectionEntryRequest,
  Finish,
  Page,
  Rarity,
  UpdateCollectionEntryRequest,
} from "@mtg/shared";
import { inject, injectable } from "inversify";
import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Path,
  Post,
  Query,
  Response,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from "tsoa";
import { CollectionService } from "./collection.service.js";

@injectable()
@Route("collection")
@Tags("Collection")
export class CollectionController extends Controller {
  constructor(@inject(CollectionService) private readonly service: CollectionService) {
    super();
  }

  /**
   * Lists owned copies.
   * @isInt page
   * @minimum page 1
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 200
   * @param colors Colours the card must include, in WUBRG order (e.g. "WU"), or "C" for colourless
   */
  @Get()
  @Security("jwt", ["cards:read"])
  public list(
    @Query() page = 1,
    @Query() limit = 50,
    @Query() search?: string,
    @Query() colors?: string,
    @Query() type?: string,
    @Query() setCode?: string,
    @Query() rarity?: Rarity,
    @Query() finish?: Finish,
    @Query() availableOnly?: boolean,
    @Query() sort: CollectionSort = "name",
  ): Promise<Page<CollectionEntry>> {
    return this.service.list({ search, colors, type, setCode, rarity, finish, availableOnly }, sort, { page, limit });
  }

  @Get("{id}")
  @Security("jwt", ["cards:read"])
  @Response(404, "Not found")
  public get(@Path() id: number): Promise<CollectionEntryDetail> {
    return this.service.get(id);
  }

  /** Adds copies of a printing. Returns 201 for a new entry, or 200 if they were added to an identical existing one. */
  @Post()
  @Security("jwt", ["cards:write"])
  @SuccessResponse(201, "Created")
  @Response(200, "Added to an existing entry")
  @Response(404, "Unknown Scryfall id")
  public async add(@Body() body: CreateCollectionEntryRequest): Promise<CollectionEntry> {
    const { entry, created } = await this.service.add(body);
    this.setStatus(created ? 201 : 200);
    return entry;
  }

  /** Edits an entry. If it becomes identical to another entry they are merged, and the merged entry (with its id) is returned. */
  @Patch("{id}")
  @Security("jwt", ["cards:write"])
  @Response(404, "Not found")
  public update(@Path() id: number, @Body() body: UpdateCollectionEntryRequest): Promise<CollectionEntry> {
    return this.service.update(id, body);
  }

  @Delete("{id}")
  @Security("jwt", ["cards:write"])
  @SuccessResponse(204, "Deleted")
  @Response(404, "Not found")
  public async remove(@Path() id: number): Promise<void> {
    await this.service.remove(id);
    this.setStatus(204);
  }
}
