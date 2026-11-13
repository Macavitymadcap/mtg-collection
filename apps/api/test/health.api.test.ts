import type { Knex } from "knex";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { container } from "../src/ioc.js";
import { TYPES } from "../src/types.js";

const app = createApp();

afterAll(async () => {
  await container.get<Knex>(TYPES.Knex).destroy();
});

describe("GET /api/health", () => {
  it("reports the database as reachable", async () => {
    const response = await request(app).get("/api/health").expect(200);
    expect(response.body).toEqual({ status: "ok", database: "ok" });
  });

  it("returns JSON 404s for unknown routes", async () => {
    const response = await request(app).get("/api/nope").expect(404);
    expect(response.body.name).toBe("NotFound");
  });
});
