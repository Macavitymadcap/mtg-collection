/** DI tokens for things that aren't classes. */
export const TYPES = {
  Knex: Symbol.for("Knex"),
  CardCatalog: Symbol.for("CardCatalog"),
  PreconSource: Symbol.for("PreconSource"),
} as const;
