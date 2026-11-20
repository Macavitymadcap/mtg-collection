import knex, { type Knex } from "knex";
import type { Config } from "../config.js";
import { MySql2Client } from "./mysql2-client.js";

/** mysql2's TLS options: verified TLS when a CA is configured, otherwise none (local Docker MySQL). */
export function sslOptions(config: Pick<Config, "DB_SSL_CA">): { ca: string; rejectUnauthorized: true } | undefined {
  return config.DB_SSL_CA ? { ca: config.DB_SSL_CA, rejectUnauthorized: true } : undefined;
}

/** Creates the Knex instance (and its connection pool) for MySQL. */
export function createKnex(config: Config): Knex {
  // mysql2 options. Built separately because Knex's types don't list disableEval, which it passes on to mysql2
  const connection: Knex.MySql2ConnectionConfig & { disableEval: boolean } = {
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    ssl: sslOptions(config),
    // Parse rows without generating code (eval), which Workers forbid
    disableEval: true,
    timezone: "Z", // read and write DATETIME as UTC
    decimalNumbers: true, // return DECIMAL columns as numbers, not strings
    // MySQL has no boolean type; return TINYINT(1) columns as true/false
    typeCast(field: { type: string; length: number; string(): string | null }, next: () => unknown) {
      if (field.type === "TINY" && field.length === 1) {
        const value = field.string();
        return value === null ? null : value === "1";
      }
      return next();
    },
  };

  return knex({
    client: MySql2Client,
    connection,
    pool: { min: config.DB_POOL_MIN, max: config.DB_POOL_MAX },
    migrations: {
      directory: "./src/db/migrations",
      extension: "ts",
      loadExtensions: [".ts"],
    },
  });
}
