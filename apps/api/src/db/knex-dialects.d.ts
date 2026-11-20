// Knex doesn't publish types for its dialect classes; this is the part mysql2-client.ts uses.
declare module "knex/lib/dialects/mysql2/index.js" {
  import type { Knex } from "knex";
  const KnexMySql2Client: typeof Knex.Client;
  export default KnexMySql2Client;
}
