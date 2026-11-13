import type { Knex } from "knex";

/** Owned copies placed in a deck. Deleting a deck removes its rows; deleting an entry in use is refused. */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("deck_card", (table) => {
    table.integer("deckId").unsigned().notNullable().references("id").inTable("deck").onDelete("CASCADE");
    table
      .integer("collectionEntryId")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("collection_entry")
      .onDelete("RESTRICT");
    table.enu("board", ["commander", "main", "side", "maybe"]).notNullable();
    table.smallint("quantity").unsigned().notNullable();
    table.primary(["deckId", "collectionEntryId", "board"]);
    table.index(["collectionEntryId"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("deck_card");
}
