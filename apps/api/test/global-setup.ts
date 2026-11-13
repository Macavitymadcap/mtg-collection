import type { Knex } from "knex";

/** Brings the test database's schema up to date once, before any test file runs. */
export default async function setup(): Promise<void> {
  process.loadEnvFile(".env.test");
  const { config } = await import("../src/config.js");
  const { createKnex } = await import("../src/db/knex.js");
  const db: Knex = createKnex(config);
  try {
    await db.migrate.latest();
  } finally {
    await db.destroy();
  }
}
