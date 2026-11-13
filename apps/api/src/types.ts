/** DI tokens for things that aren't classes. */
export const TYPES = {
  Knex: Symbol.for("Knex"),
  CardCatalog: Symbol.for("CardCatalog"),
} as const;
