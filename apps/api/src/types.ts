/** DI tokens for things that aren't classes. */
export const TYPES = {
  Knex: Symbol.for("Knex"),
  CardCatalogue: Symbol.for("CardCatalogue"),
  PreconSource: Symbol.for("PreconSource"),
  Auth: Symbol.for("Auth"),
} as const;
