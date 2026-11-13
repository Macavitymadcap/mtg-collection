// @vitest-environment node
import jwt from "jsonwebtoken";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { server } from "../../test/msw";
import { forward } from "./backend";

const API = "http://api.test/api";

describe("forward", () => {
  it("calls the API with a short-lived service token and passes the response back", async () => {
    let seen: { url: string; auth: string | null; correlation: string | null } | undefined;
    server.use(
      http.get(`${API}/collection`, ({ request }) => {
        seen = {
          url: request.url,
          auth: request.headers.get("authorization"),
          correlation: request.headers.get("x-correlation-id"),
        };
        return HttpResponse.json({ count: 1 }, { status: 200 });
      }),
    );

    const response = await forward(
      new Request("http://localhost:3000/api/collection?search=bolt&page=2", {
        headers: { "x-correlation-id": "c-1" },
      }),
      { path: "/collection" },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ count: 1 });
    expect(seen?.url).toBe(`${API}/collection?search=bolt&page=2`);
    expect(seen?.correlation).toBe("c-1");

    const claims = jwt.verify(seen?.auth?.replace("Bearer ", "") ?? "", "test-secret-0123456789") as jwt.JwtPayload;
    expect(claims).toMatchObject({ sub: "web-bff", scope: "cards:read cards:write data:admin" });
    expect((claims.exp ?? 0) - (claims.iat ?? 0)).toBe(300);
  });

  it("rejects bodies that fail the schema without calling the API", async () => {
    const response = await forward(
      new Request("http://localhost:3000/api/decks", { method: "POST", body: JSON.stringify({ name: "" }) }),
      { path: "/decks", bodySchema: z.object({ name: z.string().min(1) }) },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ name: "BadRequest", message: "Validation failed" });
  });

  it("forwards valid bodies and passes API errors through unchanged", async () => {
    let body: unknown;
    server.use(
      http.post(`${API}/decks`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ name: "Conflict", message: "Taken" }, { status: 409 });
      }),
    );

    const response = await forward(
      new Request("http://localhost:3000/api/decks", { method: "POST", body: JSON.stringify({ name: "Goblins" }) }),
      { path: "/decks", bodySchema: z.object({ name: z.string() }) },
    );

    expect(body).toEqual({ name: "Goblins" });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ name: "Conflict", message: "Taken" });
  });

  it("passes 204s through with no body", async () => {
    server.use(http.delete(`${API}/decks/1`, () => new HttpResponse(null, { status: 204 })));
    const response = await forward(new Request("http://localhost:3000/api/decks/1", { method: "DELETE" }), {
      path: "/decks/1",
    });
    expect(response.status).toBe(204);
  });

  it("answers 502 when the API can't be reached", async () => {
    server.use(http.get(`${API}/health`, () => HttpResponse.error()));
    const response = await forward(new Request("http://localhost:3000/api/health"), { path: "/health" });
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ name: "BadGateway", message: "The API is unavailable" });
  });
});
