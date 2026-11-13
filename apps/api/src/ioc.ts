import "reflect-metadata";
import { Container } from "inversify";
import type { Knex } from "knex";
import { config } from "./config.js";
import { TransactionManager } from "./core/transaction.js";
import { createKnex } from "./db/knex.js";
import { HealthController } from "./health/health.controller.js";
import { TYPES } from "./types.js";

/** The DI container. Every service is a singleton: one instance per process. */
export const container = new Container({ defaultScope: "Singleton" });

container.bind<Knex>(TYPES.Knex).toConstantValue(createKnex(config));
container.bind(TransactionManager).toSelf();
container.bind(HealthController).toSelf();

/** tsoa's generated routes import this to get controller instances. */
export { container as iocContainer };
