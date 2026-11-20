import type { Knex } from "knex";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { testUtils, type TestHelpers } from "better-auth/plugins";
import { createApp } from "../src/app.js";
import { createAuth } from "../src/auth/better-auth.js";
import type { CardCatalog } from "../src/catalog/card-catalog.js";
import { config } from "../src/config.js";
import { container } from "../src/ioc.js";
import { TYPES } from "../src/types.js";
import { auth, FakeCatalog, makeCard, resetDb } from "./helpers.js";

const shock = makeCard({ name: "Shock" });
container.rebind<CardCatalog>(TYPES.CardCatalog).toConstantValue(new FakeCatalog([shock]));

const app = createApp();
const db = container.get<Knex>(TYPES.Knex);
// Same database and secret as the app, so its sessions are the app's sessions. It also allows
// "former-tester", to stand in for someone taken off the app's allowlist after signing in.
const testAuth = createAuth({ ...config, AUTH_GITHUB_ALLOWLIST: ["allowed-tester", "former-tester"] }, [testUtils()]);
// Passed as a plain plugin list, so TypeScript can't see the helpers it adds
const helpers = async () => ((await testAuth.$context) as unknown as { test: TestHelpers }).test;

/** A session cookie for a user with this GitHub login. */
async function signIn(githubLogin: string): Promise<string> {
  const test = await helpers();
  const user = await test.saveUser(test.createUser({ email: `${githubLogin}@example.com`, githubLogin }));
  const cookie = (await test.getAuthHeaders({ userId: user.id })).get("cookie");
  expect(cookie).toMatch(/^mtg\.session_token=/);
  return String(cookie);
}

/** The BFF's own token, which only reads. */
const bff = auth("cards:read");

async function resetAuth() {
  await db("auth_session").delete();
  await db("auth_account").delete();
  await db("auth_verification").delete();
  await db("auth_user").delete();
}

beforeAll(resetAuth);
beforeEach(async () => {
  await resetDb(db);
  await resetAuth();
});
afterAll(async () => {
  await resetAuth();
  await db.destroy();
});

const addShock = (headers: Record<string, string>) =>
  request(app).post("/api/collection").set(headers).send({
    scryfallId: shock.id,
    quantity: 2,
    finish: "nonfoil",
    condition: "NM",
    purchasePrice: 1.5,
    currency: "GBP",
    notes: "From a trade",
  });

describe("signed in", () => {
  it("can make changes with the BFF's read-only token", async () => {
    const cookie = await signIn("allowed-tester");
    await addShock({ ...bff, Cookie: cookie }).expect(201);
    await request(app)
      .get("/api/data/export")
      .set({ ...bff, Cookie: cookie })
      .expect(200);
  });

  it("sees prices paid and notes", async () => {
    const cookie = await signIn("allowed-tester");
    await addShock(auth());
    const response = await request(app)
      .get("/api/collection")
      .set({ ...bff, Cookie: cookie })
      .expect(200);
    expect(response.body.results[0]).toMatchObject({ purchasePrice: 1.5, currency: "GBP", notes: "From a trade" });
  });

  it("matches the allowlist case-insensitively", async () => {
    const cookie = await signIn("Allowed-Tester");
    await addShock({ ...bff, Cookie: cookie }).expect(201);
  });

  it("gets the session from the auth routes", async () => {
    const cookie = await signIn("allowed-tester");
    const response = await request(app).get("/api/auth/get-session").set("Cookie", cookie).expect(200);
    expect(response.body.user).toMatchObject({ githubLogin: "allowed-tester" });
  });
});

describe("visitors", () => {
  it("can't make changes", async () => {
    const response = await addShock(bff).expect(401);
    expect(response.body.message).toBe("Sign in to make changes");
    await request(app).post("/api/collection").send({}).expect(401);
  });

  it("don't see prices paid or notes, in lists, entries, decks or stats", async () => {
    const entry = (await addShock(auth()).expect(201)).body as { id: number };
    const deck = (
      await request(app).post("/api/decks").set(auth()).send({ name: "Burn", format: "modern" }).expect(201)
    ).body as { id: number };
    await request(app)
      .put(`/api/decks/${deck.id}/cards`)
      .set(auth())
      .send({ collectionEntryId: entry.id, board: "main", quantity: 1 })
      .expect(200);

    const hidden = { purchasePrice: null, currency: null, notes: null };
    const list = await request(app).get("/api/collection").set(bff).expect(200);
    expect(list.body.results[0]).toMatchObject(hidden);
    const one = await request(app).get(`/api/collection/${entry.id}`).set(bff).expect(200);
    expect(one.body).toMatchObject(hidden);
    const deckDetail = await request(app).get(`/api/decks/${deck.id}`).set(bff).expect(200);
    expect(deckDetail.body.cards[0].entry).toMatchObject(hidden);
    const stats = await request(app).get("/api/stats").set(bff).expect(200);
    expect(stats.body).toMatchObject({ spent: [], recent: [hidden] });
  });

  it("are what someone taken off the allowlist becomes, even with a live session", async () => {
    const cookie = await signIn("former-tester");
    await addShock({ ...bff, Cookie: cookie }).expect(401);
  });

  it("are what a broken session cookie gives", async () => {
    await addShock({ ...bff, Cookie: "mtg.session_token=nonsense" }).expect(401);
  });
});

describe("the allowlist", () => {
  it("stops anyone else's user being created", async () => {
    const test = await helpers();
    expect(await test.saveUser(test.createUser({ email: "x@example.com", githubLogin: "stranger" }))).toBeNull();
    expect(await db("auth_user").count({ count: "*" }).first()).toEqual({ count: 0 });
  });
});

describe("signing in", () => {
  it("sends people to GitHub", async () => {
    const response = await request(app)
      .post("/api/auth/sign-in/social")
      .set("Origin", config.AUTH_BASE_URL)
      .send({ provider: "github", callbackURL: "/" })
      .expect(200);
    const url = new URL(response.body.url as string);
    expect(url.origin).toBe("https://github.com");
    expect(url.searchParams.get("client_id")).toBe(config.GITHUB_CLIENT_ID);
    expect(url.searchParams.get("redirect_uri")).toBe(`${config.AUTH_BASE_URL}/api/auth/callback/github`);
  });

  it("has no email and password sign-up", async () => {
    const response = await request(app)
      .post("/api/auth/sign-up/email")
      .set("Origin", config.AUTH_BASE_URL)
      .send({ email: "a@example.com", password: "long-enough-password", name: "A" });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(await db("auth_user").count({ count: "*" }).first()).toEqual({ count: 0 });
  });
});

describe("POST /api/test/sign-in (browser tests only)", () => {
  it("signs in as the test login and returns the session cookies, the second time too", async () => {
    await request(app).post("/api/test/sign-in?origin=http://localhost:3001").set(auth()).expect(200);
    const response = await request(app).post("/api/test/sign-in?origin=http://localhost:3001").set(auth()).expect(200);

    const cookies = response.body as { name: string; value: string; domain: string }[];
    expect(cookies).toContainEqual(expect.objectContaining({ name: "mtg.session_token", domain: "localhost" }));
    const cookie = cookies.map(({ name, value }) => `${name}=${value}`).join("; ");
    await addShock({ ...bff, Cookie: cookie }).expect(201);
    expect(await db("auth_user").count({ count: "*" }).first()).toEqual({ count: 1 });
  });

  it("needs the data:admin scope", async () => {
    await request(app).post("/api/test/sign-in").set(bff).expect(403);
  });
});

/**
 * Stands in for GitHub: the token exchange and the two profile requests
 * Better Auth makes after someone approves signing in.
 */
function fakeGitHub(login: string) {
  const responses: Record<string, unknown> = {
    "https://github.com/login/oauth/access_token": { access_token: "token", token_type: "bearer", scope: "read:user" },
    "https://api.github.com/user": {
      id: 4242,
      login,
      name: "Dan",
      email: null,
      avatar_url: "https://example.com/a.png",
    },
    "https://api.github.com/user/emails": [{ email: `${login}@example.com`, primary: true, verified: true }],
  };
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
    const url = new URL(input instanceof Request ? input.url : input);
    return Response.json(responses[url.origin + url.pathname]);
  });
}

/** Signs in the way a browser does: start, go to GitHub (faked), come back to the callback. */
async function signInThroughGitHub() {
  const start = await request(app)
    .post("/api/auth/sign-in/social")
    .set("Origin", config.AUTH_BASE_URL)
    .send({ provider: "github", callbackURL: "/decks", errorCallbackURL: "/decks" })
    .expect(200);
  const state = new URL(start.body.url as string).searchParams.get("state");
  const cookies = (start.headers["set-cookie"] as unknown as string[]).map((cookie) => cookie.split(";")[0]).join("; ");
  return request(app).get(`/api/auth/callback/github?code=code&state=${state}`).set("Cookie", cookies);
}

describe("signing in through GitHub", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("creates the user with their GitHub login and goes back to the page", async () => {
    fakeGitHub("Allowed-Tester");

    const response = await signInThroughGitHub();

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/decks");
    expect(await db("auth_user").select("githubLogin", "email")).toEqual([
      { githubLogin: "Allowed-Tester", email: "allowed-tester@example.com" },
    ]);
    const cookie = (response.headers["set-cookie"] as unknown as string[]).map((c) => c.split(";")[0]).join("; ");
    await addShock({ ...bff, Cookie: cookie }).expect(201);
  });

  it("turns away anyone not on the allowlist, without creating a user", async () => {
    fakeGitHub("stranger");

    const response = await signInThroughGitHub();

    expect(response.status).toBe(302);
    // Back to the page, with the reason for the site to show
    expect(response.headers.location).toBe("/decks?error=unable_to_create_user");
    expect(await db("auth_user").count({ count: "*" }).first()).toEqual({ count: 0 });
  });

  it("doesn't let a signed-in user change their GitHub login", async () => {
    const cookie = await signIn("allowed-tester");

    await request(app)
      .post("/api/auth/update-user")
      .set({ Cookie: cookie, Origin: config.AUTH_BASE_URL })
      .send({ githubLogin: "someone-else" })
      .expect(404);

    expect(await db("auth_user").select("githubLogin")).toEqual([{ githubLogin: "allowed-tester" }]);
  });
});
