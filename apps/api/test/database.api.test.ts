import express from "express";
import type { Knex } from "knex";
import { Kysely, MysqlDialect, sql } from "kysely";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { config } from "../src/config.js";
import { requestContext } from "../src/core/request-context.js";
import { connectionPerQueryPool } from "../src/db/connection-per-query-pool.js";
import { createDatabase } from "../src/db/database.js";
import { sslOptions } from "../src/db/knex.js";
import { container } from "../src/ioc.js";
import { TYPES } from "../src/types.js";

afterAll(() => container.get<Knex>(TYPES.Knex).destroy());

describe("per-request database connections (Workers)", () => {
  const db = createDatabase({ ...config, DB_CONNECTIONS: "per-request" });

  /** An app whose one route queries twice and reports which connection each query used. */
  function app(seen: Knex.Client[]) {
    const server = express();
    server.use(requestContext());
    server.get("/", async (_req, res) => {
      const [[first]] = (await db.raw("select connection_id() as id")) as [[{ id: number }]];
      const [[second]] = (await db.raw("select connection_id() as id")) as [[{ id: number }]];
      const count = (await db("card").count({ n: "*" }).first()) as { n: number };
      seen.push(db.client as Knex.Client);
      res.json({ first: first.id, second: second.id, cards: Number(count.n) });
    });
    return server;
  }

  it("gives each request its own connection, and closes it after the response", async () => {
    const seen: Knex.Client[] = [];
    const server = app(seen);

    const one = await request(server).get("/").expect(200);
    const two = await request(server).get("/").expect(200);

    expect(one.body).toMatchObject({ first: one.body.second as number, cards: expect.any(Number) as number });
    expect(two.body.first).not.toBe(one.body.first);
    expect(seen).toHaveLength(2);
    expect(seen[0]).not.toBe(seen[1]);
    await expect.poll(() => (seen[0] as unknown as { pool: unknown }).pool).toBeUndefined();
  });

  it("refuses to be used outside a request", () => {
    expect(() => db("card")).toThrow("The database was used outside a request");
  });
});

describe("connectionPerQueryPool (Better Auth on Workers)", () => {
  const options = {
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
  };

  it("runs each query on a fresh connection", async () => {
    const kysely = new Kysely<object>({ dialect: new MysqlDialect({ pool: connectionPerQueryPool(options) }) });

    const [first] = (await sql<{ id: number }>`select connection_id() as id`.execute(kysely)).rows as [{ id: number }];
    const [second] = (await sql<{ id: number }>`select connection_id() as id`.execute(kysely)).rows as [{ id: number }];

    expect(second.id).not.toBe(first.id);
    await kysely.destroy();
  });

  it("passes connection errors on", async () => {
    const kysely = new Kysely<object>({
      dialect: new MysqlDialect({ pool: connectionPerQueryPool({ ...options, password: "wrong" }) }),
    });

    await expect(sql`select 1`.execute(kysely)).rejects.toThrow(/Access denied/);
    await kysely.destroy();
  });
});

describe("sslOptions", () => {
  it("uses no TLS for the local database", () => {
    expect(sslOptions({ DB_SSL_CA: undefined })).toBeUndefined();
  });

  it("verifies the server against the configured CA", () => {
    expect(sslOptions({ DB_SSL_CA: "-----BEGIN CERTIFICATE-----" })).toEqual({
      ca: "-----BEGIN CERTIFICATE-----",
      rejectUnauthorized: true,
    });
  });
});
