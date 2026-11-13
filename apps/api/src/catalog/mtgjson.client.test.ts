import { describe, expect, it } from "vitest";
import { MtgjsonClient } from "./mtgjson.client.js";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function client(respond: (url: string) => Response) {
  const urls: string[] = [];
  const fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new Request(input, init).url;
    urls.push(url);
    return respond(url);
  }) as typeof fetch;
  return { mtgjson: new MtgjsonClient({ baseUrl: "https://mtgjson.test", userAgent: "test", fetch: fetchFn }), urls };
}

const card = (name: string, extra: Record<string, unknown> = {}) => ({
  name,
  count: 1,
  identifiers: { scryfallId: "86b45e3e-8460-4678-87d1-d74479936c83" },
  ...extra,
});

describe("MtgjsonClient", () => {
  it("lists products newest first and caches the list", async () => {
    const { mtgjson, urls } = client(() =>
      json({
        data: [
          { code: "OLD", fileName: "Old_OLD", name: "Old", releaseDate: "2001-01-01", type: "Theme Deck" },
          {
            code: "PIP",
            fileName: "ScrappySurvivors_PIP",
            name: "Scrappy Survivors",
            releaseDate: "2024-03-08",
            type: "Commander Deck",
          },
        ],
      }),
    );

    const first = await mtgjson.list();
    await mtgjson.list();

    expect(first.map((deck) => deck.setCode)).toEqual(["PIP", "OLD"]);
    expect(urls).toEqual(["https://mtgjson.test/DeckList.json"]);
  });

  it("reads a deck's boards and finishes", async () => {
    const { mtgjson } = client(() =>
      json({
        data: {
          code: "PIP",
          name: "Scrappy Survivors",
          releaseDate: "2024-03-08",
          type: "Commander Deck",
          commander: [card("Dogmeat, Ever Loyal", { isFoil: true })],
          mainBoard: [
            card("Sol Ring", { count: 1 }),
            card("Etched Thing", { isFoil: true, isEtched: true }),
            card("Odd", { identifiers: {} }),
          ],
          sideBoard: [],
        },
      }),
    );

    const deck = await mtgjson.get("ScrappySurvivors_PIP");

    expect(deck?.cards.map((c) => `${c.board}:${c.name}:${c.finish}:${c.scryfallId ? "id" : "no-id"}`)).toEqual([
      "commander:Dogmeat, Ever Loyal:foil:id",
      "main:Sol Ring:nonfoil:id",
      "main:Etched Thing:etched:id",
      "main:Odd:nonfoil:no-id",
    ]);
  });

  it("returns null for unknown or malformed file names without guessing paths", async () => {
    const { mtgjson, urls } = client(() => json({}, 404));
    expect(await mtgjson.get("Nope_XYZ")).toBeNull();
    expect(await mtgjson.get("../DeckList")).toBeNull();
    expect(urls).toEqual(["https://mtgjson.test/decks/Nope_XYZ.json"]);
  });
});
