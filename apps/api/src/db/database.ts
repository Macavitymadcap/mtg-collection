import type { Knex } from "knex";
import type { Config } from "../config.js";
import { getRequestContext } from "../core/request-context.js";
import { createKnex } from "./knex.js";

/**
 * The app's database. With DB_CONNECTIONS "pooled" (Node), one Knex instance
 * and pool for the process. With "per-request" (Workers, which can't share a
 * connection between requests), a stand-in that gives each request its own
 * Knex instance, made on first use and closed when the response has gone.
 * Code using it can't tell the difference.
 */
export function createDatabase(config: Config): Knex {
  if (config.DB_CONNECTIONS === "pooled") return createKnex(config);
  // A few connections per request: some routes run queries in parallel
  return perRequest(() => createKnex({ ...config, DB_POOL_MIN: 0, DB_POOL_MAX: 4 }));
}

function perRequest(create: () => Knex): Knex {
  const current = (): Knex => {
    const context = getRequestContext();
    if (!context) throw new Error("The database was used outside a request");
    if (!context.db) {
      const db = create();
      context.db = db;
      context.cleanups.push(() => db.destroy());
    }
    return context.db;
  };

  // Knex is a function (db("table")) with properties (db.raw, db.transaction …); forward both
  const target = function () {} as unknown as Knex;
  return new Proxy(target, {
    apply: (_target, thisArg, args: unknown[]) =>
      Reflect.apply(current() as unknown as (...a: unknown[]) => unknown, thisArg, args),
    get: (_target, property) => {
      const db = current();
      const value: unknown = Reflect.get(db, property, db);
      return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(db) : value;
    },
  });
}
