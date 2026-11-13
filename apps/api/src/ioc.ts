import "reflect-metadata";
import { Container } from "inversify";
import type { Knex } from "knex";
import type { CardCatalog } from "./catalog/card-catalog.js";
import { CardRepository } from "./catalog/card.repository.js";
import { CardService } from "./catalog/card.service.js";
import { CatalogController } from "./catalog/catalog.controller.js";
import { MtgjsonClient } from "./catalog/mtgjson.client.js";
import type { PreconSource } from "./catalog/precon-source.js";
import { ScryfallClient } from "./catalog/scryfall.client.js";
import { CollectionController } from "./collection/collection.controller.js";
import { CollectionRepository } from "./collection/collection.repository.js";
import { CollectionService } from "./collection/collection.service.js";
import { config } from "./config.js";
import { TransactionManager } from "./core/transaction.js";
import { DataController } from "./data/data.controller.js";
import { DataService } from "./data/data.service.js";
import { createKnex } from "./db/knex.js";
import { DeckController } from "./decks/deck.controller.js";
import { DeckRepository } from "./decks/deck.repository.js";
import { DeckService } from "./decks/deck.service.js";
import { HealthController } from "./health/health.controller.js";
import { ImportController } from "./imports/import.controller.js";
import { ImportService } from "./imports/import.service.js";
import { StatsController } from "./stats/stats.controller.js";
import { TYPES } from "./types.js";

/** The DI container. Every service is a singleton: one instance per process. */
export const container = new Container({ defaultScope: "Singleton" });

container.bind<Knex>(TYPES.Knex).toConstantValue(createKnex(config));
container.bind(TransactionManager).toSelf();
container
  .bind<CardCatalog>(TYPES.CardCatalog)
  .toConstantValue(new ScryfallClient({ baseUrl: config.SCRYFALL_BASE_URL, userAgent: config.SCRYFALL_USER_AGENT }));

container
  .bind<PreconSource>(TYPES.PreconSource)
  .toConstantValue(new MtgjsonClient({ baseUrl: config.MTGJSON_BASE_URL, userAgent: config.SCRYFALL_USER_AGENT }));

container.bind(CardRepository).toSelf();
container.bind(CardService).toSelf();
container.bind(CollectionRepository).toSelf();
container.bind(CollectionService).toSelf();
container.bind(ImportService).toSelf();
container.bind(DataService).toSelf();
container.bind(DeckRepository).toSelf();
container.bind(DeckService).toSelf();

container.bind(HealthController).toSelf();
container.bind(CatalogController).toSelf();
container.bind(CollectionController).toSelf();
container.bind(ImportController).toSelf();
container.bind(DeckController).toSelf();
container.bind(StatsController).toSelf();
container.bind(DataController).toSelf();

/** tsoa's generated routes import this to get controller instances. */
export { container as iocContainer };
