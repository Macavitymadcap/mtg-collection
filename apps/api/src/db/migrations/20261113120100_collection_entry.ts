import type { Knex } from "knex";

/** Copies owned. One row per printing + finish + condition + language + flags. */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("collection_entry", (table) => {
    table.increments("id");
    table.uuid("cardId").notNullable().references("id").inTable("card").onDelete("RESTRICT");
    table.smallint("quantity").unsigned().notNullable();
    table.enu("finish", ["nonfoil", "foil", "etched"]).notNullable();
    table.enu("condition", ["NM", "LP", "MP", "HP", "DMG"]).notNullable().defaultTo("NM");
    table.string("language", 5).notNullable().defaultTo("en");
    table.boolean("signed").notNullable().defaultTo(false);
    table.boolean("altered").notNullable().defaultTo(false);
    table.boolean("misprint").notNullable().defaultTo(false);
    table.boolean("proxy").notNullable().defaultTo(false);
    table.decimal("purchasePrice", 10, 2).nullable().comment("Per copy");
    table.string("currency", 3).nullable();
    table.string("notes", 500).nullable();
    table.datetime("createdAt", { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
    table.datetime("updatedAt", { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
    // Adding a copy that matches an existing entry increases its quantity instead
    table.unique(["cardId", "finish", "condition", "language", "signed", "altered", "misprint", "proxy"], {
      indexName: "collection_entry_copy_unique",
    });
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("collection_entry");
}
