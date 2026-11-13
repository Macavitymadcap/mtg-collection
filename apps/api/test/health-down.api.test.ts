import type { Knex } from "knex";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { container } from "../src/ioc.js";
import { TYPES } from "../src/types.js";

// A database that never answers
const deadDb = { raw: () => ({ timeout: () => Promise.reject(new Error("ECONNREFUSED")) }) } as unknown as Knex;
container.rebind<Knex>(TYPES.Knex).toConstantValue(deadDb);

const app = createApp();

describe("GET /api/health with the database down", () => {
  it("reports degraded with 503", async () => {
    const response = await request(app).get("/api/health").expect(503);
    expect(response.body).toEqual({ status: "degraded", database: "unreachable" });
  });
});
