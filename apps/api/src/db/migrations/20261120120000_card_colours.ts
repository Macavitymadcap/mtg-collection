import type { Knex } from "knex";

/** British spellings, to match the code: colors → colours, colorIdentity → colourIdentity. */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("card", (table) => {
    table.renameColumn("colors", "colours");
    table.renameColumn("colorIdentity", "colourIdentity");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("card", (table) => {
    table.renameColumn("colours", "colors");
    table.renameColumn("colourIdentity", "colorIdentity");
  });
}
