// @vitest-environment node
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../test/msw";
import { proxyAuth } from "./auth-proxy";

const API = "http://api.test/api";

describe("proxyAuth", () => {
  it("passes requests through with the headers sign-in needs, and nothing else", async () => {
    const seen: { url: string; headers: Record<string, string>; body: string }[] = [];
    server.use(
      http.post(`${API}/auth/sign-in/social`, async ({ request }) => {
        seen.push({ url: request.url, headers: Object.fromEntries(request.headers), body: await request.text() });
        return HttpResponse.json({ url: "https://github.com/login/oauth/authorize?state=x", redirect: true });
      }),
    );

    const response = await proxyAuth(
      new Request("http://localhost:3000/api/auth/sign-in/social?x=1", {
        method: "POST",
        headers: {
          cookie: "a=1",
          origin: "http://localhost:3000",
          "content-type": "application/json",
          authorization: "Bearer not-for-the-api",
        },
        body: JSON.stringify({ provider: "github" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: "https://github.com/login/oauth/authorize?state=x", redirect: true });
    expect(seen).toEqual([
      {
        url: `${API}/auth/sign-in/social?x=1`,
        headers: expect.objectContaining({
          cookie: "a=1",
          origin: "http://localhost:3000",
          "content-type": "application/json",
        }) as Record<string, string>,
        body: '{"provider":"github"}',
      },
    ]);
    const [{ headers }] = seen as [(typeof seen)[number]];
    expect(headers).not.toHaveProperty("authorization");
  });

  it("hands redirects and every cookie back to the browser", async () => {
    server.use(
      http.get(`${API}/auth/callback/github`, () => {
        const headers = new Headers({ location: "http://localhost:3000/decks" });
        headers.append("set-cookie", "mtg.session_token=abc; Path=/; HttpOnly");
        headers.append("set-cookie", "mtg.state=; Max-Age=0");
        return new HttpResponse(null, { status: 302, headers });
      }),
    );

    const response = await proxyAuth(new Request("http://localhost:3000/api/auth/callback/github?code=c&state=s"));

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("http://localhost:3000/decks");
    expect(response.headers.getSetCookie()).toEqual([
      "mtg.session_token=abc; Path=/; HttpOnly",
      "mtg.state=; Max-Age=0",
    ]);
  });

  it("returns 502 when the API can't be reached", async () => {
    server.use(http.get(`${API}/auth/get-session`, () => HttpResponse.error()));

    const response = await proxyAuth(new Request("http://localhost:3000/api/auth/get-session"));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ name: "BadGateway", message: "Sign-in is unavailable" });
  });

  it("sends a browser that opened a failing auth URL to the error page", async () => {
    server.use(http.get(`${API}/auth/callback/github`, () => HttpResponse.json({ code: "BAD" }, { status: 400 })));

    const response = await proxyAuth(
      new Request("http://localhost:3000/api/auth/callback/github?code=x", {
        headers: { "sec-fetch-mode": "navigate" },
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/error?status=400");
  });

  it("does the same when the API can't be reached", async () => {
    server.use(http.get(`${API}/auth/callback/github`, () => HttpResponse.error()));

    const response = await proxyAuth(
      new Request("http://localhost:3000/api/auth/callback/github", { headers: { "sec-fetch-mode": "navigate" } }),
    );

    expect(response.headers.get("location")).toBe("http://localhost:3000/error?status=502");
  });

  it("returns errors as JSON to the app's own requests", async () => {
    server.use(http.get(`${API}/auth/get-session`, () => HttpResponse.json({ code: "BAD" }, { status: 400 })));

    const response = await proxyAuth(
      new Request("http://localhost:3000/api/auth/get-session", { headers: { "sec-fetch-mode": "cors" } }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ code: "BAD" });
  });
});
