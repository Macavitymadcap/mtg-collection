import type { Knex } from "knex";

/** Cache of Scryfall printings. A row is written the first time a printing is added to the collection. */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("card", (table) => {
    table.uuid("id").primary().comment("Scryfall printing id");
    table.uuid("oracleId").notNullable().index();
    table.string("name", 200).notNullable().index();
    table.string("setCode", 10).notNullable().comment("Lower case, as Scryfall returns it");
    table.string("setName", 100).notNullable();
    table.string("collectorNumber", 20).notNullable();
    table.enu("rarity", ["common", "uncommon", "rare", "mythic", "special", "bonus"]).notNullable();
    table.string("manaCost", 100).nullable();
    table.decimal("manaValue", 4, 1).notNullable().defaultTo(0);
    table.string("typeLine", 200).notNullable();
    table.text("oracleText").nullable();
    table.string("colors", 5).notNullable().defaultTo("").comment("WUBRG order; empty for colourless");
    table.string("colorIdentity", 5).notNullable().defaultTo("");
    table.boolean("isBasicLand").notNullable().defaultTo(false);
    table.string("layout", 30).notNullable();
    table.string("imageSmall", 255).nullable();
    table.string("imageNormal", 255).nullable();
    table.string("scryfallUri", 255).notNullable();
    table.datetime("fetchedAt", { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
    table.unique(["setCode", "collectorNumber"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("card");
}
