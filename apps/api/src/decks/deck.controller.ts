import type { CreateDeckRequest, DeckDetail, DeckSummary, SetDeckCardRequest, UpdateDeckRequest } from "@mtg/shared";
import { inject, injectable } from "inversify";
import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Path,
  Post,
  Put,
  Response,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from "tsoa";
import { DeckService } from "./deck.service.js";

@injectable()
@Route("decks")
@Tags("Decks")
export class DeckController extends Controller {
  constructor(@inject(DeckService) private readonly service: DeckService) {
    super();
  }

  /** Every deck, by name, with card counts and how many warnings each has. */
  @Get()
  @Security("jwt", ["cards:read"])
  public list(): Promise<DeckSummary[]> {
    return this.service.list();
  }

  @Post()
  @Security("jwt", ["cards:write"])
  @SuccessResponse(201, "Created")
  @Response(409, "Name already used")
  public async create(@Body() body: CreateDeckRequest): Promise<DeckDetail> {
    const deck = await this.service.create(body);
    this.setStatus(201);
    return deck;
  }

  /** A deck's cards (by board), stats and warnings. */
  @Get("{id}")
  @Security("jwt", ["cards:read"])
  @Response(404, "Not found")
  public get(@Path() id: number): Promise<DeckDetail> {
    return this.service.get(id);
  }

  @Patch("{id}")
  @Security("jwt", ["cards:write"])
  @Response(404, "Not found")
  @Response(409, "Name already used")
  public update(@Path() id: number, @Body() body: UpdateDeckRequest): Promise<DeckDetail> {
    return this.service.update(id, body);
  }

  /** Deletes the deck. The cards stay in the collection. */
  @Delete("{id}")
  @Security("jwt", ["cards:write"])
  @SuccessResponse(204, "Deleted")
  @Response(404, "Not found")
  public async remove(@Path() id: number): Promise<void> {
    await this.service.remove(id);
    this.setStatus(204);
  }

  /** Sets how many copies of a collection entry are on a board. Quantity 0 removes them. Returns the updated deck. */
  @Put("{id}/cards")
  @Security("jwt", ["cards:write"])
  @Response(400, "Unknown collection entry")
  @Response(404, "Not found")
  public setCard(@Path() id: number, @Body() body: SetDeckCardRequest): Promise<DeckDetail> {
    return this.service.setCard(id, body);
  }
}
