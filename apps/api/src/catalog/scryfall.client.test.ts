import { describe, expect, it } from "vitest";
import { ApiError } from "../core/errors.js";
import { ScryfallClient } from "./scryfall.client.js";

const BASE = "https://scryfall.test";

function scryfallCard(id: string, overrides: Record<string, unknown> = {}) {
  return {
    object: "card",
    id,
    oracle_id: "aaaaaaaa-0000-4000-8000-000000000000",
    name: "Shock",
    set: "m19",
    set_name: "Core Set 2019",
    collector_number: "156",
    rarity: "common",
    mana_cost: "{R}",
    cmc: 1,
    type_line: "Instant",
    oracle_text: "Shock deals 2 damage to any target.",
    colors: ["R"],
    color_identity: ["R"],
    layout: "normal",
    image_uris: { small: "https://cards.scryfall.io/small/x.jpg", normal: "https://cards.scryfall.io/normal/x.jpg" },
    scryfall_uri: "https://scryfall.com/card/m19/156/shock",
    ...overrides,
  };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

interface Call {
  url: URL;
  headers: Headers;
  body: string;
}

/** A fetch that records requests and answers with `respond`. */
function fakeFetch(respond: (call: Call) => Response) {
  const calls: Call[] = [];
  const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(input, init);
    const call = { url: new URL(req.url), headers: req.headers, body: await req.text() };
    calls.push(call);
    return respond(call);
  }) as typeof fetch;
  return { fn, calls };
}

function client(fetchFn: typeof fetch) {
  return new ScryfallClient({ baseUrl: BASE, userAgent: "test-agent/1.0", fetch: fetchFn, intervalMs: 0, collectionIntervalMs: 0 });
}

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("ScryfallClient", () => {
  it("sends the headers Scryfall requires and caches autocomplete results", async () => {
    const { fn, calls } = fakeFetch(() => json({ object: "catalog", data: ["Shock", "Shockwave"] }));
    const scryfall = client(fn);

    expect(await scryfall.autocomplete("Sho")).toEqual(["Shock", "Shockwave"]);
    expect(await scryfall.autocomplete("sho ")).toEqual(["Shock", "Shockwave"]);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.headers.get("user-agent")).toBe("test-agent/1.0");
    expect(calls[0]?.headers.get("accept")).toContain("application/json");
    expect(calls[0]?.url.searchParams.get("q")).toBe("sho");
  });

  it("asks Scryfall for at most 75 ids per collection request", async () => {
    const ids = Array.from({ length: 160 }, (_, i) => id(i + 1));
    const { fn, calls } = fakeFetch((call) => {
      const body = JSON.parse(call.body) as { identifiers: { id: string }[] };
      // Pretend the last id doesn't exist
      const known = body.identifiers.filter(({ id: value }) => value !== ids[159]);
      return json({ object: "list", data: known.map(({ id: value }) => scryfallCard(value)), not_found: [] });
    });

    const result = await client(fn).byIds(ids);

    expect(calls.map((call) => JSON.parse(call.body).identifiers.length)).toEqual([75, 75, 10]);
    expect(result.found).toHaveLength(159);
    expect(result.notFound).toEqual([ids[159]]);
  });

  it("returns null for an unknown printing", async () => {
    const { fn } = fakeFetch(() => json({ object: "error", status: 404, code: "not_found", details: "No card" }, 404));
    expect(await client(fn).bySetAndNumber("xyz", "999")).toBeNull();
  });

  it("follows search pages for printings", async () => {
    const { fn, calls } = fakeFetch(({ url }) =>
      url.searchParams.get("page") === "2"
        ? json({ object: "list", has_more: false, data: [scryfallCard(id(2))] })
        : json({ object: "list", has_more: true, next_page: `${BASE}/cards/search?page=2`, data: [scryfallCard(id(1))] })
    );

    const printings = await client(fn).printings("Shock");

    expect(printings.map((card) => card.id)).toEqual([id(1), id(2)]);
    expect(calls[0]?.url.searchParams.get("q")).toBe('!"Shock"');
  });

  it("maps double-faced cards from their faces", async () => {
    const dfc = scryfallCard(id(1), {
      name: "Delver of Secrets // Insectile Aberration",
      mana_cost: undefined,
      type_line: "Creature — Human Wizard // Creature — Human Insect",
      oracle_text: undefined,
      colors: undefined,
      image_uris: undefined,
      card_faces: [
        {
          mana_cost: "{U}",
          type_line: "Creature — Human Wizard",
          oracle_text: "Look at the top card…",
          colors: ["U"],
          image_uris: { small: "https://cards.scryfall.io/small/front.jpg", normal: "https://cards.scryfall.io/normal/front.jpg" },
        },
        { mana_cost: "", type_line: "Creature — Human Insect", oracle_text: "Flying", colors: ["U"] },
      ],
    });
    const { fn } = fakeFetch(() => json(dfc));

    const card = await client(fn).bySetAndNumber("isd", "51");

    expect(card).toMatchObject({
      manaCost: "{U}",
      oracleText: "Look at the top card… // Flying",
      colors: "U",
      imageSmall: "https://cards.scryfall.io/small/front.jpg",
      isBasicLand: false,
    });
  });

  it("turns rate limiting and outages into 502s", async () => {
    const { fn } = fakeFetch(() => json({ object: "error", status: 429 }, 429));
    const error = await client(fn).autocomplete("shock").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 502, message: expect.stringMatching(/rate limit/) });
  });

  it("rejects responses that don't match the expected shape", async () => {
    const { fn } = fakeFetch(() => json({ object: "card", id: "not-a-uuid" }));
    await expect(client(fn).bySetAndNumber("m19", "156")).rejects.toMatchObject({ status: 502 });
  });
});
