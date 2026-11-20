/**
 * Stands in for the database drivers Knex can load but this app never uses
 * (it only uses mysql2). Knex refers to all of them, so bundling for Workers
 * needs something at each name; see "alias" in wrangler.jsonc.
 */
export default {};
