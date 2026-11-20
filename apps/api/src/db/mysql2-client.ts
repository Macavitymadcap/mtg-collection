import KnexMySql2Client from "knex/lib/dialects/mysql2/index.js";
import mysql2 from "mysql2";

/**
 * Knex's mysql2 client, handed the mysql2 module directly. Knex normally
 * loads mysql2 itself, but its package.json tells bundlers to leave mysql2
 * out of browser builds, and Wrangler follows that: the Worker would get an
 * empty module. Under Node this behaves exactly like `client: "mysql2"`.
 */
export class MySql2Client extends KnexMySql2Client {
  _driver(): typeof mysql2 {
    return mysql2;
  }
}
