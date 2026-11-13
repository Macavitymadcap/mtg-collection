import type { CollectionEntry, DeckDetail, Page } from "@mtg/shared";
import { fireEvent, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { makeCard, makeDeckCard, makeDeckSummary, makeEntry } from "../../../../test/fixtures";
import { server } from "../../../../test/msw";
import { renderWithProviders } from "../../../../test/render";
import { router } from "../../../../test/router";
import { DeckBuilder } from "./deck-builder";

const dogmeat = makeDeckCard(
  { id: 11, card: makeCard({ name: "Dogmeat, Ever Loyal", typeLine: "Legendary Creature — Dog" }) },
  "commander",
);

function deck(overrides: Partial<DeckDetail> = {}): DeckDetail {
  return {
    ...makeDeckSummary({ id: 1, name: "Scrappy Survivors", cardCount: 1, colorIdentity: "RGW" }),
    cards: [dogmeat],
    stats: {
      cardCount: 1,
      manaCurve: { "0": 0, "1": 0, "2": 0, "3": 1, "4": 0, "5": 0, "6": 0, "7+": 0 },
      colors: { R: 1 },
      types: { Creature: 1 },
    },
    warnings: [{ code: "deck-size", message: "A commander deck has exactly 100 cards; this has 1." }],
    ...overrides,
  };
}

/** Pages of a collection of `total` entries, named so they sort in order. */
function collectionPages(total: number) {
  const entries = Array.from({ length: total }, (_, i) =>
    makeEntry({
      id: 100 + i,
      card: makeCard({ name: i === 0 ? "Forest" : `Card ${String(i).padStart(3, "0")}` }),
      quantity: 2,
    }),
  );
  return http.get("*/api/collection", ({ request }) => {
    const params = new URL(request.url).searchParams;
    const page = Number(params.get("page"));
    const limit = Number(params.get("limit"));
    const body: Page<CollectionEntry> = {
      results: entries.slice((page - 1) * limit, page * limit),
      page,
      limit,
      count: total,
      totalPages: Math.ceil(total / limit),
    };
    return HttpResponse.json(body);
  });
}

describe("DeckBuilder", () => {
  it("shows boards, stats and warnings", async () => {
    server.use(
      http.get("*/api/decks/1", () => HttpResponse.json(deck())),
      collectionPages(1),
    );
    renderWithProviders(<DeckBuilder id={1} />);

    expect(await screen.findByRole("heading", { name: "Scrappy Survivors" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Commander (1)" })).toBeInTheDocument();
    expect(screen.getByText("A commander deck has exactly 100 cards; this has 1.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mana curve" })).toBeInTheDocument();
  });

  it("adds a card from the collection to the chosen board", async () => {
    let body: unknown;
    server.use(
      http.get("*/api/decks/1", () => HttpResponse.json(deck())),
      collectionPages(3),
      http.put("*/api/decks/1/cards", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(deck());
      }),
    );
    const { user } = renderWithProviders(<DeckBuilder id={1} />);

    await user.click(await screen.findByLabelText("Add from your collection"));
    await user.click(await screen.findByRole("option", { name: /Forest/ }));

    await vi.waitFor(() => expect(body).toEqual({ collectionEntryId: 100, board: "main", quantity: 1 }));
    expect(await screen.findByText("Added Forest to main deck")).toBeInTheDocument();
  });

  it("loads more of the collection as the list scrolls", async () => {
    server.use(
      http.get("*/api/decks/1", () => HttpResponse.json(deck())),
      collectionPages(120),
    );
    const { user } = renderWithProviders(<DeckBuilder id={1} />);

    await user.click(await screen.findByLabelText("Add from your collection"));
    const listbox = await screen.findByRole("listbox");
    expect(await within(listbox).findAllByRole("option")).toHaveLength(50);
    expect(screen.getByText("120 matches, scroll for more")).toBeInTheDocument();

    // jsdom has no layout, so describe a scrolled-to-the-end list
    for (const expected of [100, 120]) {
      Object.defineProperties(listbox, {
        scrollHeight: { value: 1000, configurable: true },
        clientHeight: { value: 300, configurable: true },
        scrollTop: { value: 700, configurable: true, writable: true },
      });
      fireEvent.scroll(listbox);
      await vi.waitFor(() => expect(within(listbox).getAllByRole("option")).toHaveLength(expected));
    }
    expect(screen.getByText("120 matches")).toBeInTheDocument();
  });

  it("removes a card when its quantity goes to 0", async () => {
    let body: unknown;
    server.use(
      http.get("*/api/decks/1", () => HttpResponse.json(deck())),
      collectionPages(1),
      http.put("*/api/decks/1/cards", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(deck({ cards: [] }));
      }),
    );
    const { user } = renderWithProviders(<DeckBuilder id={1} />);

    await user.click(await screen.findByRole("button", { name: "One fewer Dogmeat, Ever Loyal" }));

    expect(await screen.findByText(/No cards yet/)).toBeInTheDocument();
    expect(body).toEqual({ collectionEntryId: 11, board: "commander", quantity: 0 });
  });

  it("renames, and deletes after confirming", async () => {
    let patched: unknown;
    server.use(
      http.get("*/api/decks/1", () => HttpResponse.json(deck())),
      collectionPages(1),
      http.patch("*/api/decks/1", async ({ request }) => {
        patched = await request.json();
        return HttpResponse.json(deck({ name: "Dogmeat" }));
      }),
      http.delete("*/api/decks/1", () => new HttpResponse(null, { status: 204 })),
    );
    const { user } = renderWithProviders(<DeckBuilder id={1} />);

    await user.click(await screen.findByRole("button", { name: "Edit" }));
    const name = screen.getByLabelText(/Name/);
    await user.clear(name);
    await user.type(name, "Dogmeat");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("heading", { name: "Dogmeat" })).toBeInTheDocument();
    expect(patched).toMatchObject({ name: "Dogmeat", format: "commander" });

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));
    await vi.waitFor(() => expect(router.push).toHaveBeenCalledWith("/decks"));
  });
});
