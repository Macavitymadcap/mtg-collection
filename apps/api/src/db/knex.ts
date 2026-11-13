import knex, { type Knex } from "knex";
import type { Config } from "../config.js";

/** Creates the Knex instance (and its connection pool) for MySQL. */
export function createKnex(config: Config): Knex {
  return knex({
    client: "mysql2",
    connection: {
      host: config.DB_HOST,
      port: config.DB_PORT,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      database: config.DB_NAME,
      timezone: "Z", // read and write DATETIME as UTC
      // MySQL has no boolean type; return TINYINT(1) columns as true/false
      typeCast(field: { type: string; length: number; string(): string | null }, next: () => unknown) {
        if (field.type === "TINY" && field.length === 1) {
          const value = field.string();
          return value === null ? null : value === "1";
        }
        return next();
      },
    },
    pool: { min: config.DB_POOL_MIN, max: config.DB_POOL_MAX },
    migrations: {
      directory: "./src/db/migrations",
      extension: "ts",
      loadExtensions: [".ts"],
    },
  });
}
