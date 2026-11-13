import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("deck", (table) => {
    table.increments("id");
    table.string("name", 100).notNullable().unique();
    table.enu("format", ["commander", "standard", "pioneer", "modern", "legacy", "pauper", "casual"]).notNullable();
    table.text("description").nullable();
    table.datetime("createdAt", { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
    table.datetime("updatedAt", { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("deck");
}
