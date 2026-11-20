import type { MysqlPool, MysqlPoolConnection } from "kysely";
import { createConnection, type ConnectionOptions } from "mysql2";

/**
 * A stand-in for a mysql2 pool, for Kysely (Better Auth's query builder):
 * every query gets a fresh connection, closed when Kysely releases it. Used
 * on Workers, where a connection can't outlive its request; Hyperdrive makes
 * the connections cheap.
 */
export function connectionPerQueryPool(options: ConnectionOptions): MysqlPool {
  return {
    getConnection(callback) {
      const connection = createConnection(options);
      connection.connect((error) => {
        if (error) {
          connection.destroy();
          callback(error, undefined as unknown as MysqlPoolConnection);
          return;
        }
        const pooled = Object.assign(connection, { release: () => void connection.end() });
        callback(null, pooled);
      });
    },
    end(callback) {
      callback(null);
    },
  };
}
