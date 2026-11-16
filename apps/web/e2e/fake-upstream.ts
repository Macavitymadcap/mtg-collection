/**
 * A stand-in for Scryfall and MTGJSON during end-to-end tests, serving the
 * cards in fixtures/cards.ts. The API is pointed at it with SCRYFALL_BASE_URL
 * and MTGJSON_BASE_URL, so tests are deterministic and never call the real
 * services. Run with: npx tsx e2e/fake-upstream.ts [port]
 */
import { createServer, type IncomingMessage } from "node:http";
import type { Card } from "@mtg/shared";
import { allCards, cards } from "./fixtures/cards";

const port = Number(process.argv[2] ?? 3402);

function toScryfall(card: Card) {
  return {
    object: "card",
    id: card.id,
    oracle_id: card.oracleId,
    name: card.name,
    set: card.setCode,
    set_name: card.setName,
    collector_number: card.collectorNumber,
    rarity: card.rarity,
    mana_cost: card.manaCost ?? "",
    cmc: card.manaValue,
    type_line: card.typeLine,
    oracle_text: card.oracleText ?? "",
    colors: [...card.colors],
    color_identity: [...card.colorIdentity],
    layout: card.layout,
    scryfall_uri: card.scryfallUri,
  };
}

const precon = {
  code: "TST",
  name: "Goblin Rush",
  releaseDate: "2026-01-01",
  type: "Commander Deck",
  commander: [{ name: cards.krenko.name, count: 1, isFoil: true, identifiers: { scryfallId: cards.krenko.id } }],
  mainBoard: [
    { name: cards.boltM10.name, count: 1, identifiers: { scryfallId: cards.boltM10.id } },
    { name: cards.mountain.name, count: 10, identifiers: { scryfallId: cards.mountain.id } },
  ],
  sideBoard: [],
};

async function body(req: IncomingMessage): Promise<unknown> {
  let text = "";
  for await (const chunk of req) text += String(chunk);
  return text ? (JSON.parse(text) as unknown) : undefined;
}

const server = createServer((req, res) => {
  void (async () => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    const send = (status: number, data: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    };
    const notFound = () => send(404, { object: "error", status: 404, code: "not_found", details: "Not found" });

    if (url.pathname === "/cards/autocomplete") {
      const q = (url.searchParams.get("q") ?? "").toLowerCase();
      return send(200, {
        object: "catalog",
        data: [...new Set(allCards.map((c) => c.name))].filter((n) => n.toLowerCase().includes(q)),
      });
    }
    if (url.pathname === "/cards/search") {
      // The API searches for an exact name: !"Name"
      const name = /^!"(.*)"$/.exec(url.searchParams.get("q") ?? "")?.[1];
      const found = allCards.filter((c) => c.name === name);
      return found.length ? send(200, { object: "list", has_more: false, data: found.map(toScryfall) }) : notFound();
    }
    if (url.pathname === "/cards/collection" && req.method === "POST") {
      const { identifiers } = (await body(req)) as { identifiers: { id: string }[] };
      const found = allCards.filter((c) => identifiers.some((i) => i.id === c.id));
      return send(200, { object: "list", data: found.map(toScryfall), not_found: [] });
    }
    const printing = /^\/cards\/([^/]+)\/([^/]+)$/.exec(url.pathname);
    if (printing) {
      const found = allCards.find((c) => c.setCode === printing[1] && c.collectorNumber === printing[2]);
      return found ? send(200, toScryfall(found)) : notFound();
    }
    if (url.pathname === "/DeckList.json") {
      return send(200, {
        data: [
          {
            code: precon.code,
            fileName: "GoblinRush_TST",
            name: precon.name,
            releaseDate: precon.releaseDate,
            type: precon.type,
          },
        ],
      });
    }
    if (url.pathname === "/decks/GoblinRush_TST.json") return send(200, { data: precon });
    return notFound();
  })();
});

server.listen(port, "127.0.0.1", () => console.log(`Fake Scryfall and MTGJSON on http://127.0.0.1:${port}`));
