import jwt from "jsonwebtoken";
import type { Knex } from "knex";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { config } from "../src/config.js";
import { container } from "../src/ioc.js";
import { TYPES } from "../src/types.js";

const app = createApp();
afterAll(() => container.get<Knex>(TYPES.Knex).destroy());

const sign = (payload: object, secret = config.JWT_SECRET, options: jwt.SignOptions = { expiresIn: "5m" }) =>
  `Bearer ${jwt.sign(payload, secret, options)}`;

describe("authentication", () => {
  it.each([
    ["no Authorization header", undefined, "Missing bearer token"],
    ["a non-bearer header", "Basic dXNlcjpwYXNz", "Missing bearer token"],
    ["a malformed token", "Bearer not-a-jwt", "Invalid or expired token"],
    [
      "a token signed with another secret",
      sign({ scope: "cards:read" }, "some-other-secret-that-is-long"),
      "Invalid or expired token",
    ],
    [
      "an expired token",
      sign({ scope: "cards:read" }, config.JWT_SECRET, { expiresIn: -10 }),
      "Invalid or expired token",
    ],
  ])("rejects %s with 401", async (_case, header, message) => {
    const req = request(app).get("/api/decks");
    if (header) void req.set("Authorization", header);
    const response = await req.expect(401);
    expect(response.body).toEqual({ name: "Unauthorized", message });
  });

  it("rejects tokens signed with another algorithm", async () => {
    const none = `${Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url")}.${Buffer.from(
      JSON.stringify({ scope: "cards:read" }),
    ).toString("base64url")}.`;
    await request(app).get("/api/decks").set("Authorization", `Bearer ${none}`).expect(401);
  });

  it("names the missing scope with 403", async () => {
    const response = await request(app)
      .get("/api/data/export")
      .set("Authorization", sign({ scope: "cards:read" }))
      .expect(403);
    expect(response.body.message).toBe("Requires scope: data:admin");
  });

  it("treats a token without scopes as having none", async () => {
    await request(app)
      .get("/api/decks")
      .set("Authorization", sign({ sub: "someone" }))
      .expect(403);
  });

  it("echoes or creates a correlation id", async () => {
    const given = await request(app).get("/api/health").set("x-correlation-id", "abc-123").expect(200);
    expect(given.headers["x-correlation-id"]).toBe("abc-123");
    const created = await request(app).get("/api/health").expect(200);
    expect(created.headers["x-correlation-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });
});
