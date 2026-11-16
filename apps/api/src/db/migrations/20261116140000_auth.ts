import type { Knex } from "knex";

/**
 * Better Auth's tables (users, sessions, linked GitHub accounts, OAuth
 * state). The layout is what Better Auth's own migration generator produces
 * for src/auth/better-auth.ts, with real foreign keys: MySQL ignores the
 * inline REFERENCES its generator writes.
 */
export async function up(knex: Knex): Promise<void> {
  const timestamps = (table: Knex.CreateTableBuilder, updatedDefault = true) => {
    table.timestamp("createdAt", { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
    const updated = table.timestamp("updatedAt", { precision: 3 }).notNullable();
    if (updatedDefault) updated.defaultTo(knex.fn.now(3));
  };

  await knex.schema.createTable("auth_user", (table) => {
    table.string("id", 36).primary();
    table.string("name", 255).notNullable();
    table.string("email", 255).notNullable().unique();
    table.boolean("emailVerified").notNullable();
    table.text("image").nullable();
    table.string("githubLogin", 100).nullable().unique().comment("Checked against AUTH_GITHUB_ALLOWLIST");
    timestamps(table);
  });

  await knex.schema.createTable("auth_session", (table) => {
    table.string("id", 36).primary();
    table.timestamp("expiresAt", { precision: 3 }).notNullable();
    table.string("token", 255).notNullable().unique();
    table.text("ipAddress").nullable();
    table.text("userAgent").nullable();
    table.string("userId", 36).notNullable().references("id").inTable("auth_user").onDelete("CASCADE").index();
    timestamps(table, false);
  });

  await knex.schema.createTable("auth_account", (table) => {
    table.string("id", 36).primary();
    table.text("accountId").notNullable();
    table.text("providerId").notNullable();
    table.string("userId", 36).notNullable().references("id").inTable("auth_user").onDelete("CASCADE").index();
    table.text("accessToken").nullable();
    table.text("refreshToken").nullable();
    table.text("idToken").nullable();
    table.timestamp("accessTokenExpiresAt", { precision: 3 }).nullable();
    table.timestamp("refreshTokenExpiresAt", { precision: 3 }).nullable();
    table.text("scope").nullable();
    table.text("password").nullable();
    timestamps(table, false);
  });

  await knex.schema.createTable("auth_verification", (table) => {
    table.string("id", 36).primary();
    table.string("identifier", 255).notNullable().index();
    table.text("value").notNullable();
    table.timestamp("expiresAt", { precision: 3 }).notNullable();
    timestamps(table);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("auth_verification");
  await knex.schema.dropTable("auth_account");
  await knex.schema.dropTable("auth_session");
  await knex.schema.dropTable("auth_user");
}
