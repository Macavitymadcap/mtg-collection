import type { CollectionEntry, DeckDetail, Page } from "@mtg/shared";
import { fireEvent, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { makeCard, makeDeckCard, makeDeckSummary, makeEntry } from "../../../../test/fixtures";
import { server } from "../../../../test/msw";
import { renderWithProviders } from "../../../../test/render";
import { router } from "../../../../test/router";
import { DeckBuilder } from "./deck-builder";
import { PHONE, setViewportWidth } from "../../../../test/viewport";

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
  const entries = [
    makeEntry({ id: 100, card: makeCard({ name: "Forest" }), quantity: 2 }),
    ...Array.from({ length: total - 1 }, (_, i) =>
      makeEntry({ id: 101 + i, card: makeCard({ name: `Card ${String(i + 1).padStart(3, "0")}` }), quantity: 2 }),
    ),
  ];
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

  it("shows visitors the deck without ways to change it", async () => {
    server.use(http.get("*/api/decks/1", () => HttpResponse.json(deck())));
    renderWithProviders(<DeckBuilder id={1} />, { session: null });

    expect(await screen.findByRole("heading", { name: "Commander (1)" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mana curve" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /One more/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /One fewer/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Add from your collection")).not.toBeInTheDocument();
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

  it("collapses and expands every section, remembering the choice for the deck", async () => {
    server.use(
      http.get("*/api/decks/1", () => HttpResponse.json(deck())),
      collectionPages(1),
    );
    const { user, unmount } = renderWithProviders(<DeckBuilder id={1} />);

    const commander = await screen.findByRole("button", { name: "Commander (1)" });
    await user.click(screen.getByRole("button", { name: "Collapse all" }));
    expect(commander).toHaveAttribute("aria-expanded", "false");
    expect(localStorage.getItem("deck-sections-collapsed:1")).toBe(JSON.stringify(["commander"]));

    // Remembered on the next visit
    unmount();
    renderWithProviders(<DeckBuilder id={1} />);
    expect(await screen.findByRole("button", { name: "Commander (1)" })).toHaveAttribute("aria-expanded", "false");

    await user.click(screen.getByRole("button", { name: "Expand all" }));
    expect(screen.getByRole("button", { name: "Commander (1)" })).toHaveAttribute("aria-expanded", "true");
    localStorage.clear();
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

describe("DeckBuilder on a phone", () => {
  it("splits cards, stats and checks into tabs, and adds cards from a sheet", async () => {
    setViewportWidth(PHONE);
    server.use(
      http.get("*/api/decks/1", () => HttpResponse.json(deck())),
      collectionPages(3),
    );
    const { user } = renderWithProviders(<DeckBuilder id={1} />);

    expect(await screen.findByRole("tab", { name: "Cards (1)", selected: true })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Commander (1)" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Mana curve" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Stats" }));
    expect(screen.getByRole("heading", { name: "Mana curve" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Check/ }));
    expect(screen.getByText("A commander deck has exactly 100 cards; this has 1.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add from your collection" }));
    expect(await screen.findByRole("heading", { name: "Add from your collection" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Add from your collection" })).toBeInTheDocument();
  });

  it("says when there's nothing to check", async () => {
    setViewportWidth(PHONE);
    server.use(
      http.get("*/api/decks/1", () => HttpResponse.json(deck({ warnings: [] }))),
      collectionPages(1),
    );
    const { user } = renderWithProviders(<DeckBuilder id={1} />);

    await user.click(await screen.findByRole("tab", { name: /Check/ }));
    expect(screen.getByText("Nothing to check")).toBeInTheDocument();
  });
});
